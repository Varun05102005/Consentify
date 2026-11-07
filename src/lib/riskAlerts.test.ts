import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {
  evaluateAppRiskAlerts,
  evaluateRiskAlerts,
  getAlertKey,
  selectMissingRiskAlerts,
} from './riskAlerts';
import type {AppPermission, PermissionStatus, PermissionType, UserAlert, UserApp} from '../types';

function permission(
  type: PermissionType,
  status: PermissionStatus,
  extras: Partial<AppPermission> = {},
): AppPermission {
  return {
    type,
    label: extras.label ?? type,
    status,
    risk: extras.risk ?? 'High',
    backgroundAccess: extras.backgroundAccess ?? false,
    lastUsedAt: extras.lastUsedAt ?? null,
  };
}

function app(overrides: Partial<UserApp> = {}): UserApp {
  return {
    id: 'com.example.app',
    ownerUid: 'uid-1',
    name: 'Example App',
    packageName: 'com.example.app',
    category: 'tools',
    icon: '📱',
    status: 'connected',
    risk: 'Safe',
    permissions: [],
    lastScannedAt: null,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

function asExisting(partial: Partial<UserAlert> & Pick<UserAlert, 'id' | 'appId'>): UserAlert {
  return {
    ownerUid: 'uid-1',
    appName: 'Example App',
    permissionType: null,
    permissionLabel: null,
    title: 'Alert',
    description: '',
    severity: 'High',
    status: 'open',
    createdAt: null,
    readAt: null,
    resolvedAt: null,
    ...partial,
  };
}

describe('evaluateAppRiskAlerts', () => {
  it('creates one HIGH candidate for location granted with background', () => {
    const candidates = evaluateAppRiskAlerts(
      app({
        permissions: [
          permission('location', 'granted', {label: 'Location', backgroundAccess: true, risk: 'High'}),
          permission('camera', 'denied', {label: 'Camera', risk: 'Medium'}),
          permission('storage', 'granted', {label: 'Storage', risk: 'Safe'}),
        ],
      }),
    );
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0]?.severity, 'High');
    assert.equal(candidates[0]?.kind, 'high_background_permission');
    assert.equal(candidates[0]?.permissionType, 'location');
    assert.match(candidates[0]?.description ?? '', /location/i);
  });

  it('creates one HIGH candidate for a High permission condition', () => {
    const candidates = evaluateAppRiskAlerts(
      app({
        permissions: [permission('camera', 'granted', {label: 'Camera', backgroundAccess: true})],
      }),
    );
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0]?.severity, 'High');
    assert.equal(candidates[0]?.permissionType, 'camera');
  });

  it('creates one MEDIUM candidate for a granted sensitive Medium permission', () => {
    const candidates = evaluateAppRiskAlerts(
      app({permissions: [permission('camera', 'granted', {label: 'Camera'})]}),
    );
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0]?.severity, 'Medium');
    assert.equal(candidates[0]?.kind, 'sensitive_granted');
  });

  it('creates no alert for a Safe permission', () => {
    const candidates = evaluateAppRiskAlerts(
      app({permissions: [permission('storage', 'granted', {risk: 'High'})]}),
    );
    assert.equal(candidates.length, 0);
  });

  it('creates no alert for a denied permission even if stored risk is High', () => {
    const candidates = evaluateAppRiskAlerts(
      app({permissions: [permission('camera', 'denied', {risk: 'High'})]}),
    );
    assert.equal(candidates.length, 0);
  });

  it('creates no alert for an unknown-only permission', () => {
    const candidates = evaluateAppRiskAlerts(
      app({permissions: [permission('other', 'unknown')]}),
    );
    assert.equal(candidates.length, 0);
  });

  it('creates at most one candidate per app', () => {
    const candidates = evaluateAppRiskAlerts(
      app({
        permissions: [
          permission('location', 'granted', {label: 'Location', backgroundAccess: true}),
          permission('camera', 'granted', {label: 'Camera'}),
          permission('microphone', 'granted', {label: 'Microphone'}),
        ],
      }),
    );
    assert.equal(candidates.length, 1);
  });

  it('does not create alerts for removed apps', () => {
    const candidates = evaluateAppRiskAlerts(
      app({
        status: 'removed',
        permissions: [permission('location', 'granted', {backgroundAccess: true})],
      }),
    );
    assert.equal(candidates.length, 0);
  });
});

describe('evaluateRiskAlerts', () => {
  it('does not emit duplicate candidates for multiple permissions on one app', () => {
    const candidates = evaluateRiskAlerts([
      app({
        permissions: [
          permission('location', 'granted', {label: 'Location', backgroundAccess: true}),
          permission('camera', 'denied', {label: 'Camera'}),
          permission('storage', 'granted', {label: 'Storage'}),
        ],
      }),
    ]);
    assert.equal(candidates.length, 1);
  });

  it('emits one candidate per qualifying app', () => {
    const candidates = evaluateRiskAlerts([
      app({
        id: 'a',
        permissions: [permission('location', 'granted', {backgroundAccess: true})],
      }),
      app({
        id: 'b',
        permissions: [permission('camera', 'granted')],
      }),
      app({
        id: 'c',
        permissions: [permission('storage', 'granted')],
      }),
    ]);
    assert.equal(candidates.length, 2);
    assert.equal(candidates[0]?.appId, 'a');
    assert.equal(candidates[1]?.appId, 'b');
  });
});

describe('getAlertKey', () => {
  it('is deterministic for the same app and condition', () => {
    const input = {
      appId: 'com.example.app',
      kind: 'high_background_permission' as const,
      permissionType: 'location' as const,
    };
    assert.equal(getAlertKey(input), getAlertKey(input));
    assert.equal(getAlertKey(input), 'risk_com.example.app_high_background_permission_location');
  });

  it('uses the same key as evaluateAppRiskAlerts', () => {
    const target = app({
      permissions: [permission('location', 'granted', {label: 'Location', backgroundAccess: true})],
    });
    const [candidate] = evaluateAppRiskAlerts(target);
    assert.equal(
      candidate?.id,
      getAlertKey({
        appId: target.id,
        kind: 'high_background_permission',
        permissionType: 'location',
      }),
    );
  });
});

describe('selectMissingRiskAlerts duplicate prevention', () => {
  const target = app({
    permissions: [
      permission('location', 'granted', {label: 'Location', backgroundAccess: true}),
      permission('camera', 'denied', {label: 'Camera'}),
      permission('storage', 'granted', {label: 'Storage'}),
    ],
  });

  it('selects the required alert on first evaluation', () => {
    const first = selectMissingRiskAlerts(evaluateAppRiskAlerts(target), []);
    assert.equal(first.length, 1);
    assert.equal(first[0]?.severity, 'High');
    assert.equal(first[0]?.permissionType, 'location');
  });

  it('creates zero duplicates on second evaluation', () => {
    const first = selectMissingRiskAlerts(evaluateAppRiskAlerts(target), []);
    const created = asExisting({
      id: first[0]?.id ?? '',
      appId: target.id,
      permissionType: first[0]?.permissionType ?? null,
      permissionLabel: first[0]?.permissionLabel ?? null,
      status: 'open',
    });
    const second = selectMissingRiskAlerts(evaluateAppRiskAlerts(target), [created]);
    assert.equal(second.length, 0);
  });

  it('creates zero duplicates on a third evaluation after refresh', () => {
    const candidates = evaluateAppRiskAlerts(target);
    const first = selectMissingRiskAlerts(candidates, []);
    const refreshed = [
      asExisting({
        id: first[0]?.id ?? '',
        appId: target.id,
        permissionType: 'location',
        permissionLabel: 'Location',
        status: 'open',
      }),
    ];
    const second = selectMissingRiskAlerts(candidates, refreshed);
    const third = selectMissingRiskAlerts(candidates, refreshed);
    assert.equal(second.length, 0);
    assert.equal(third.length, 0);
  });

  it('treats an equivalent open alert with a different document id as a duplicate', () => {
    const candidates = evaluateAppRiskAlerts(target);
    const existing = [
      asExisting({
        id: 'legacy-alert',
        appId: target.id,
        permissionType: 'location',
        permissionLabel: 'Location',
        status: 'open',
      }),
    ];
    assert.equal(selectMissingRiskAlerts(candidates, existing).length, 0);
  });
});

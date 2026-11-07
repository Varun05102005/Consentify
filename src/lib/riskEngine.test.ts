import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {calculateConsentifyMetrics} from './metrics';
import {
  calculateAppRisk,
  calculateOverallPrivacyScore,
  scorePermission,
} from './riskEngine';
import type {AppPermission, PermissionStatus, PermissionType, UserApp} from '../types';

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

function assertFiniteScore(score: number): void {
  assert.equal(Number.isFinite(score), true);
  assert.equal(score >= 0 && score <= 100, true);
  assert.equal(Number.isInteger(score), true);
}

describe('scorePermission', () => {
  it('scores camera granted as 36 Medium', () => {
    const result = scorePermission(permission('camera', 'granted'));
    assert.equal(result.riskScore, 36);
    assert.equal(result.riskLevel, 'Medium');
    assert.equal(result.recencyBonus, 0);
  });

  it('scores camera denied as 0 Safe even if stored risk is High', () => {
    const result = scorePermission(permission('camera', 'denied', {risk: 'High'}));
    assert.equal(result.riskScore, 0);
    assert.equal(result.riskLevel, 'Safe');
    assert.equal(result.reasons.some((reason) => reason.includes('denied')), true);
  });

  it('scores location granted as 34 Medium', () => {
    const result = scorePermission(permission('location', 'granted'));
    assert.equal(result.riskScore, 34);
    assert.equal(result.riskLevel, 'Medium');
  });

  it('scores location granted with background as 50 High', () => {
    const result = scorePermission(permission('location', 'granted', {backgroundAccess: true}));
    assert.equal(result.riskScore, 50);
    assert.equal(result.riskLevel, 'High');
    assert.equal(result.backgroundBonus, 16);
  });

  it('scores storage granted as 18 Safe', () => {
    const result = scorePermission(permission('storage', 'granted'));
    assert.equal(result.riskScore, 18);
    assert.equal(result.riskLevel, 'Safe');
  });

  it('keeps unknown permissions modest and not High', () => {
    const result = scorePermission(permission('other', 'unknown'));
    assert.equal(result.riskScore, 4);
    assert.equal(result.riskLevel, 'Safe');
    assert.ok(result.riskScore < 25);
  });

  it('scores restricted camera modestly, not High', () => {
    const result = scorePermission(permission('camera', 'restricted'));
    assert.equal(result.riskScore, 5);
    assert.equal(result.riskLevel, 'Safe');
  });

  it('does not add recency risk when lastUsedAt is missing', () => {
    const result = scorePermission(permission('camera', 'granted', {lastUsedAt: null}));
    assert.equal(result.riskScore, 36);
    assert.equal(result.recencyBonus, 0);
  });

  it('adds recency when lastUsedAt is within 24 hours', () => {
    const result = scorePermission(permission('camera', 'granted', {lastUsedAt: new Date()}));
    assert.equal(result.riskScore, 40);
    assert.equal(result.recencyBonus, 4);
    assert.equal(result.riskLevel, 'Medium');
  });

  it('does not add recency for an old lastUsedAt', () => {
    const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = scorePermission(permission('camera', 'granted', {lastUsedAt: old}));
    assert.equal(result.riskScore, 36);
    assert.equal(result.recencyBonus, 0);
  });

  it('does not add recency for denied permissions even with lastUsedAt', () => {
    const result = scorePermission(permission('camera', 'denied', {lastUsedAt: new Date()}));
    assert.equal(result.riskScore, 0);
    assert.equal(result.recencyBonus, 0);
  });

  it('ignores backgroundAccess until the permission is granted', () => {
    const result = scorePermission(permission('location', 'denied', {backgroundAccess: true}));
    assert.equal(result.riskScore, 0);
    assert.equal(result.backgroundBonus, 0);
  });

  it('handles missing fields without NaN or crash', () => {
    const result = scorePermission({} as AppPermission);
    assertFiniteScore(result.riskScore);
    assert.equal(result.riskLevel, 'Safe');
    assert.equal(result.status, 'unknown');
  });

  it('treats malformed lastUsedAt as missing', () => {
    const result = scorePermission(
      permission('camera', 'granted', {lastUsedAt: new Date('not-a-date')}),
    );
    assert.equal(result.riskScore, 36);
    assert.equal(result.recencyBonus, 0);
  });

  it('uses the permission label when present and a fallback when blank', () => {
    const labeled = scorePermission(permission('camera', 'granted', {label: 'Device camera'}));
    const blank = scorePermission(permission('camera', 'granted', {label: '  '}));
    assert.equal(labeled.label, 'Device camera');
    assert.equal(blank.label, 'Camera');
  });
});

describe('calculateAppRisk', () => {
  it('scores an app with no permissions as 100 Safe', () => {
    const result = calculateAppRisk(app({permissions: []}));
    assert.equal(result.privacyScore, 100);
    assert.equal(result.riskScore, 0);
    assert.equal(result.riskLevel, 'Safe');
    assert.equal(result.topContributorLabel, null);
    assert.equal(result.permissionBreakdown.length, 0);
    assert.ok(result.reasons.length > 0);
  });

  it('scores one Safe permission without raising the app to Medium', () => {
    const result = calculateAppRisk(app({permissions: [permission('storage', 'granted')]}));
    assert.equal(result.riskLevel, 'Safe');
    assert.equal(result.privacyScore, 82);
    assert.equal(result.topContributorLabel, 'storage');
  });

  it('scores one Medium permission as Medium', () => {
    const result = calculateAppRisk(app({permissions: [permission('camera', 'granted')]}));
    assert.equal(result.riskLevel, 'Medium');
    assert.equal(result.privacyScore, 64);
    assert.equal(result.topContributorLabel, 'camera');
  });

  it('scores one High permission as High', () => {
    const result = calculateAppRisk(
      app({permissions: [permission('location', 'granted', {backgroundAccess: true})]}),
    );
    assert.equal(result.riskLevel, 'High');
    assert.equal(result.privacyScore, 50);
    assert.equal(result.topContributorLabel, 'location');
  });

  it('combines the test-app permission set to privacy 41 High', () => {
    const result = calculateAppRisk(
      app({
        name: 'Example App',
        permissions: [
          permission('location', 'granted', {label: 'Location', backgroundAccess: true, risk: 'High'}),
          permission('camera', 'denied', {label: 'Camera', risk: 'Medium'}),
          permission('storage', 'granted', {label: 'Storage', risk: 'Safe'}),
        ],
      }),
    );
    assert.equal(result.privacyScore, 41);
    assert.equal(result.riskScore, 59);
    assert.equal(result.riskLevel, 'High');
    assert.equal(result.topContributorLabel, 'Location');
    assert.equal(result.permissionBreakdown.map((item) => item.riskLevel).join(','), 'High,Safe,Safe');
    assert.ok(result.summary.toLowerCase().includes('location'));
  });

  it('does not raise risk for a denied sensitive permission', () => {
    const result = calculateAppRisk(app({permissions: [permission('camera', 'denied', {risk: 'High'})]}));
    assert.equal(result.riskLevel, 'Safe');
    assert.equal(result.privacyScore, 100);
  });

  it('treats background access as the top contributor when it creates High risk', () => {
    const result = calculateAppRisk(
      app({
        permissions: [
          permission('storage', 'granted'),
          permission('location', 'granted', {label: 'Location', backgroundAccess: true}),
        ],
      }),
    );
    assert.equal(result.riskLevel, 'High');
    assert.equal(result.topContributorLabel, 'Location');
    assert.match(result.summary, /background location/i);
  });

  it('still scores a removed app, while overall scoring excludes it', () => {
    const removed = calculateAppRisk(
      app({
        status: 'removed',
        permissions: [permission('location', 'granted', {backgroundAccess: true})],
      }),
    );
    assert.equal(removed.riskLevel, 'High');
    const overall = calculateOverallPrivacyScore([
      app({
        status: 'removed',
        permissions: [permission('location', 'granted', {backgroundAccess: true})],
      }),
    ]);
    assert.equal(overall.overallPrivacyScore, 100);
    assert.equal(overall.highRiskApps, 0);
  });

  it('handles a missing permissions array and missing name', () => {
    const result = calculateAppRisk({
      ...app(),
      name: '',
      permissions: undefined as unknown as UserApp['permissions'],
    });
    assert.equal(result.appName, 'Untitled app');
    assert.equal(result.privacyScore, 100);
    assertFiniteScore(result.privacyScore);
  });
});

describe('calculateOverallPrivacyScore', () => {
  const highApp = app({
    id: 'high',
    name: 'High App',
    permissions: [
      permission('location', 'granted', {label: 'Location', backgroundAccess: true}),
      permission('camera', 'denied', {label: 'Camera'}),
      permission('storage', 'granted', {label: 'Storage'}),
    ],
  });
  const mediumApp = app({
    id: 'medium',
    name: 'Medium App',
    permissions: [permission('camera', 'granted')],
  });
  const safeApp = app({
    id: 'safe',
    name: 'Safe App',
    permissions: [permission('storage', 'granted')],
  });

  it('returns 100 with zero counts when there are no active apps', () => {
    const result = calculateOverallPrivacyScore([]);
    assert.equal(result.overallPrivacyScore, 100);
    assert.equal(result.highRiskApps, 0);
    assert.equal(result.mediumRiskApps, 0);
    assert.equal(result.safeApps, 0);
  });

  it('uses the single app privacy score', () => {
    const result = calculateOverallPrivacyScore([highApp]);
    assert.equal(result.overallPrivacyScore, 41);
    assert.equal(result.highRiskApps, 1);
    assert.equal(result.mediumRiskApps, 0);
    assert.equal(result.safeApps, 0);
  });

  it('averages multiple apps and counts each risk level', () => {
    const result = calculateOverallPrivacyScore([highApp, mediumApp, safeApp]);
    assert.equal(result.overallPrivacyScore, 62);
    assert.equal(result.highRiskApps, 1);
    assert.equal(result.mediumRiskApps, 1);
    assert.equal(result.safeApps, 1);
  });

  it('excludes removed apps from the overall score', () => {
    const result = calculateOverallPrivacyScore([
      safeApp,
      app({
        id: 'gone',
        status: 'removed',
        permissions: [permission('location', 'granted', {backgroundAccess: true})],
      }),
    ]);
    assert.equal(result.overallPrivacyScore, 82);
    assert.equal(result.highRiskApps, 0);
    assert.equal(result.safeApps, 1);
  });
});

describe('metrics consistency', () => {
  it('uses the risk engine for dashboard/analytics privacy values', () => {
    const apps = [
      app({
        id: 'high',
        permissions: [permission('location', 'granted', {label: 'Location', backgroundAccess: true})],
      }),
    ];
    const overall = calculateOverallPrivacyScore(apps);
    const metrics = calculateConsentifyMetrics(apps, []);
    assert.equal(metrics.privacyScore, overall.overallPrivacyScore);
    assert.equal(metrics.highRiskApps, overall.highRiskApps);
    assert.equal(metrics.mediumRiskApps, overall.mediumRiskApps);
    assert.equal(metrics.safeApps, overall.safeApps);
    assert.equal(metrics.privacyScore, 50);
  });
});

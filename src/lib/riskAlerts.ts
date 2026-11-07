/**
 * Pure risk-alert evaluation.
 *
 * Consumes AppRiskResult / PermissionRiskResult from riskEngine.ts.
 * Does not score permissions itself, talk to Firebase, or use stored risk fields.
 *
 * At most one alert candidate is produced per active app: the most significant
 * current condition. Safe, denied, unknown-only, and "app exists" are not alerts.
 */

import type {
  AppRiskResult,
  PermissionRiskResult,
  PermissionType,
  RiskLevel,
  RiskPermissionCategory,
  UserAlert,
  UserApp,
} from '../types';
import {calculateAppRisk, permissionsByRisk} from './riskEngine';

export type RiskAlertKind =
  | 'high_background_permission'
  | 'high_permission'
  | 'sensitive_granted';

export interface RiskAlertCandidate {
  id: string;
  kind: RiskAlertKind;
  appId: string;
  appName: string;
  permissionType: PermissionType | null;
  permissionLabel: string | null;
  title: string;
  description: string;
  severity: RiskLevel;
}

/** Granted Medium risk in these categories is worth a single Medium alert. */
const SIGNIFICANT_CATEGORIES: ReadonlySet<RiskPermissionCategory> = new Set([
  'camera',
  'microphone',
  'location',
  'contacts',
]);

export function getAlertKey(input: {
  appId: string;
  kind: RiskAlertKind;
  permissionType: PermissionType | null;
}): string {
  const appId = input.appId.trim().replace(/[/\\#[\]*?]/g, '_');
  const permission = input.permissionType ?? 'app';
  return `risk_${appId}_${input.kind}_${permission}`;
}

function candidateFromPermission(
  app: UserApp,
  risk: AppRiskResult,
  permission: PermissionRiskResult,
  kind: RiskAlertKind,
  severity: RiskLevel,
  title: string,
  description: string,
): RiskAlertCandidate {
  return {
    id: getAlertKey({
      appId: app.id,
      kind,
      permissionType: permission.type,
    }),
    kind,
    appId: app.id,
    appName: app.name.trim() || risk.appName,
    permissionType: permission.type,
    permissionLabel: permission.label,
    title,
    description,
    severity,
  };
}

export function evaluateAppRiskAlerts(app: UserApp): RiskAlertCandidate[] {
  if (app.status === 'removed' || !app.id.trim()) {
    return [];
  }

  const risk = calculateAppRisk(app);
  const ranked = permissionsByRisk(risk.permissionBreakdown);

  const highBackground = ranked.find(
    (permission) =>
      permission.riskLevel === 'High' &&
      permission.status === 'granted' &&
      permission.backgroundAccess,
  );
  if (highBackground) {
    return [
      candidateFromPermission(
        app,
        risk,
        highBackground,
        'high_background_permission',
        'High',
        'High privacy risk detected',
        risk.summary ||
          `${highBackground.label} access is granted with background access, increasing the calculated privacy risk.`,
      ),
    ];
  }

  const highPermission = ranked.find((permission) => permission.riskLevel === 'High');
  if (highPermission) {
    return [
      candidateFromPermission(
        app,
        risk,
        highPermission,
        'high_permission',
        'High',
        'High privacy risk detected',
        risk.summary ||
          `${highPermission.label} currently has a high calculated privacy risk.`,
      ),
    ];
  }

  const mediumSensitive = ranked.find(
    (permission) =>
      permission.riskLevel === 'Medium' &&
      permission.status === 'granted' &&
      SIGNIFICANT_CATEGORIES.has(permission.category),
  );
  if (mediumSensitive) {
    const backgroundNote = mediumSensitive.backgroundAccess
      ? `${mediumSensitive.label} access is granted with background access, increasing the calculated privacy risk.`
      : `${mediumSensitive.label} access is granted, increasing the calculated privacy risk.`;

    return [
      candidateFromPermission(
        app,
        risk,
        mediumSensitive,
        'sensitive_granted',
        'Medium',
        'Sensitive permission granted',
        backgroundNote,
      ),
    ];
  }

  return [];
}

export function evaluateRiskAlerts(apps: UserApp[]): RiskAlertCandidate[] {
  const list = Array.isArray(apps) ? apps : [];
  return list.flatMap(evaluateAppRiskAlerts);
}

export function hasEquivalentAlert(
  existing: Array<Pick<UserAlert, 'id' | 'appId' | 'permissionType' | 'permissionLabel' | 'status'>>,
  candidate: RiskAlertCandidate,
): boolean {
  return existing.some((alert) => {
    if (alert.id === candidate.id) {
      return true;
    }

    if (alert.status === 'resolved') {
      return false;
    }

    if (alert.appId !== candidate.appId) {
      return false;
    }

    const sameType = (alert.permissionType ?? null) === (candidate.permissionType ?? null);
    const sameLabel =
      Boolean(alert.permissionLabel) &&
      Boolean(candidate.permissionLabel) &&
      alert.permissionLabel === candidate.permissionLabel;

    return sameType || sameLabel;
  });
}

/** Pure duplicate filter used by the persistence service. */
export function selectMissingRiskAlerts(
  candidates: RiskAlertCandidate[],
  existing: Array<Pick<UserAlert, 'id' | 'appId' | 'permissionType' | 'permissionLabel' | 'status'>>,
): RiskAlertCandidate[] {
  const known = [...existing];
  const missing: RiskAlertCandidate[] = [];

  for (const candidate of candidates) {
    if (hasEquivalentAlert(known, candidate)) {
      continue;
    }

    missing.push(candidate);
    known.push({
      id: candidate.id,
      appId: candidate.appId,
      permissionType: candidate.permissionType,
      permissionLabel: candidate.permissionLabel,
      status: 'open',
    });
  }

  return missing;
}

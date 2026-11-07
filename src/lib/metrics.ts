/**
 * Dashboard/analytics calculations composed from Firestore source data.
 *
 * Privacy risk counts and scores come from riskEngine.ts — the single
 * source of truth. This file does not re-implement permission scoring
 * and does not read stored UserApp.risk / AppPermission.risk.
 *
 * Alerts and permission-usage charts stay here because they are not
 * risk-engine outputs.
 */

import type {ConsentifyMetrics, PermissionType, UserAlert, UserApp} from '../types';
import {calculateAppRisk, calculateOverallPrivacyScore, scorePermission} from './riskEngine';

const PERMISSION_LABELS: Record<PermissionType, string> = {
  camera: 'Camera',
  microphone: 'Microphone',
  location: 'Location',
  contacts: 'Contacts',
  storage: 'Storage',
  photos: 'Photos',
  notifications: 'Notifications',
  sensors: 'Sensors',
  other: 'Other',
};

export function countTotalApps(apps: UserApp[]): number {
  return apps.filter((app) => app.status !== 'removed').length;
}

export function countHighRiskApps(apps: UserApp[]): number {
  return calculateOverallPrivacyScore(apps).highRiskApps;
}

export function countMediumRiskApps(apps: UserApp[]): number {
  return calculateOverallPrivacyScore(apps).mediumRiskApps;
}

export function countSafeApps(apps: UserApp[]): number {
  return calculateOverallPrivacyScore(apps).safeApps;
}

export function countOpenAlerts(alerts: UserAlert[]): number {
  return alerts.filter((alert) => alert.status === 'open').length;
}

/** Granted permissions that score High or can run in the background. */
export function countPermissionIssues(apps: UserApp[]): number {
  return apps.reduce((total, app) => {
    if (app.status === 'removed') {
      return total;
    }

    return (
      total +
      app.permissions.filter((permission) => {
        if (permission.status !== 'granted') {
          return false;
        }

        return scorePermission(permission).riskLevel === 'High' || permission.backgroundAccess;
      }).length
    );
  }, 0);
}

export function calculateAppPrivacyScore(app: UserApp): number {
  return calculateAppRisk(app).privacyScore;
}

/** Overall privacy score from the risk engine. Alerts do not change the score. */
export function calculatePrivacyScore(apps: UserApp[], _alerts?: UserAlert[]): number {
  return calculateOverallPrivacyScore(apps).overallPrivacyScore;
}

export function calculatePermissionUsage(apps: UserApp[]): ConsentifyMetrics['permissionUsage'] {
  const counts = new Map<PermissionType, number>();

  for (const app of apps) {
    if (app.status === 'removed') {
      continue;
    }

    const types = new Set(
      app.permissions
        .filter((permission) => permission.status === 'granted')
        .map((permission) => permission.type),
    );

    for (const type of types) {
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([type, appCount]) => ({
      type,
      label: PERMISSION_LABELS[type],
      appCount,
    }))
    .sort((left, right) => right.appCount - left.appCount);
}

export function calculateConsentifyMetrics(apps: UserApp[], alerts: UserAlert[]): ConsentifyMetrics {
  const overall = calculateOverallPrivacyScore(apps);

  return {
    totalApps: countTotalApps(apps),
    highRiskApps: overall.highRiskApps,
    mediumRiskApps: overall.mediumRiskApps,
    safeApps: overall.safeApps,
    openAlerts: countOpenAlerts(alerts),
    privacyScore: overall.overallPrivacyScore,
    permissionUsage: calculatePermissionUsage(apps),
  };
}

/**
 * Persist missing risk alerts.
 *
 * Evaluation stays in src/lib/riskAlerts.ts. This module only writes
 * candidates that do not already have an equivalent non-resolved alert.
 * It is not called from React render.
 */

import {assertSameOwner, requireUserId} from '../lib/owner';
import {
  evaluateAppRiskAlerts,
  evaluateRiskAlerts,
  selectMissingRiskAlerts,
  type RiskAlertCandidate,
} from '../lib/riskAlerts';
import type {UserAlert, UserApp} from '../types';
import {createUserAlert, getUserAlerts} from './alerts';
import {getUserApps} from './apps';

function isAlreadyExistsError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes('already exists');
}

async function persistMissingRiskAlerts(
  ownerUid: string,
  candidates: RiskAlertCandidate[],
  existing: UserAlert[],
): Promise<{createdCount: number}> {
  const missing = selectMissingRiskAlerts(candidates, existing);
  let createdCount = 0;

  for (const candidate of missing) {
    try {
      await createUserAlert(ownerUid, {
        id: candidate.id,
        ownerUid,
        appId: candidate.appId,
        appName: candidate.appName,
        permissionType: candidate.permissionType,
        permissionLabel: candidate.permissionLabel,
        title: candidate.title,
        description: candidate.description,
        severity: candidate.severity,
        status: 'open',
      });
      createdCount += 1;
    } catch (error) {
      if (isAlreadyExistsError(error)) {
        continue;
      }
      throw error;
    }
  }

  return {createdCount};
}

/** Evaluate every active app and create missing risk alerts only. */
export async function syncMissingRiskAlerts(uid: string): Promise<{createdCount: number}> {
  const ownerUid = requireUserId(uid);
  const [apps, alerts] = await Promise.all([getUserApps(ownerUid), getUserAlerts(ownerUid)]);
  return persistMissingRiskAlerts(ownerUid, evaluateRiskAlerts(apps), alerts);
}

/** Evaluate one app and create a missing risk alert only if needed. */
export async function syncMissingRiskAlertsForApp(
  uid: string,
  app: UserApp,
): Promise<{createdCount: number}> {
  const ownerUid = requireUserId(uid);
  assertSameOwner(ownerUid, app.ownerUid);
  const alerts = await getUserAlerts(ownerUid);
  return persistMissingRiskAlerts(ownerUid, evaluateAppRiskAlerts(app), alerts);
}

import {calculateConsentifyMetrics} from '../lib/metrics';
import {toFirestoreServiceError} from '../lib/firestoreErrors';
import {requireUserId} from '../lib/owner';
import {getUserAlerts} from './alerts';
import {getUserApps} from './apps';
import {getUserProfile} from './firestore';

function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Downloads the signed-in user's apps, alerts, profile, and derived metrics. */
export async function downloadPrivacyReport(uid: string): Promise<void> {
  const ownerUid = requireUserId(uid);

  try {
    const [profile, apps, alerts] = await Promise.all([
      getUserProfile(ownerUid),
      getUserApps(ownerUid),
      getUserAlerts(ownerUid),
    ]);

    downloadJson('consentify-privacy-report.json', {
      exportedAt: new Date().toISOString(),
      profile,
      apps,
      alerts,
      metrics: calculateConsentifyMetrics(apps, alerts),
    });
  } catch (error) {
    throw toFirestoreServiceError(error);
  }
}

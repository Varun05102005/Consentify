export {
  getAuthErrorMessage,
  observeAuthState,
  registerWithEmail,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  type User,
} from './auth';

export {
  ALERTS_COLLECTION,
  APPS_COLLECTION,
  USERS_COLLECTION,
} from '../lib/collections';

export {
  calculateAppPrivacyScore,
  calculateConsentifyMetrics,
  calculatePermissionUsage,
  calculatePrivacyScore,
  countHighRiskApps,
  countMediumRiskApps,
  countOpenAlerts,
  countPermissionIssues,
  countSafeApps,
  countTotalApps,
} from '../lib/metrics';

export {
  createUserApp,
  deleteUserApp,
  getUserApp,
  getUserApps,
  updateUserApp,
  type UserAppWrite,
} from './apps';

export {
  createUserAlert,
  deleteUserAlert,
  getUserAlert,
  getUserAlerts,
  updateUserAlert,
  type UserAlertWrite,
} from './alerts';

export {syncMissingRiskAlerts, syncMissingRiskAlertsForApp} from './riskAlerts';

export {downloadPrivacyReport} from './privacyReport';

export {explainAppRisk as requestAiAppRiskExplanation} from './aiExplanation';

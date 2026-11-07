export {auth, db, firebaseApp, functions} from './firebase';
export {
  BACKGROUND_BONUS,
  PERMISSION_SENSITIVITY,
  PERMISSION_SCORE_THRESHOLDS,
  RISK_ENGINE_EXAMPLES,
  STATUS_MULTIPLIER,
  calculateAppRisk,
  calculateOverallPrivacyScore,
  categoryFromPermissionType,
  explainAppRisk,
  explainPermissionRisk,
  permissionsByRisk,
  riskLevelFromPermissionScore,
  scorePermission,
} from './riskEngine';
export {
  evaluateAppRiskAlerts,
  evaluateRiskAlerts,
  getAlertKey,
  selectMissingRiskAlerts,
  type RiskAlertCandidate,
  type RiskAlertKind,
} from './riskAlerts';
export {RISK_LABEL, RISK_TONE_CLASS} from './ui';

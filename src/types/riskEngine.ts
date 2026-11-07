import type {PermissionStatus, PermissionType, RiskLevel} from './schema';

/**
 * Broader sensitivity categories than today's Firestore PermissionType.
 * phone / sms / calendar / nearbyDevices are defined now so Android scanning
 * can map onto them later without changing this scoring model.
 */
export type RiskPermissionCategory =
  | 'location'
  | 'microphone'
  | 'camera'
  | 'contacts'
  | 'phone'
  | 'sms'
  | 'photos'
  | 'storage'
  | 'notifications'
  | 'calendar'
  | 'sensors'
  | 'nearbyDevices'
  | 'other';

export interface PermissionRiskResult {
  type: PermissionType;
  category: RiskPermissionCategory;
  label: string;
  status: PermissionStatus;
  backgroundAccess: boolean;
  lastUsedAt: Date | null;
  baseScore: number;
  statusMultiplier: number;
  backgroundBonus: number;
  recencyBonus: number;
  riskScore: number;
  riskLevel: RiskLevel;
  reasons: string[];
}

export interface AppRiskResult {
  appId: string;
  appName: string;
  privacyScore: number;
  riskScore: number;
  riskLevel: RiskLevel;
  /** One-sentence headline for "Why this risk?" */
  summary: string;
  /** Highest-scoring permission label, or null when none contribute risk. */
  topContributorLabel: string | null;
  reasons: string[];
  permissionBreakdown: PermissionRiskResult[];
}

export interface UserRiskResult {
  overallPrivacyScore: number;
  highRiskApps: number;
  mediumRiskApps: number;
  safeApps: number;
  appBreakdown: AppRiskResult[];
}

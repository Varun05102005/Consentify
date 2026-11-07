import type {PermissionStatus, PermissionType, RiskLevel} from './schema';

export type AiExplainPermission = {
  type: PermissionType;
  label: string;
  status: PermissionStatus;
  riskScore: number;
  riskLevel: RiskLevel;
  backgroundAccess: boolean;
  factualReasons: string[];
};

export type AiExplainAppRiskRequest = {
  appName: string;
  appRiskScore: number;
  appRiskLevel: RiskLevel;
  topContributor: string | null;
  summary: string;
  reasons: string[];
  permissions: AiExplainPermission[];
};

export type AiExplanation = {
  summary: string;
  keyFactors: string[];
  userGuidance: string[];
  limitations: string;
};

export type AiExplanationResult = {
  explanation: AiExplanation;
  model: string;
};

export const AI_EXPLANATION_UNAVAILABLE = 'AI explanation unavailable right now.';

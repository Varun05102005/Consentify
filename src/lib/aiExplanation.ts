import type {AppRiskResult, PermissionRiskResult} from '../types';
import type {
  AiExplainAppRiskRequest,
  AiExplanation,
  AiExplanationResult,
} from '../types/aiExplanation';
import {AI_EXPLANATION_UNAVAILABLE} from '../types/aiExplanation';

const RISK_LEVELS = ['High', 'Medium', 'Safe'] as const;
const PERMISSION_STATUSES = ['granted', 'denied', 'restricted', 'unknown'] as const;
const PERMISSION_TYPES = [
  'camera',
  'microphone',
  'location',
  'contacts',
  'storage',
  'photos',
  'notifications',
  'sensors',
  'other',
] as const;

const LIMITS = {
  appName: {min: 1, max: 80},
  summary: {min: 1, max: 400},
  topContributor: {max: 80},
  reasons: {maxItems: 8, maxLength: 240},
  permissions: {maxItems: 8},
  permissionLabel: {min: 1, max: 80},
  factualReasons: {maxItems: 8, maxLength: 240},
  outputSummary: {min: 1, max: 400},
  keyFactors: {minItems: 1, maxItems: 5, maxLength: 240},
  userGuidance: {minItems: 1, maxItems: 4, maxLength: 240},
  limitations: {min: 1, max: 400},
} as const;

const inflight = new Map<string, Promise<AiExplanationResult>>();

export type ExplainAppRiskCaller = (input: AiExplainAppRiskRequest) => Promise<unknown>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clip(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max);
}

export function canonicalizeAiRequest(input: AiExplainAppRiskRequest): string {
  return JSON.stringify(input);
}

export function toAiExplainAppRiskRequest(
  appName: string,
  appRisk: AppRiskResult,
  rankedPermissions?: PermissionRiskResult[],
): AiExplainAppRiskRequest {
  const ranked = rankedPermissions ?? [...appRisk.permissionBreakdown]
    .sort((left, right) => right.riskScore - left.riskScore);

  const permissions = ranked
    .slice(0, LIMITS.permissions.maxItems)
    .map((permission) => ({
      type: permission.type,
      label: clip(permission.label, LIMITS.permissionLabel.max),
      status: permission.status,
      riskScore: permission.riskScore,
      riskLevel: permission.riskLevel,
      backgroundAccess: permission.backgroundAccess,
      factualReasons: permission.reasons
        .slice(0, LIMITS.factualReasons.maxItems)
        .map((reason) => clip(reason, LIMITS.factualReasons.maxLength))
        .filter(Boolean),
    }));

  const contributor = appRisk.topContributorLabel?.trim() || null;

  return {
    appName: clip(appName, LIMITS.appName.max),
    appRiskScore: appRisk.riskScore,
    appRiskLevel: appRisk.riskLevel,
    topContributor: contributor ? clip(contributor, LIMITS.topContributor.max) : null,
    summary: clip(appRisk.summary, LIMITS.summary.max),
    reasons: appRisk.reasons
      .slice(0, LIMITS.reasons.maxItems)
      .map((reason) => clip(reason, LIMITS.reasons.maxLength))
      .filter(Boolean),
    permissions,
  };
}

function assertString(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) {
    throw new Error(AI_EXPLANATION_UNAVAILABLE);
  }
  return value.trim();
}

function assertStringList(
  value: unknown,
  minItems: number,
  maxItems: number,
  maxLength: number,
): string[] {
  if (!Array.isArray(value) || value.length < minItems || value.length > maxItems) {
    throw new Error(AI_EXPLANATION_UNAVAILABLE);
  }
  return value.map((item) => {
    if (typeof item !== 'string' || item.trim().length < 1 || item.trim().length > maxLength) {
      throw new Error(AI_EXPLANATION_UNAVAILABLE);
    }
    return item.trim();
  });
}

export function parseAiExplanationResult(raw: unknown): AiExplanationResult {
  if (!isPlainObject(raw)) {
    throw new Error(AI_EXPLANATION_UNAVAILABLE);
  }
  if (typeof raw.model !== 'string' || !raw.model.trim()) {
    throw new Error(AI_EXPLANATION_UNAVAILABLE);
  }
  if (!isPlainObject(raw.explanation)) {
    throw new Error(AI_EXPLANATION_UNAVAILABLE);
  }

  const explanation = raw.explanation;
  if (
    'appRiskScore' in explanation ||
    'appRiskLevel' in explanation ||
    'riskScore' in explanation ||
    'score' in explanation
  ) {
    throw new Error(AI_EXPLANATION_UNAVAILABLE);
  }

  const parsed: AiExplanation = {
    summary: assertString(explanation.summary, 'summary', LIMITS.outputSummary.min, LIMITS.outputSummary.max),
    keyFactors: assertStringList(
      explanation.keyFactors,
      LIMITS.keyFactors.minItems,
      LIMITS.keyFactors.maxItems,
      LIMITS.keyFactors.maxLength,
    ),
    userGuidance: assertStringList(
      explanation.userGuidance,
      LIMITS.userGuidance.minItems,
      LIMITS.userGuidance.maxItems,
      LIMITS.userGuidance.maxLength,
    ),
    limitations: assertString(
      explanation.limitations,
      'limitations',
      LIMITS.limitations.min,
      LIMITS.limitations.max,
    ),
  };

  return {explanation: parsed, model: raw.model.trim()};
}

export function isSupportedAiRequestShape(input: AiExplainAppRiskRequest): boolean {
  if (!(RISK_LEVELS as readonly string[]).includes(input.appRiskLevel)) {
    return false;
  }
  if (!Number.isInteger(input.appRiskScore) || input.appRiskScore < 0 || input.appRiskScore > 100) {
    return false;
  }
  if (input.permissions.length > LIMITS.permissions.maxItems) {
    return false;
  }
  return input.permissions.every(
    (permission) =>
      (PERMISSION_TYPES as readonly string[]).includes(permission.type) &&
      (PERMISSION_STATUSES as readonly string[]).includes(permission.status) &&
      (RISK_LEVELS as readonly string[]).includes(permission.riskLevel),
  );
}

export async function requestAppRiskExplanation(
  input: AiExplainAppRiskRequest,
  caller: ExplainAppRiskCaller,
): Promise<AiExplanationResult> {
  if (!isSupportedAiRequestShape(input)) {
    throw new Error(AI_EXPLANATION_UNAVAILABLE);
  }

  const key = canonicalizeAiRequest(input);
  const existing = inflight.get(key);
  if (existing) {
    return existing;
  }

  const pending = caller(input)
    .then((raw) => parseAiExplanationResult(raw))
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, pending);
  return pending;
}

export function resetAiExplanationInflight(): void {
  inflight.clear();
}

/**
 * Input/output contracts and validation for explainAppRisk.
 * Risk levels match the deterministic engine: High | Medium | Safe.
 */

export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

export function getGeminiModel(): string {
  const configured = process.env.GEMINI_MODEL?.trim();
  return configured || DEFAULT_GEMINI_MODEL;
}

export const RISK_LEVELS = ['High', 'Medium', 'Safe'] as const;
export type AiRiskLevel = (typeof RISK_LEVELS)[number];

export const PERMISSION_STATUSES = ['granted', 'denied', 'restricted', 'unknown'] as const;
export type AiPermissionStatus = (typeof PERMISSION_STATUSES)[number];

export const PERMISSION_TYPES = [
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
export type AiPermissionType = (typeof PERMISSION_TYPES)[number];

export const LIMITS = {
  appName: {min: 1, max: 80},
  summary: {min: 1, max: 400},
  topContributor: {max: 80},
  reasons: {maxItems: 8, maxLength: 240},
  permissions: {maxItems: 8},
  permissionType: {max: 40},
  permissionLabel: {min: 1, max: 80},
  factualReasons: {maxItems: 8, maxLength: 240},
  outputSummary: {min: 1, max: 400},
  keyFactors: {minItems: 1, maxItems: 5, maxLength: 240},
  userGuidance: {minItems: 1, maxItems: 4, maxLength: 240},
  limitations: {min: 1, max: 400},
} as const;

const REQUEST_KEYS = [
  'appName',
  'appRiskScore',
  'appRiskLevel',
  'topContributor',
  'summary',
  'reasons',
  'permissions',
] as const;

const PERMISSION_KEYS = [
  'type',
  'label',
  'status',
  'riskScore',
  'riskLevel',
  'backgroundAccess',
  'factualReasons',
] as const;

export type AiExplainPermission = {
  type: AiPermissionType;
  label: string;
  status: AiPermissionStatus;
  riskScore: number;
  riskLevel: AiRiskLevel;
  backgroundAccess: boolean;
  factualReasons: string[];
};

export type AiExplainAppRiskRequest = {
  appName: string;
  appRiskScore: number;
  appRiskLevel: AiRiskLevel;
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

export class ExplainAppRiskError extends Error {
  constructor(
    readonly code:
      | 'unauthenticated'
      | 'invalid-argument'
      | 'internal'
      | 'resource-exhausted'
      | 'unavailable'
      | 'failed-precondition',
    message: string,
  ) {
    super(message);
    this.name = 'ExplainAppRiskError';
  }
}

export const SAFE_UNAVAILABLE = 'AI explanation unavailable right now.';

export const EXPLANATION_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'keyFactors', 'userGuidance', 'limitations'],
  properties: {
    summary: {type: 'string'},
    keyFactors: {type: 'array', items: {type: 'string'}},
    userGuidance: {type: 'array', items: {type: 'string'}},
    limitations: {type: 'string'},
  },
} as const;

const CLAIM_PATTERN =
  /\b(malicious|malware|spyware|spying|stolen|stealing|hacked|data stolen|tracking detected)\b/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertAllowedKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      throw new ExplainAppRiskError('invalid-argument', `${label} contains unsupported field "${key}".`);
    }
  }
}

function assertBoundedString(
  value: unknown,
  field: string,
  min: number,
  max: number,
): string {
  if (typeof value !== 'string') {
    throw new ExplainAppRiskError('invalid-argument', `${field} must be a string.`);
  }
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new ExplainAppRiskError(
      'invalid-argument',
      `${field} must be between ${min} and ${max} characters.`,
    );
  }
  if (trimmed !== value) {
    throw new ExplainAppRiskError('invalid-argument', `${field} must not include leading or trailing whitespace.`);
  }
  return value;
}

function assertScore(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 100) {
    throw new ExplainAppRiskError('invalid-argument', `${field} must be an integer from 0 to 100.`);
  }
  return value;
}

function assertRiskLevel(value: unknown, field: string): AiRiskLevel {
  if (typeof value !== 'string' || !RISK_LEVELS.includes(value as AiRiskLevel)) {
    throw new ExplainAppRiskError('invalid-argument', `${field} must be High, Medium, or Safe.`);
  }
  return value as AiRiskLevel;
}

function assertStringList(
  value: unknown,
  field: string,
  maxItems: number,
  maxLength: number,
  minItems = 0,
): string[] {
  if (!Array.isArray(value)) {
    throw new ExplainAppRiskError('invalid-argument', `${field} must be an array.`);
  }
  if (value.length < minItems || value.length > maxItems) {
    throw new ExplainAppRiskError(
      'invalid-argument',
      `${field} must contain between ${minItems} and ${maxItems} items.`,
    );
  }
  return value.map((item, index) =>
    assertBoundedString(item, `${field}[${index}]`, 1, maxLength),
  );
}

function assertPermission(value: unknown, index: number): AiExplainPermission {
  if (!isPlainObject(value)) {
    throw new ExplainAppRiskError('invalid-argument', `permissions[${index}] must be an object.`);
  }
  assertAllowedKeys(value, PERMISSION_KEYS, `permissions[${index}]`);

  if (typeof value.type !== 'string' || !PERMISSION_TYPES.includes(value.type as AiPermissionType)) {
    throw new ExplainAppRiskError('invalid-argument', `permissions[${index}].type is not a supported permission type.`);
  }
  if (value.type.length > LIMITS.permissionType.max) {
    throw new ExplainAppRiskError('invalid-argument', `permissions[${index}].type is too long.`);
  }
  if (typeof value.status !== 'string' || !PERMISSION_STATUSES.includes(value.status as AiPermissionStatus)) {
    throw new ExplainAppRiskError('invalid-argument', `permissions[${index}].status is not a valid permission status.`);
  }
  if (typeof value.backgroundAccess !== 'boolean') {
    throw new ExplainAppRiskError('invalid-argument', `permissions[${index}].backgroundAccess must be a boolean.`);
  }

  return {
    type: value.type as AiPermissionType,
    label: assertBoundedString(
      value.label,
      `permissions[${index}].label`,
      LIMITS.permissionLabel.min,
      LIMITS.permissionLabel.max,
    ),
    status: value.status as AiPermissionStatus,
    riskScore: assertScore(value.riskScore, `permissions[${index}].riskScore`),
    riskLevel: assertRiskLevel(value.riskLevel, `permissions[${index}].riskLevel`),
    backgroundAccess: value.backgroundAccess,
    factualReasons: assertStringList(
      value.factualReasons,
      `permissions[${index}].factualReasons`,
      LIMITS.factualReasons.maxItems,
      LIMITS.factualReasons.maxLength,
    ),
  };
}

export function validateExplainAppRiskRequest(data: unknown): AiExplainAppRiskRequest {
  if (!isPlainObject(data)) {
    throw new ExplainAppRiskError('invalid-argument', 'Request must be an object.');
  }
  assertAllowedKeys(data, REQUEST_KEYS, 'Request');

  if (data.topContributor !== null && typeof data.topContributor !== 'string') {
    throw new ExplainAppRiskError('invalid-argument', 'topContributor must be a string or null.');
  }
  if (typeof data.topContributor === 'string') {
    assertBoundedString(data.topContributor, 'topContributor', 1, LIMITS.topContributor.max);
  }

  if (!Array.isArray(data.permissions)) {
    throw new ExplainAppRiskError('invalid-argument', 'permissions must be an array.');
  }
  if (data.permissions.length > LIMITS.permissions.maxItems) {
    throw new ExplainAppRiskError(
      'invalid-argument',
      `permissions must contain at most ${LIMITS.permissions.maxItems} items.`,
    );
  }

  return {
    appName: assertBoundedString(data.appName, 'appName', LIMITS.appName.min, LIMITS.appName.max),
    appRiskScore: assertScore(data.appRiskScore, 'appRiskScore'),
    appRiskLevel: assertRiskLevel(data.appRiskLevel, 'appRiskLevel'),
    topContributor: typeof data.topContributor === 'string' ? data.topContributor : null,
    summary: assertBoundedString(data.summary, 'summary', LIMITS.summary.min, LIMITS.summary.max),
    reasons: assertStringList(data.reasons, 'reasons', LIMITS.reasons.maxItems, LIMITS.reasons.maxLength),
    permissions: data.permissions.map((permission, index) => assertPermission(permission, index)),
  };
}

function assertCleanText(value: string, field: string): void {
  if (CLAIM_PATTERN.test(value)) {
    throw new ExplainAppRiskError('internal', SAFE_UNAVAILABLE);
  }
  void field;
}

export function parseExplanation(raw: unknown): AiExplanation {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw) as unknown;
    } catch {
      throw new ExplainAppRiskError('internal', SAFE_UNAVAILABLE);
    }
  }

  if (!isPlainObject(value)) {
    throw new ExplainAppRiskError('internal', SAFE_UNAVAILABLE);
  }

  if ('appRiskScore' in value || 'appRiskLevel' in value || 'riskScore' in value || 'score' in value) {
    throw new ExplainAppRiskError('internal', SAFE_UNAVAILABLE);
  }

  const allowed = ['summary', 'keyFactors', 'userGuidance', 'limitations'];
  try {
    assertAllowedKeys(value, allowed, 'Explanation');
  } catch {
    throw new ExplainAppRiskError('internal', SAFE_UNAVAILABLE);
  }

  let summary: string;
  let keyFactors: string[];
  let userGuidance: string[];
  let limitations: string;
  try {
    summary = assertBoundedString(value.summary, 'summary', LIMITS.outputSummary.min, LIMITS.outputSummary.max);
    keyFactors = assertStringList(
      value.keyFactors,
      'keyFactors',
      LIMITS.keyFactors.maxItems,
      LIMITS.keyFactors.maxLength,
      LIMITS.keyFactors.minItems,
    );
    userGuidance = assertStringList(
      value.userGuidance,
      'userGuidance',
      LIMITS.userGuidance.maxItems,
      LIMITS.userGuidance.maxLength,
      LIMITS.userGuidance.minItems,
    );
    limitations = assertBoundedString(
      value.limitations,
      'limitations',
      LIMITS.limitations.min,
      LIMITS.limitations.max,
    );
  } catch {
    throw new ExplainAppRiskError('internal', SAFE_UNAVAILABLE);
  }

  assertCleanText(summary, 'summary');
  for (const factor of keyFactors) {
    assertCleanText(factor, 'keyFactors');
  }
  for (const item of userGuidance) {
    assertCleanText(item, 'userGuidance');
  }

  return {summary, keyFactors, userGuidance, limitations};
}

export function canonicalizeRequest(input: AiExplainAppRiskRequest): string {
  return JSON.stringify(input);
}

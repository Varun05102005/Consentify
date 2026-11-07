/**
 * Consentify Privacy Risk Engine
 *
 * Pure, deterministic, explainable scoring. No React, Firebase, Gemini, or ML.
 * Does not read or write stored UserApp.risk / AppPermission.risk — those
 * Firestore fields stay untouched until a later wiring step.
 *
 * ---------------------------------------------------------------------------
 * 1. Permission sensitivity (base 0–40)
 * ---------------------------------------------------------------------------
 * The base is how sensitive the data type is on Android, before grant state.
 * It is NOT a verdict. Denied camera still has a high base but a 0 multiplier.
 *
 *   Category          Base  Why
 *   camera            36    Captures photos/video of the user and surroundings
 *   microphone        36    Captures audio, including conversations
 *   location          34    Can reveal movement, home, and work
 *   phone             32    Call identity / phone number (future Android map)
 *   sms               32    SMS contents (future Android map)
 *   contacts          30    Address book / social graph
 *   photos            28    Access to the media library
 *   calendar          22    Schedule and attendees (future Android map)
 *   nearbyDevices     20    Nearby radios/devices (future Android map)
 *   storage           18    Files; typically less identifying than photos
 *   other             16    Unknown type — modest, never assumed High
 *   sensors           14    Motion/activity; weaker than precise location
 *   notifications     12    Notification contents; lower than sensors/media
 *
 * ---------------------------------------------------------------------------
 * 2. Permission score
 * ---------------------------------------------------------------------------
 *   riskScore = clamp 0–100 of:
 *     round(base × statusMultiplier + backgroundBonus + recencyBonus)
 *
 * Status multipliers:
 *   granted    × 1.00   full contribution of the base
 *   unknown    × 0.25   modest uncertainty; NOT treated as High
 *   restricted × 0.15   limited access
 *   denied     × 0.00   not accessible — no risk from this permission
 *
 * Background bonus: +16 only when status is granted AND backgroundAccess.
 *   Continuous/unattended use is more invasive than in-app use.
 *
 * Recency bonus (granted only, lastUsedAt present):
 *   used in last 24 hours  +4
 *   used in last 7 days    +2
 *   older or missing       +0  (missing lastUsedAt is not extra risk)
 *
 * ---------------------------------------------------------------------------
 * 3. Permission thresholds
 * ---------------------------------------------------------------------------
 *   Safe   riskScore <  25
 *   Medium 25 ≤ score <  50
 *   High   riskScore ≥  50
 *
 * A single foreground grant of camera/location is Medium, not High.
 * High requires a clear extra factor, typically granted + background on a
 * sensitive type (e.g. location 34 + background 16 = 50).
 *
 * ---------------------------------------------------------------------------
 * 4. App-level score
 * ---------------------------------------------------------------------------
 * Combine permission riskScores with a probabilistic OR so scores do not
 * stack past 100 and one Medium grant cannot explode the total:
 *
 *   appRiskScore    = round(100 × (1 − ∏(1 − p.riskScore / 100)))
 *   privacyScore    = 100 − appRiskScore
 *   app riskLevel   = the highest permission riskLevel
 *                     (denied/safe permissions do not raise the app)
 *
 * No permissions → privacyScore 100, Safe.
 * Removed apps are ignored by the user-level rollup.
 *
 * ---------------------------------------------------------------------------
 * 5. Overall user privacy score
 * ---------------------------------------------------------------------------
 *   overallPrivacyScore = round(mean of active apps' privacyScore)
 *   high / medium / safe app counts use the calculated app riskLevel
 *
 * No active apps → 100.
 */

import type {
  AppPermission,
  AppRiskResult,
  PermissionRiskResult,
  PermissionStatus,
  PermissionType,
  RiskLevel,
  RiskPermissionCategory,
  UserApp,
  UserRiskResult,
} from '../types';

export type {AppRiskResult, PermissionRiskResult, RiskPermissionCategory, UserRiskResult};

export interface PermissionSensitivity {
  category: RiskPermissionCategory;
  base: number;
  label: string;
  why: string;
}

export const PERMISSION_SENSITIVITY: Record<RiskPermissionCategory, PermissionSensitivity> = {
  camera: {
    category: 'camera',
    base: 36,
    label: 'Camera',
    why: 'Can capture photos and video of the user and surroundings.',
  },
  microphone: {
    category: 'microphone',
    base: 36,
    label: 'Microphone',
    why: 'Can capture audio, including conversations nearby.',
  },
  location: {
    category: 'location',
    base: 34,
    label: 'Location',
    why: 'Can reveal movement and frequently visited places such as home or work.',
  },
  phone: {
    category: 'phone',
    base: 32,
    label: 'Phone',
    why: 'Can access phone identity and call-related information.',
  },
  sms: {
    category: 'sms',
    base: 32,
    label: 'SMS',
    why: 'Can access SMS message contents.',
  },
  contacts: {
    category: 'contacts',
    base: 30,
    label: 'Contacts',
    why: 'Can access the address book (names, numbers, and related contacts).',
  },
  photos: {
    category: 'photos',
    base: 28,
    label: 'Photos',
    why: 'Can access photos and media in the library.',
  },
  calendar: {
    category: 'calendar',
    base: 22,
    label: 'Calendar',
    why: 'Can access calendar events and attendees.',
  },
  nearbyDevices: {
    category: 'nearbyDevices',
    base: 20,
    label: 'Nearby devices',
    why: 'Can discover nearby radios or devices.',
  },
  storage: {
    category: 'storage',
    base: 18,
    label: 'Storage',
    why: 'Can access files on the device. Usually less identifying than the photo library.',
  },
  other: {
    category: 'other',
    base: 16,
    label: 'Other',
    why: 'Unclassified permission. Scored modestly and not assumed High.',
  },
  sensors: {
    category: 'sensors',
    base: 14,
    label: 'Sensors',
    why: 'Can read motion or activity sensors, which are weaker identifiers than precise location.',
  },
  notifications: {
    category: 'notifications',
    base: 12,
    label: 'Notifications',
    why: 'Can access notification contents, which is less sensitive than media, location, or audio.',
  },
};

/** Status multipliers applied to the sensitivity base. */
export const STATUS_MULTIPLIER: Record<PermissionStatus, number> = {
  granted: 1,
  unknown: 0.25,
  restricted: 0.15,
  denied: 0,
};

/** Extra points when a granted permission can run in the background. */
export const BACKGROUND_BONUS = 16;

const RECENCY_DAY_MS = 24 * 60 * 60 * 1000;
const RECENCY_WEEK_MS = 7 * RECENCY_DAY_MS;
const RECENCY_BONUS_24H = 4;
const RECENCY_BONUS_7D = 2;

export const PERMISSION_SCORE_THRESHOLDS = {
  /** Scores below this are Safe. */
  medium: 25,
  /** Scores at or above this are High. */
  high: 50,
} as const;

const RISK_RANK: Record<RiskLevel, number> = {
  Safe: 0,
  Medium: 1,
  High: 2,
};

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function isPermissionStatus(value: unknown): value is PermissionStatus {
  return value === 'granted' || value === 'denied' || value === 'restricted' || value === 'unknown';
}

function normalizePermission(permission: AppPermission | null | undefined): AppPermission {
  const source = permission ?? ({} as AppPermission);
  const type = categoryFromPermissionType(source.type);
  const status = isPermissionStatus(source.status) ? source.status : 'unknown';
  const lastUsedAt =
    source.lastUsedAt instanceof Date && !Number.isNaN(source.lastUsedAt.getTime())
      ? source.lastUsedAt
      : null;

  return {
    type: source.type === type ? source.type : 'other',
    label: typeof source.label === 'string' ? source.label : '',
    status,
    risk: 'Safe',
    backgroundAccess: source.backgroundAccess === true,
    lastUsedAt,
  };
}

export function categoryFromPermissionType(type: PermissionType): RiskPermissionCategory {
  switch (type) {
    case 'camera':
    case 'microphone':
    case 'location':
    case 'contacts':
    case 'photos':
    case 'storage':
    case 'notifications':
    case 'sensors':
      return type;
    default:
      return 'other';
  }
}

export function riskLevelFromPermissionScore(score: number): RiskLevel {
  if (score >= PERMISSION_SCORE_THRESHOLDS.high) {
    return 'High';
  }
  if (score >= PERMISSION_SCORE_THRESHOLDS.medium) {
    return 'Medium';
  }
  return 'Safe';
}

const HIGHLY_SENSITIVE_CATEGORIES: ReadonlySet<RiskPermissionCategory> = new Set([
  'camera',
  'microphone',
]);
const SENSITIVE_CATEGORIES: ReadonlySet<RiskPermissionCategory> = new Set([
  'location',
  'phone',
  'sms',
  'contacts',
]);
const MAX_APP_CONTRIBUTOR_LINES = 4;
const LOWER_SENSITIVITY_FOR_APP: ReadonlySet<RiskPermissionCategory> = new Set([
  'photos',
  'storage',
  'calendar',
  'nearbyDevices',
  'sensors',
  'notifications',
  'other',
]);

function recencyBonus(permission: AppPermission): {points: number; reason: string | null} {
  if (permission.status !== 'granted' || !permission.lastUsedAt) {
    return {points: 0, reason: null};
  }

  const age = Date.now() - permission.lastUsedAt.getTime();
  if (age < 0) {
    return {points: 0, reason: null};
  }
  if (age <= RECENCY_DAY_MS) {
    return {
      points: RECENCY_BONUS_24H,
      reason: 'A recorded last-used time is within the last 24 hours.',
    };
  }
  if (age <= RECENCY_WEEK_MS) {
    return {
      points: RECENCY_BONUS_7D,
      reason: 'A recorded last-used time is within the last 7 days.',
    };
  }

  return {points: 0, reason: null};
}

function sensitivityReason(sensitivity: PermissionSensitivity): string {
  if (HIGHLY_SENSITIVE_CATEGORIES.has(sensitivity.category)) {
    return `${sensitivity.label} is a highly sensitive permission.`;
  }
  if (SENSITIVE_CATEGORIES.has(sensitivity.category)) {
    return `${sensitivity.label} is a sensitive permission.`;
  }
  if (sensitivity.category === 'other') {
    return `${sensitivity.label} is unclassified and is not assumed High.`;
  }
  return `${sensitivity.label} has a lower sensitivity than camera, microphone, or location.`;
}

function backgroundReason(permission: AppPermission, sensitivity: PermissionSensitivity): string | null {
  if (permission.status === 'granted' && permission.backgroundAccess) {
    return `Background access increases privacy exposure because ${sensitivity.label.toLowerCase()} may be available when the app is not actively being used.`;
  }

  if (permission.backgroundAccess && permission.status !== 'granted') {
    return 'Background access is recorded but is not counted while the permission is not granted.';
  }

  if (
    permission.status === 'granted' &&
    !permission.backgroundAccess &&
    (HIGHLY_SENSITIVE_CATEGORIES.has(sensitivity.category) || sensitivity.category === 'location')
  ) {
    return `No background ${sensitivity.label.toLowerCase()} access is recorded.`;
  }

  return null;
}

export function scorePermission(permission: AppPermission): PermissionRiskResult {
  const normalized = normalizePermission(permission);
  const category = categoryFromPermissionType(normalized.type);
  const sensitivity = PERMISSION_SENSITIVITY[category];
  const multiplier = STATUS_MULTIPLIER[normalized.status];
  const backgroundPoints =
    normalized.status === 'granted' && normalized.backgroundAccess ? BACKGROUND_BONUS : 0;
  const recency = recencyBonus(normalized);

  const riskScore = clampScore(
    sensitivity.base * multiplier + backgroundPoints + recency.points,
  );

  return {
    type: normalized.type,
    category,
    label: normalized.label.trim() || sensitivity.label,
    status: normalized.status,
    backgroundAccess: normalized.backgroundAccess,
    lastUsedAt: normalized.lastUsedAt,
    baseScore: sensitivity.base,
    statusMultiplier: multiplier,
    backgroundBonus: backgroundPoints,
    recencyBonus: recency.points,
    riskScore,
    riskLevel: riskLevelFromPermissionScore(riskScore),
    reasons: explainPermissionFactors(normalized, sensitivity, recency.reason),
  };
}

function explainPermissionFactors(
  permission: AppPermission,
  sensitivity: PermissionSensitivity,
  recencyReason: string | null,
): string[] {
  const reasons = [sensitivityReason(sensitivity)];

  switch (permission.status) {
    case 'denied':
      reasons.push('The permission is currently denied.');
      reasons.push('A denied permission contributes no current permission risk.');
      break;
    case 'restricted':
      reasons.push('The permission is currently restricted, so only limited access is counted.');
      break;
    case 'unknown':
      reasons.push('The permission status is unknown. Unknown is not treated as High.');
      break;
    case 'granted':
      reasons.push('The permission is currently granted.');
      break;
    default:
      break;
  }

  const background = backgroundReason(permission, sensitivity);
  if (background) {
    reasons.push(background);
  }

  if (recencyReason) {
    reasons.push(recencyReason);
  }

  return reasons;
}

export function explainPermissionRisk(permission: AppPermission): string[] {
  return scorePermission(permission).reasons;
}

function combinePermissionRiskScores(scores: number[]): number {
  if (scores.length === 0) {
    return 0;
  }

  const survival = scores.reduce((product, score) => product * (1 - score / 100), 1);
  return clampScore(100 * (1 - survival));
}

function highestRiskLevel(levels: RiskLevel[]): RiskLevel {
  return levels.reduce<RiskLevel>((highest, level) => (
    RISK_RANK[level] > RISK_RANK[highest] ? level : highest
  ), 'Safe');
}

export function calculateAppRisk(app: UserApp): AppRiskResult {
  const permissions = Array.isArray(app.permissions) ? app.permissions : [];
  const appName = typeof app.name === 'string' && app.name.trim() ? app.name : 'Untitled app';
  const permissionBreakdown = permissions.map(scorePermission);
  const riskScore = combinePermissionRiskScores(
    permissionBreakdown.map((permission) => permission.riskScore),
  );
  const privacyScore = 100 - riskScore;
  const riskLevel = highestRiskLevel(permissionBreakdown.map((permission) => permission.riskLevel));
  const explanation = explainAppFactors(permissionBreakdown, riskLevel);

  return {
    appId: typeof app.id === 'string' ? app.id : '',
    appName,
    privacyScore,
    riskScore,
    riskLevel,
    summary: explanation.summary,
    topContributorLabel: explanation.topContributorLabel,
    reasons: explanation.reasons,
    permissionBreakdown,
  };
}

export function permissionsByRisk(breakdown: PermissionRiskResult[]): PermissionRiskResult[] {
  return [...breakdown].sort((left, right) => right.riskScore - left.riskScore);
}

function contributorLine(item: PermissionRiskResult): string {
  if (item.status === 'denied') {
    return `${item.label} access is denied and contributes no current permission risk.`;
  }
  if (item.status === 'restricted') {
    return `${item.label} access is restricted, so it contributes limited permission risk.`;
  }
  if (item.status === 'unknown') {
    return `${item.label} status is unknown and is not treated as High.`;
  }
  if (item.backgroundAccess) {
    return `${item.label} access is granted with background access.`;
  }
  if (LOWER_SENSITIVITY_FOR_APP.has(item.category)) {
    return `${item.label} access is granted but has lower sensitivity.`;
  }
  return `${item.label} access is granted.`;
}

function appSummary(ranked: PermissionRiskResult[], riskLevel: RiskLevel): string {
  if (ranked.length === 0) {
    return 'No permissions are recorded for this app.';
  }

  const top = ranked[0];
  if (!top || top.riskScore <= 0 || riskLevel === 'Safe') {
    return "No granted high-sensitivity permissions currently raise this app's privacy risk.";
  }
  if (top.status === 'granted' && top.backgroundAccess) {
    return `Background ${top.label.toLowerCase()} access is the largest contributor to this app's privacy risk.`;
  }
  if (top.status === 'granted') {
    return `Granted ${top.label.toLowerCase()} access is the largest contributor to this app's privacy risk.`;
  }
  return `${top.label} is the largest contributor to this app's privacy risk.`;
}

function explainAppFactors(
  breakdown: PermissionRiskResult[],
  riskLevel: RiskLevel,
): {summary: string; reasons: string[]; topContributorLabel: string | null} {
  if (breakdown.length === 0) {
    return {
      summary: 'No permissions are recorded for this app.',
      topContributorLabel: null,
      reasons: ['No permissions are recorded, so this app is scored Safe with a privacy score of 100.'],
    };
  }

  const ranked = permissionsByRisk(breakdown);
  const top = ranked[0];
  const contributorLines = ranked.map(contributorLine);
  const reasons =
    contributorLines.length > MAX_APP_CONTRIBUTOR_LINES
      ? [
          ...contributorLines.slice(0, MAX_APP_CONTRIBUTOR_LINES),
          `${contributorLines.length - MAX_APP_CONTRIBUTOR_LINES} more permission${
            contributorLines.length - MAX_APP_CONTRIBUTOR_LINES === 1 ? ' was' : 's were'
          } scored.`,
        ]
      : contributorLines;

  if (top && top.riskScore > 0) {
    reasons.push(`The highest-risk permission is ${top.label}.`);
  } else {
    reasons.push('None of these permissions currently contribute permission risk.');
  }

  return {
    summary: appSummary(ranked, riskLevel),
    topContributorLabel: top && top.riskScore > 0 ? top.label : null,
    reasons,
  };
}

export function explainAppRisk(app: UserApp): string[] {
  return calculateAppRisk(app).reasons;
}

function isActiveApp(app: UserApp): boolean {
  return app.status !== 'removed';
}

export function calculateOverallPrivacyScore(apps: UserApp[]): UserRiskResult {
  const list = Array.isArray(apps) ? apps : [];
  const appBreakdown = list.filter(isActiveApp).map(calculateAppRisk);

  if (appBreakdown.length === 0) {
    return {
      overallPrivacyScore: 100,
      highRiskApps: 0,
      mediumRiskApps: 0,
      safeApps: 0,
      appBreakdown,
    };
  }

  const totalPrivacy = appBreakdown.reduce((sum, app) => sum + app.privacyScore, 0);

  return {
    overallPrivacyScore: clampScore(totalPrivacy / appBreakdown.length),
    highRiskApps: appBreakdown.filter((app) => app.riskLevel === 'High').length,
    mediumRiskApps: appBreakdown.filter((app) => app.riskLevel === 'Medium').length,
    safeApps: appBreakdown.filter((app) => app.riskLevel === 'Safe').length,
    appBreakdown,
  };
}

function samplePermission(
  type: PermissionType,
  status: PermissionStatus,
  backgroundAccess: boolean,
): AppPermission {
  return {
    type,
    label: PERMISSION_SENSITIVITY[categoryFromPermissionType(type)].label,
    status,
    risk: 'Safe',
    backgroundAccess,
    lastUsedAt: null,
  };
}

/** Worked examples used by the Step 6A report. Stored risk is ignored. */
export const RISK_ENGINE_EXAMPLES = {
  locationGrantedBackground: scorePermission(samplePermission('location', 'granted', true)),
  cameraGranted: scorePermission(samplePermission('camera', 'granted', false)),
  cameraDenied: scorePermission(samplePermission('camera', 'denied', false)),
  storageGranted: scorePermission(samplePermission('storage', 'granted', false)),
} as const;

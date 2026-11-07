/**
 * ingestAppScan: authenticated, allowlisted write of Android scan facts.
 *
 * UID always comes from request.auth.uid. The client cannot choose the
 * Firestore path or supply risk scores. Admin SDK writes bypass rules, so
 * validation here is the security boundary.
 *
 * Android on the Spark plan writes Firestore directly and does not call this
 * callable. Keep this implementation for an optional future Blaze deployment.
 */

import {FieldValue, getFirestore, type Firestore} from 'firebase-admin/firestore';
import {HttpsError, onCall} from 'firebase-functions/v2/https';

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
export type IngestPermissionType = (typeof PERMISSION_TYPES)[number];

export const PERMISSION_STATUSES = ['granted', 'denied', 'restricted', 'unknown'] as const;
export type IngestPermissionStatus = (typeof PERMISSION_STATUSES)[number];

export const INGEST_LIMITS = {
  apps: {maxItems: 100},
  permissions: {maxItems: 20},
  packageName: {min: 3, max: 255},
  appName: {min: 1, max: 80},
  permissionLabel: {min: 1, max: 80},
} as const;

const REQUEST_KEYS = ['apps'] as const;
const APP_KEYS = ['packageName', 'appName', 'permissions'] as const;
const PERMISSION_KEYS = ['consentifyType', 'label', 'status', 'backgroundAccess'] as const;

const PACKAGE_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;

export const INGEST_SAFE_UNAVAILABLE = 'Unable to save this scan. Please try again.';

export class IngestAppScanError extends Error {
  constructor(
    readonly code:
      | 'unauthenticated'
      | 'invalid-argument'
      | 'internal'
      | 'resource-exhausted'
      | 'unavailable'
      | 'permission-denied',
    message: string,
  ) {
    super(message);
    this.name = 'IngestAppScanError';
  }
}

export type IngestPermissionFact = {
  consentifyType: IngestPermissionType;
  label: string;
  status: IngestPermissionStatus;
  backgroundAccess: boolean;
};

export type IngestScannedApp = {
  packageName: string;
  appName: string;
  permissions: IngestPermissionFact[];
};

export type IngestAppScanRequest = {
  apps: IngestScannedApp[];
};

export type IngestAppScanResult = {
  writtenAppCount: number;
  uploadedCount: number;
  markedRemovedCount: number;
  restoredCount: number;
};

export type IngestStore = {
  listApps(uid: string): Promise<Map<string, Record<string, unknown>>>;
  writeApps(
    uid: string,
    writes: Array<{packageName: string; data: Record<string, unknown>}>,
  ): Promise<void>;
};

export type TimestampFactory = () => unknown;

const FIRESTORE_BATCH_LIMIT = 500;

function emptyIngestResult(): IngestAppScanResult {
  return {
    writtenAppCount: 0,
    uploadedCount: 0,
    markedRemovedCount: 0,
    restoredCount: 0,
  };
}

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
      throw new IngestAppScanError('invalid-argument', `${label} contains unsupported field "${key}".`);
    }
  }
}

function assertBoundedString(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== 'string') {
    throw new IngestAppScanError('invalid-argument', `${field} must be a string.`);
  }
  if (value.trim() !== value) {
    throw new IngestAppScanError('invalid-argument', `${field} must not include leading or trailing whitespace.`);
  }
  if (value.length < min || value.length > max) {
    throw new IngestAppScanError(
      'invalid-argument',
      `${field} must be between ${min} and ${max} characters.`,
    );
  }
  return value;
}

export function assertAndroidPackageName(value: unknown, field = 'packageName'): string {
  const packageName = assertBoundedString(
    value,
    field,
    INGEST_LIMITS.packageName.min,
    INGEST_LIMITS.packageName.max,
  );

  if (packageName.includes('/') || packageName.includes('\\')) {
    throw new IngestAppScanError('invalid-argument', `${field} is not a valid Android package name.`);
  }
  if (packageName.includes('..') || packageName.startsWith('.') || packageName.endsWith('.')) {
    throw new IngestAppScanError('invalid-argument', `${field} is not a valid Android package name.`);
  }
  if (!PACKAGE_NAME_PATTERN.test(packageName)) {
    throw new IngestAppScanError('invalid-argument', `${field} is not a valid Android package name.`);
  }

  return packageName;
}

function assertPermission(value: unknown, appIndex: number, permIndex: number): IngestPermissionFact {
  const label = `apps[${appIndex}].permissions[${permIndex}]`;
  if (!isPlainObject(value)) {
    throw new IngestAppScanError('invalid-argument', `${label} must be an object.`);
  }
  assertAllowedKeys(value, PERMISSION_KEYS, label);

  if (
    typeof value.consentifyType !== 'string' ||
    !PERMISSION_TYPES.includes(value.consentifyType as IngestPermissionType)
  ) {
    throw new IngestAppScanError('invalid-argument', `${label}.consentifyType is not a supported permission type.`);
  }
  if (
    typeof value.status !== 'string' ||
    !PERMISSION_STATUSES.includes(value.status as IngestPermissionStatus)
  ) {
    throw new IngestAppScanError('invalid-argument', `${label}.status is not a valid permission status.`);
  }
  if (typeof value.backgroundAccess !== 'boolean') {
    throw new IngestAppScanError('invalid-argument', `${label}.backgroundAccess must be a boolean.`);
  }

  const permissionLabel = assertBoundedString(
    value.label,
    `${label}.label`,
    INGEST_LIMITS.permissionLabel.min,
    INGEST_LIMITS.permissionLabel.max,
  );
  if (permissionLabel.includes('android.permission.') || permissionLabel.includes('/') || permissionLabel.includes('\\')) {
    throw new IngestAppScanError('invalid-argument', `${label}.label is not a valid permission label.`);
  }

  return {
    consentifyType: value.consentifyType as IngestPermissionType,
    label: permissionLabel,
    status: value.status as IngestPermissionStatus,
    backgroundAccess: value.backgroundAccess,
  };
}

function assertApp(value: unknown, index: number): IngestScannedApp {
  const label = `apps[${index}]`;
  if (!isPlainObject(value)) {
    throw new IngestAppScanError('invalid-argument', `${label} must be an object.`);
  }
  assertAllowedKeys(value, APP_KEYS, label);

  const packageName = assertAndroidPackageName(value.packageName, `${label}.packageName`);
  const appName = assertBoundedString(
    value.appName,
    `${label}.appName`,
    INGEST_LIMITS.appName.min,
    INGEST_LIMITS.appName.max,
  );

  if (!Array.isArray(value.permissions)) {
    throw new IngestAppScanError('invalid-argument', `${label}.permissions must be an array.`);
  }
  if (value.permissions.length > INGEST_LIMITS.permissions.maxItems) {
    throw new IngestAppScanError(
      'invalid-argument',
      `${label}.permissions must contain at most ${INGEST_LIMITS.permissions.maxItems} items.`,
    );
  }

  const permissions = value.permissions.map((permission, permIndex) =>
    assertPermission(permission, index, permIndex),
  );
  const types = new Set<string>();
  for (const permission of permissions) {
    if (types.has(permission.consentifyType)) {
      throw new IngestAppScanError(
        'invalid-argument',
        `${label} contains duplicate permission type "${permission.consentifyType}".`,
      );
    }
    types.add(permission.consentifyType);
  }

  return {packageName, appName, permissions};
}

export function validateIngestAppScanRequest(data: unknown): IngestAppScanRequest {
  if (!isPlainObject(data)) {
    throw new IngestAppScanError('invalid-argument', 'Request must be an object.');
  }
  assertAllowedKeys(data, REQUEST_KEYS, 'Request');

  if (!Array.isArray(data.apps)) {
    throw new IngestAppScanError('invalid-argument', 'apps must be an array.');
  }
  if (data.apps.length > INGEST_LIMITS.apps.maxItems) {
    throw new IngestAppScanError(
      'invalid-argument',
      `apps must contain at most ${INGEST_LIMITS.apps.maxItems} items.`,
    );
  }

  const apps = data.apps.map((app, index) => assertApp(app, index));
  const seen = new Set<string>();
  for (const app of apps) {
    if (seen.has(app.packageName)) {
      throw new IngestAppScanError(
        'invalid-argument',
        `Duplicate package name "${app.packageName}".`,
      );
    }
    seen.add(app.packageName);
  }

  return {apps};
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function androidPackageIdentity(
  docId: string,
  data: Record<string, unknown>,
): string | null {
  const named = asString(data.packageName);
  if (named && PACKAGE_NAME_PATTERN.test(named)) {
    return named;
  }
  if (PACKAGE_NAME_PATTERN.test(docId)) {
    return docId;
  }
  return null;
}

function permissionDocuments(permissions: IngestPermissionFact[]): Record<string, unknown>[] {
  return permissions.map((permission) => ({
    type: permission.consentifyType,
    label: permission.label,
    status: permission.status,
    backgroundAccess: permission.backgroundAccess,
    lastUsedAt: null,
  }));
}

function buildAppDocument(
  uid: string,
  app: IngestScannedApp,
  existing: Record<string, unknown> | null,
  timestamp: unknown,
): Record<string, unknown> {
  return {
    ownerUid: uid,
    name: app.appName,
    packageName: app.packageName,
    category: asString(existing?.category) ?? 'other',
    icon: typeof existing?.icon === 'string' ? existing.icon : '',
    status: 'installed',
    permissions: permissionDocuments(app.permissions),
    lastScannedAt: timestamp,
    updatedAt: timestamp,
    createdAt: existing?.createdAt ?? timestamp,
  };
}

function buildRemovedDocument(
  uid: string,
  docId: string,
  existing: Record<string, unknown>,
  timestamp: unknown,
): Record<string, unknown> {
  const packageName = asString(existing.packageName) ?? docId;
  return {
    ownerUid: uid,
    name: asString(existing.name) ?? packageName,
    packageName,
    category: asString(existing.category) ?? 'other',
    icon: typeof existing.icon === 'string' ? existing.icon : '',
    status: 'removed',
    permissions: Array.isArray(existing.permissions) ? existing.permissions : [],
    lastScannedAt: existing.lastScannedAt ?? null,
    updatedAt: timestamp,
    createdAt: existing.createdAt ?? timestamp,
  };
}

/**
 * Successful non-empty scans upsert incoming apps as installed and mark
 * previously installed Android package documents absent from the scan as
 * removed. Empty scans return a no-op and never list or mutate existing apps.
 *
 * Concurrent scans are last-write-wins: this callable has no scan-history
 * version to reject a slower older scan after a newer one has committed.
 */
export async function handleIngestAppScan(
  auth: {uid: string} | null | undefined,
  data: unknown,
  store: IngestStore,
  timestamp: TimestampFactory,
): Promise<IngestAppScanResult> {
  const uid = auth?.uid?.trim();
  if (!uid) {
    throw new IngestAppScanError('unauthenticated', 'Sign in to upload a scan.');
  }

  const request = validateIngestAppScanRequest(data);
  if (request.apps.length === 0) {
    return emptyIngestResult();
  }

  let existingById: Map<string, Record<string, unknown>>;
  try {
    existingById = await store.listApps(uid);
  } catch {
    throw new IngestAppScanError('internal', INGEST_SAFE_UNAVAILABLE);
  }

  const incoming = new Set(request.apps.map((app) => app.packageName));
  const stamp = timestamp();
  const writes: Array<{packageName: string; data: Record<string, unknown>}> = [];
  let restoredCount = 0;

  for (const app of request.apps) {
    const existing = existingById.get(app.packageName) ?? null;
    if (existing && asString(existing.status) === 'removed') {
      restoredCount += 1;
    }
    writes.push({
      packageName: app.packageName,
      data: buildAppDocument(uid, app, existing, stamp),
    });
  }

  let markedRemovedCount = 0;
  for (const [docId, data] of existingById) {
    const identity = androidPackageIdentity(docId, data);
    if (!identity || incoming.has(identity)) {
      continue;
    }
    if (asString(data.status) !== 'installed') {
      continue;
    }
    writes.push({
      packageName: docId,
      data: buildRemovedDocument(uid, docId, data, stamp),
    });
    markedRemovedCount += 1;
  }

  try {
    await store.writeApps(uid, writes);
  } catch {
    throw new IngestAppScanError('internal', INGEST_SAFE_UNAVAILABLE);
  }

  return {
    writtenAppCount: request.apps.length,
    uploadedCount: request.apps.length,
    markedRemovedCount,
    restoredCount,
  };
}

export function createAdminIngestStore(db: Firestore): IngestStore {
  return {
    async listApps(uid) {
      const snapshot = await db.collection('users').doc(uid).collection('apps').get();
      const result = new Map<string, Record<string, unknown>>();
      snapshot.forEach((doc) => {
        result.set(doc.id, doc.data() as Record<string, unknown>);
      });
      return result;
    },
    async writeApps(uid, writes) {
      for (let offset = 0; offset < writes.length; offset += FIRESTORE_BATCH_LIMIT) {
        const slice = writes.slice(offset, offset + FIRESTORE_BATCH_LIMIT);
        const batch = db.batch();
        for (const write of slice) {
          const ref = db.collection('users').doc(uid).collection('apps').doc(write.packageName);
          batch.set(ref, write.data);
        }
        await batch.commit();
      }
    },
  };
}

function toHttpsError(error: unknown): HttpsError {
  if (error instanceof HttpsError) {
    return error;
  }
  if (error instanceof IngestAppScanError) {
    return new HttpsError(error.code, error.message);
  }
  return new HttpsError('internal', INGEST_SAFE_UNAVAILABLE);
}

export const ingestAppScan = onCall(
  {
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (request) => {
    try {
      return await handleIngestAppScan(
        request.auth,
        request.data,
        createAdminIngestStore(getFirestore()),
        () => FieldValue.serverTimestamp(),
      );
    } catch (error) {
      throw toHttpsError(error);
    }
  },
);

import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {
  INGEST_LIMITS,
  INGEST_SAFE_UNAVAILABLE,
  IngestAppScanError,
  assertAndroidPackageName,
  handleIngestAppScan,
  validateIngestAppScanRequest,
  type IngestStore,
} from './ingestAppScan';

const SERVER_TS = 'SERVER_TIMESTAMP';

function validPermission(overrides: Record<string, unknown> = {}) {
  return {
    consentifyType: 'location',
    label: 'Location',
    status: 'granted',
    backgroundAccess: true,
    ...overrides,
  };
}

function validApp(overrides: Record<string, unknown> = {}) {
  return {
    packageName: 'com.example.maps',
    appName: 'Maps',
    permissions: [validPermission()],
    ...overrides,
  };
}

function validRequest(overrides: Record<string, unknown> = {}) {
  return {
    apps: [validApp()],
    ...overrides,
  };
}

class MemoryStore implements IngestStore {
  docs = new Map<string, Record<string, unknown>>();
  failList = false;
  failWrite = false;
  listCalls = 0;
  writes: Array<{uid: string; packageName: string; data: Record<string, unknown>}> = [];

  key(uid: string, packageName: string): string {
    return `${uid}/${packageName}`;
  }

  async listApps(uid: string) {
    this.listCalls += 1;
    if (this.failList) {
      throw new Error('firestore get exploded');
    }
    const result = new Map<string, Record<string, unknown>>();
    const prefix = `${uid}/`;
    for (const [key, data] of this.docs) {
      if (key.startsWith(prefix)) {
        result.set(key.slice(prefix.length), {...data});
      }
    }
    return result;
  }

  async writeApps(uid: string, writes: Array<{packageName: string; data: Record<string, unknown>}>) {
    if (this.failWrite) {
      throw new Error('firestore write exploded with stack');
    }
    for (const write of writes) {
      this.writes.push({uid, ...write});
      this.docs.set(this.key(uid, write.packageName), {...write.data});
    }
  }
}

function seedApp(
  store: MemoryStore,
  packageName: string,
  extra: Record<string, unknown> = {},
  uid = 'user-1',
) {
  store.docs.set(store.key(uid, packageName), {
    ownerUid: uid,
    name: packageName,
    packageName,
    category: 'other',
    icon: '',
    status: 'installed',
    permissions: [
      {
        type: 'location',
        label: 'Location',
        status: 'granted',
        backgroundAccess: true,
        lastUsedAt: null,
      },
    ],
    createdAt: 'OLD_CREATED',
    updatedAt: 'OLD_UPDATED',
    lastScannedAt: 'OLD_SCANNED',
    ...extra,
  });
}

function stored(store: MemoryStore, packageName: string, uid = 'user-1') {
  return store.docs.get(store.key(uid, packageName));
}

async function ingest(
  data: unknown,
  options: {uid?: string | null; store?: MemoryStore} = {},
) {
  const store = options.store ?? new MemoryStore();
  const uid = options.uid === undefined ? 'user-1' : options.uid;
  const result = await handleIngestAppScan(
    uid ? {uid} : null,
    data,
    store,
    () => SERVER_TS,
  );
  return {result, store};
}

describe('validateIngestAppScanRequest', () => {
  it('accepts a valid scan', () => {
    const parsed = validateIngestAppScanRequest(validRequest());
    assert.equal(parsed.apps[0].packageName, 'com.example.maps');
  });

  it('rejects missing apps', () => {
    assert.throws(
      () => validateIngestAppScanRequest({}),
      (error: unknown) => error instanceof IngestAppScanError && error.code === 'invalid-argument',
    );
  });

  it('rejects extra top-level fields including uid', () => {
    assert.throws(
      () => validateIngestAppScanRequest({...validRequest(), uid: 'attacker'}),
      (error: unknown) =>
        error instanceof IngestAppScanError &&
        error.code === 'invalid-argument' &&
        error.message.includes('uid'),
    );
  });

  it('rejects client ownerUid', () => {
    assert.throws(
      () => validateIngestAppScanRequest({apps: [{...validApp(), ownerUid: 'attacker'}]}),
      (error: unknown) =>
        error instanceof IngestAppScanError &&
        error.code === 'invalid-argument' &&
        error.message.includes('ownerUid'),
    );
  });

  it('rejects client privacyScore', () => {
    assert.throws(
      () => validateIngestAppScanRequest({apps: [{...validApp(), privacyScore: 12}]}),
      (error: unknown) =>
        error instanceof IngestAppScanError &&
        error.code === 'invalid-argument' &&
        error.message.includes('privacyScore'),
    );
  });

  it('rejects duplicate package names', () => {
    assert.throws(
      () =>
        validateIngestAppScanRequest({
          apps: [validApp(), validApp({appName: 'Maps Copy'})],
        }),
      (error: unknown) =>
        error instanceof IngestAppScanError &&
        error.code === 'invalid-argument' &&
        error.message.includes('Duplicate package name'),
    );
  });

  it('rejects extra permission fields including riskScore', () => {
    assert.throws(
      () =>
        validateIngestAppScanRequest({
          apps: [{...validApp(), permissions: [{...validPermission(), riskScore: 99}]}],
        }),
      (error: unknown) =>
        error instanceof IngestAppScanError &&
        error.code === 'invalid-argument' &&
        error.message.includes('riskScore'),
    );
  });

  it('rejects riskLevel', () => {
    assert.throws(
      () =>
        validateIngestAppScanRequest({
          apps: [{...validApp(), permissions: [{...validPermission(), riskLevel: 'High'}]}],
        }),
      (error: unknown) => error instanceof IngestAppScanError && error.message.includes('riskLevel'),
    );
  });

  it('rejects invalid permission type', () => {
    assert.throws(
      () =>
        validateIngestAppScanRequest({
          apps: [{...validApp(), permissions: [{...validPermission(), consentifyType: 'sms'}]}],
        }),
      (error: unknown) => error instanceof IngestAppScanError && error.code === 'invalid-argument',
    );
  });

  it('rejects invalid permission status', () => {
    assert.throws(
      () =>
        validateIngestAppScanRequest({
          apps: [{...validApp(), permissions: [{...validPermission(), status: 'allowed'}]}],
        }),
      (error: unknown) => error instanceof IngestAppScanError && error.code === 'invalid-argument',
    );
  });

  it('rejects path-like package names', () => {
    assert.throws(
      () => assertAndroidPackageName('users/other/apps/com.example.maps'),
      (error: unknown) => error instanceof IngestAppScanError && error.code === 'invalid-argument',
    );
    assert.throws(
      () => assertAndroidPackageName('../com.example.maps'),
      (error: unknown) => error instanceof IngestAppScanError,
    );
    assert.throws(
      () => assertAndroidPackageName('com..example'),
      (error: unknown) => error instanceof IngestAppScanError,
    );
  });

  it('rejects oversized app lists', () => {
    const apps = Array.from({length: INGEST_LIMITS.apps.maxItems + 1}, (_, index) =>
      validApp({packageName: `com.example.app${index}`}),
    );
    assert.throws(
      () => validateIngestAppScanRequest({apps}),
      (error: unknown) => error instanceof IngestAppScanError && error.code === 'invalid-argument',
    );
  });

  it('rejects oversized permission lists', () => {
    assert.throws(
      () =>
        validateIngestAppScanRequest({
          apps: [
            validApp({
              permissions: Array.from({length: INGEST_LIMITS.permissions.maxItems + 1}, (_, index) =>
                validPermission({consentifyType: index === 0 ? 'location' : 'other', label: `P${index}`}),
              ),
            }),
          ],
        }),
      (error: unknown) => error instanceof IngestAppScanError && error.code === 'invalid-argument',
    );
  });

  it('rejects oversized strings', () => {
    assert.throws(
      () => validateIngestAppScanRequest({apps: [validApp({appName: 'A'.repeat(81)})]}),
      (error: unknown) => error instanceof IngestAppScanError && error.code === 'invalid-argument',
    );
  });

  it('rejects empty appName and invalid backgroundAccess', () => {
    assert.throws(
      () => validateIngestAppScanRequest({apps: [validApp({appName: ''})]}),
      (error: unknown) => error instanceof IngestAppScanError && error.code === 'invalid-argument',
    );
    assert.throws(
      () =>
        validateIngestAppScanRequest({
          apps: [{...validApp(), permissions: [{...validPermission(), backgroundAccess: 'true'}]}],
        }),
      (error: unknown) => error instanceof IngestAppScanError && error.code === 'invalid-argument',
    );
  });
});

describe('handleIngestAppScan', () => {
  it('rejects unauthenticated requests', async () => {
    await assert.rejects(
      () => ingest(validRequest(), {uid: null}),
      (error: unknown) => error instanceof IngestAppScanError && error.code === 'unauthenticated',
    );
  });

  it('accepts a valid authenticated scan', async () => {
    const {result, store} = await ingest(validRequest());
    assert.equal(result.writtenAppCount, 1);
    assert.equal(store.writes.length, 1);
  });

  it('maps a valid app onto the UserApp allowlist', async () => {
    const {store} = await ingest(validRequest());
    const written = store.writes[0].data;
    assert.equal(written.ownerUid, 'user-1');
    assert.equal(written.packageName, 'com.example.maps');
    assert.equal(written.name, 'Maps');
    assert.equal(written.status, 'installed');
    assert.equal(written.category, 'other');
    assert.deepEqual(written.permissions, [
      {
        type: 'location',
        label: 'Location',
        status: 'granted',
        backgroundAccess: true,
        lastUsedAt: null,
      },
    ]);
    assert.equal('risk' in written, false);
    assert.equal('riskScore' in written, false);
    assert.equal('privacyScore' in written, false);
    assert.equal(JSON.stringify(written).includes('android.permission'), false);
  });

  it('uses auth uid as ownerUid and packageName as document id', async () => {
    const {store} = await ingest(validRequest(), {uid: 'verified-uid'});
    assert.equal(store.writes[0].uid, 'verified-uid');
    assert.equal(store.writes[0].packageName, 'com.example.maps');
    assert.equal(store.writes[0].data.ownerUid, 'verified-uid');
  });

  it('updates the same document on repeated scans and preserves createdAt', async () => {
    const store = new MemoryStore();
    store.docs.set('user-1/com.example.maps', {
      ownerUid: 'user-1',
      name: 'Old Maps',
      createdAt: 'OLD_CREATED',
      category: 'tools',
      icon: 'map',
    });

    await ingest(
      {apps: [validApp({appName: 'Maps'})]},
      {store},
    );
    await ingest(
      {apps: [validApp({appName: 'Maps Reloaded'})]},
      {store},
    );

    assert.equal(store.writes.length, 2);
    assert.equal(store.writes[0].data.createdAt, 'OLD_CREATED');
    assert.equal(store.writes[1].data.createdAt, 'OLD_CREATED');
    assert.equal(store.writes[1].data.name, 'Maps Reloaded');
    assert.equal(store.writes[1].data.category, 'tools');
    assert.equal(store.writes[1].packageName, 'com.example.maps');
  });

  it('uses server timestamps', async () => {
    const {store} = await ingest(validRequest());
    const written = store.writes[0].data;
    assert.equal(written.createdAt, SERVER_TS);
    assert.equal(written.updatedAt, SERVER_TS);
    assert.equal(written.lastScannedAt, SERVER_TS);
  });

  it('writes multiple apps in one scan', async () => {
    const {result, store} = await ingest({
      apps: [
        validApp({packageName: 'com.example.maps', appName: 'Maps'}),
        validApp({
          packageName: 'com.example.camera',
          appName: 'Camera',
          permissions: [validPermission({consentifyType: 'camera', label: 'Camera', backgroundAccess: false})],
        }),
      ],
    });
    assert.equal(result.writtenAppCount, 2);
    assert.deepEqual(
      store.writes.map((write) => write.packageName),
      ['com.example.maps', 'com.example.camera'],
    );
  });

  it('maps firestore write failures to a controlled error', async () => {
    const store = new MemoryStore();
    store.failWrite = true;
    await assert.rejects(
      () => ingest(validRequest(), {store}),
      (error: unknown) =>
        error instanceof IngestAppScanError &&
        error.code === 'internal' &&
        error.message === INGEST_SAFE_UNAVAILABLE &&
        !error.message.includes('exploded'),
    );
  });

  it('enforces batch-size protection below Firestore limits', async () => {
    const apps = Array.from({length: INGEST_LIMITS.apps.maxItems}, (_, index) =>
      validApp({packageName: `com.example.app${index}`}),
    );
    const {result} = await ingest({apps});
    assert.equal(result.writtenAppCount, INGEST_LIMITS.apps.maxItems);

    await assert.rejects(
      () =>
        ingest({
          apps: [...apps, validApp({packageName: 'com.example.overflow'})],
        }),
      (error: unknown) => error instanceof IngestAppScanError && error.code === 'invalid-argument',
    );
  });
});

describe('removed-app synchronization', () => {
  it('uploads a new app as installed', async () => {
    const {result, store} = await ingest(validRequest());
    assert.equal(result.uploadedCount, 1);
    assert.equal(result.writtenAppCount, 1);
    assert.equal(result.markedRemovedCount, 0);
    assert.equal(result.restoredCount, 0);
    assert.equal(stored(store, 'com.example.maps')?.status, 'installed');
  });

  it('keeps an existing installed app installed when it is scanned again', async () => {
    const store = new MemoryStore();
    seedApp(store, 'com.example.maps', {name: 'Maps'});
    const {result} = await ingest(validRequest(), {store});
    assert.equal(result.uploadedCount, 1);
    assert.equal(result.markedRemovedCount, 0);
    assert.equal(result.restoredCount, 0);
    assert.equal(stored(store, 'com.example.maps')?.status, 'installed');
    assert.equal(stored(store, 'com.example.maps')?.createdAt, 'OLD_CREATED');
  });

  it('marks a missing previously installed app as removed', async () => {
    const store = new MemoryStore();
    seedApp(store, 'com.example.maps');
    seedApp(store, 'com.example.camera', {name: 'Camera'});
    const {result} = await ingest(validRequest(), {store});
    assert.equal(result.uploadedCount, 1);
    assert.equal(result.markedRemovedCount, 1);
    assert.equal(result.restoredCount, 0);
    assert.equal(stored(store, 'com.example.maps')?.status, 'installed');
    assert.equal(stored(store, 'com.example.camera')?.status, 'removed');
    assert.equal(stored(store, 'com.example.camera')?.createdAt, 'OLD_CREATED');
    assert.equal(stored(store, 'com.example.camera')?.name, 'Camera');
    assert.equal(stored(store, 'com.example.camera')?.updatedAt, SERVER_TS);
    assert.equal(store.docs.has(store.key('user-1', 'com.example.camera')), true);
  });

  it('leaves a previously removed app removed when it is still absent', async () => {
    const store = new MemoryStore();
    seedApp(store, 'com.example.maps');
    seedApp(store, 'com.example.camera', {status: 'removed', name: 'Camera'});
    const {result} = await ingest(validRequest(), {store});
    assert.equal(result.markedRemovedCount, 0);
    assert.equal(result.restoredCount, 0);
    assert.equal(stored(store, 'com.example.camera')?.status, 'removed');
    assert.equal(stored(store, 'com.example.camera')?.createdAt, 'OLD_CREATED');
    assert.equal(stored(store, 'com.example.camera')?.updatedAt, 'OLD_UPDATED');
  });

  it('restores a previously removed app when it is scanned again', async () => {
    const store = new MemoryStore();
    seedApp(store, 'com.example.maps', {status: 'removed', name: 'Old Maps'});
    const {result} = await ingest({apps: [validApp({appName: 'Maps'})]}, {store});
    assert.equal(result.uploadedCount, 1);
    assert.equal(result.restoredCount, 1);
    assert.equal(result.markedRemovedCount, 0);
    assert.equal(stored(store, 'com.example.maps')?.status, 'installed');
    assert.equal(stored(store, 'com.example.maps')?.name, 'Maps');
    assert.equal(stored(store, 'com.example.maps')?.createdAt, 'OLD_CREATED');
  });

  it('does not list or mutate apps for an empty scan', async () => {
    const store = new MemoryStore();
    seedApp(store, 'com.example.maps');
    seedApp(store, 'com.example.camera');
    const {result} = await ingest({apps: []}, {store});
    assert.deepEqual(result, {
      writtenAppCount: 0,
      uploadedCount: 0,
      markedRemovedCount: 0,
      restoredCount: 0,
    });
    assert.equal(store.listCalls, 0);
    assert.equal(store.writes.length, 0);
    assert.equal(stored(store, 'com.example.maps')?.status, 'installed');
    assert.equal(stored(store, 'com.example.camera')?.status, 'installed');
  });

  it('rejects a malformed scan before synchronization', async () => {
    const store = new MemoryStore();
    seedApp(store, 'com.example.maps');
    await assert.rejects(
      () => ingest({apps: [validApp({packageName: 'not-a-package'})]}, {store}),
      (error: unknown) => error instanceof IngestAppScanError && error.code === 'invalid-argument',
    );
    assert.equal(store.listCalls, 0);
    assert.equal(store.writes.length, 0);
    assert.equal(stored(store, 'com.example.maps')?.status, 'installed');
  });

  it('rejects unauthenticated requests before synchronization', async () => {
    const store = new MemoryStore();
    seedApp(store, 'com.example.maps');
    await assert.rejects(
      () => ingest(validRequest(), {uid: null, store}),
      (error: unknown) => error instanceof IngestAppScanError && error.code === 'unauthenticated',
    );
    assert.equal(store.listCalls, 0);
    assert.equal(store.writes.length, 0);
  });

  it('ignores client-supplied ownerUid and writes auth uid', async () => {
    const {store} = await ingest(validRequest(), {uid: 'verified-uid'});
    assert.equal(stored(store, 'com.example.maps', 'verified-uid')?.ownerUid, 'verified-uid');
    assert.equal('ownerUid' in (validRequest() as {apps: object[]}), false);
  });

  it('does not accept riskScore, riskLevel, or privacyScore on the request', async () => {
    await assert.rejects(
      () => ingest({...validRequest(), riskScore: 99}),
      (error: unknown) => error instanceof IngestAppScanError && error.message.includes('riskScore'),
    );
    await assert.rejects(
      () => ingest({apps: [{...validApp(), riskLevel: 'High'}]}),
      (error: unknown) => error instanceof IngestAppScanError && error.message.includes('riskLevel'),
    );
    await assert.rejects(
      () => ingest({apps: [{...validApp(), privacyScore: 1}]}),
      (error: unknown) => error instanceof IngestAppScanError && error.message.includes('privacyScore'),
    );
  });

  it('is idempotent when the same non-empty scan is uploaded twice', async () => {
    const store = new MemoryStore();
    seedApp(store, 'com.example.maps');
    seedApp(store, 'com.example.camera', {name: 'Camera'});
    const first = await ingest(validRequest(), {store});
    assert.equal(first.result.markedRemovedCount, 1);
    const second = await ingest(validRequest(), {store});
    assert.equal(second.result.uploadedCount, 1);
    assert.equal(second.result.markedRemovedCount, 0);
    assert.equal(second.result.restoredCount, 0);
    assert.equal(stored(store, 'com.example.camera')?.status, 'removed');
    assert.equal(stored(store, 'com.example.camera')?.createdAt, 'OLD_CREATED');
    assert.equal(stored(store, 'com.example.maps')?.status, 'installed');
  });

  it('preserves createdAt when marking removed and when restoring', async () => {
    const store = new MemoryStore();
    seedApp(store, 'com.example.maps');
    seedApp(store, 'com.example.camera', {name: 'Camera'});
    await ingest(validRequest(), {store});
    assert.equal(stored(store, 'com.example.camera')?.createdAt, 'OLD_CREATED');
    await ingest(
      {
        apps: [
          validApp(),
          validApp({
            packageName: 'com.example.camera',
            appName: 'Camera',
            permissions: [validPermission({consentifyType: 'camera', label: 'Camera', backgroundAccess: false})],
          }),
        ],
      },
      {store},
    );
    assert.equal(stored(store, 'com.example.camera')?.status, 'installed');
    assert.equal(stored(store, 'com.example.camera')?.createdAt, 'OLD_CREATED');
  });

  it('keeps uploaded permission facts engine-compatible', async () => {
    const {store} = await ingest(validRequest());
    const permissions = stored(store, 'com.example.maps')?.permissions;
    assert.deepEqual(permissions, [
      {
        type: 'location',
        label: 'Location',
        status: 'granted',
        backgroundAccess: true,
        lastUsedAt: null,
      },
    ]);
  });

  it('does not calculate or persist risk in the callable result', async () => {
    const store = new MemoryStore();
    seedApp(store, 'com.example.camera');
    const {result} = await ingest(validRequest(), {store});
    assert.deepEqual(Object.keys(result).sort(), [
      'markedRemovedCount',
      'restoredCount',
      'uploadedCount',
      'writtenAppCount',
    ]);
    assert.equal('risk' in result, false);
    for (const write of store.writes) {
      assert.equal('risk' in write.data, false);
      assert.equal('riskScore' in write.data, false);
      assert.equal('riskLevel' in write.data, false);
      assert.equal('privacyScore' in write.data, false);
    }
  });

  it('does not mark web auto-id apps without an Android package name as removed', async () => {
    const store = new MemoryStore();
    store.docs.set(store.key('user-1', 'autoIdWebApp'), {
      ownerUid: 'user-1',
      name: 'Web App',
      packageName: null,
      status: 'connected',
      createdAt: 'WEB_CREATED',
    });
    seedApp(store, 'com.example.camera', {name: 'Camera'});
    const {result} = await ingest(validRequest(), {store});
    assert.equal(result.markedRemovedCount, 1);
    assert.equal(stored(store, 'autoIdWebApp')?.status, 'connected');
    assert.equal(stored(store, 'com.example.camera')?.status, 'removed');
  });

  it('maps list failures to a controlled error without writing', async () => {
    const store = new MemoryStore();
    store.failList = true;
    seedApp(store, 'com.example.maps');
    await assert.rejects(
      () => ingest(validRequest(), {store}),
      (error: unknown) =>
        error instanceof IngestAppScanError &&
        error.code === 'internal' &&
        error.message === INGEST_SAFE_UNAVAILABLE,
    );
    assert.equal(store.writes.length, 0);
  });

  it('does not mutate another user\'s apps during synchronization', async () => {
    const store = new MemoryStore();
    seedApp(store, 'com.example.other', {name: 'Other'}, 'user-2');
    seedApp(store, 'com.example.camera', {name: 'Camera'}, 'user-1');
    const {result} = await ingest(validRequest(), {store, uid: 'user-1'});
    assert.equal(result.markedRemovedCount, 1);
    assert.equal(stored(store, 'com.example.camera')?.status, 'removed');
    assert.equal(stored(store, 'com.example.other', 'user-2')?.status, 'installed');
    assert.equal(stored(store, 'com.example.other', 'user-2')?.createdAt, 'OLD_CREATED');
    assert.equal(store.writes.every((write) => write.uid === 'user-1'), true);
  });
});

import {
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {userAppDocRef, userAppsCollectionRef} from '../lib/collections';
import {toFirestoreServiceError} from '../lib/firestoreErrors';
import {assertSameOwner, requireUserId} from '../lib/owner';
import type {UserApp} from '../types';
import {readAppFields, serializePermissions} from './mappers';

export type UserAppWrite = Omit<UserApp, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'> & {
  id?: string;
  ownerUid?: string;
};

function toUserApp(id: string, ownerUid: string, data: unknown): UserApp {
  return {
    id,
    ownerUid,
    ...readAppFields(data),
  };
}

function resolveAppId(uid: string, app: UserAppWrite): string {
  const explicitId = app.id?.trim();
  if (explicitId) {
    return explicitId;
  }

  const packageName = app.packageName?.trim();
  if (packageName) {
    return packageName;
  }

  return doc(userAppsCollectionRef(uid)).id;
}

export async function getUserApps(uid: string): Promise<UserApp[]> {
  const ownerUid = requireUserId(uid);

  try {
    const snapshot = await getDocs(userAppsCollectionRef(ownerUid));
    return snapshot.docs.map((item) => toUserApp(item.id, ownerUid, item.data()));
  } catch (error) {
    throw toFirestoreServiceError(error);
  }
}

export function subscribeUserApps(
  uid: string,
  onApps: (apps: UserApp[]) => void,
  onError: (error: Error) => void,
): () => void {
  const ownerUid = requireUserId(uid);

  try {
    return onSnapshot(
      userAppsCollectionRef(ownerUid),
      (snapshot) => {
        const apps = snapshot.docs.map((item) =>
          toUserApp(item.id, ownerUid, item.data()),
        );

        onApps(apps);
      },
      (error) => {
        onError(toFirestoreServiceError(error));
      },
    );
  } catch (error) {
    onError(toFirestoreServiceError(error));
    return () => {};
  }
}

export async function getUserApp(uid: string, appId: string): Promise<UserApp | null> {
  const ownerUid = requireUserId(uid);

  try {
    const snapshot = await getDoc(userAppDocRef(ownerUid, appId));
    if (!snapshot.exists()) {
      return null;
    }

    return toUserApp(snapshot.id, ownerUid, snapshot.data());
  } catch (error) {
    throw toFirestoreServiceError(error);
  }
}

export async function createUserApp(uid: string, app: UserAppWrite): Promise<UserApp> {
  const ownerUid = requireUserId(uid);
  assertSameOwner(ownerUid, app.ownerUid);

  const appId = resolveAppId(ownerUid, app);
  const ref = userAppDocRef(ownerUid, appId);

  try {
    const existing = await getDoc(ref);
    if (existing.exists()) {
      throw new Error('An app with this id already exists.');
    }

    await setDoc(ref, {
      ownerUid,
      name: app.name,
      packageName: app.packageName,
      category: app.category,
      icon: app.icon,
      status: app.status,
      risk: app.risk,
      permissions: serializePermissions(app.permissions),
      lastScannedAt: app.lastScannedAt,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const created = await getUserApp(ownerUid, appId);
    if (!created) {
      throw new Error('Unable to complete this request. Please try again.');
    }

    return created;
  } catch (error) {
    throw toFirestoreServiceError(error);
  }
}

export async function updateUserApp(
  uid: string,
  appId: string,
  updates: Partial<UserAppWrite>,
): Promise<void> {
  const ownerUid = requireUserId(uid);
  assertSameOwner(ownerUid, updates.ownerUid);

  const payload: Record<string, unknown> = {
    ownerUid,
    updatedAt: serverTimestamp(),
  };

  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.packageName !== undefined) payload.packageName = updates.packageName;
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.icon !== undefined) payload.icon = updates.icon;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.risk !== undefined) payload.risk = updates.risk;
  if (updates.permissions !== undefined) payload.permissions = serializePermissions(updates.permissions);
  if (updates.lastScannedAt !== undefined) payload.lastScannedAt = updates.lastScannedAt;

  try {
    await updateDoc(userAppDocRef(ownerUid, appId), payload);
  } catch (error) {
    throw toFirestoreServiceError(error);
  }
}

export async function deleteUserApp(uid: string, appId: string): Promise<void> {
  const ownerUid = requireUserId(uid);

  try {
    await deleteDoc(userAppDocRef(ownerUid, appId));
  } catch (error) {
    throw toFirestoreServiceError(error);
  }
}

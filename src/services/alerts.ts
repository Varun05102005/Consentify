import {deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc} from 'firebase/firestore';
import {userAlertDocRef, userAlertsCollectionRef} from '../lib/collections';
import {toFirestoreServiceError} from '../lib/firestoreErrors';
import {assertSameOwner, requireUserId} from '../lib/owner';
import type {UserAlert} from '../types';
import {readAlertFields} from './mappers';

export type UserAlertWrite = Omit<UserAlert, 'id' | 'ownerUid' | 'createdAt' | 'readAt' | 'resolvedAt'> & {
  id?: string;
  ownerUid?: string;
};

function toUserAlert(id: string, ownerUid: string, data: unknown): UserAlert {
  return {
    id,
    ownerUid,
    ...readAlertFields(data),
  };
}

function resolveAlertId(uid: string, alert: UserAlertWrite): string {
  const explicitId = alert.id?.trim();
  if (explicitId) {
    return explicitId;
  }

  return doc(userAlertsCollectionRef(uid)).id;
}

export async function getUserAlerts(uid: string): Promise<UserAlert[]> {
  const ownerUid = requireUserId(uid);

  try {
    const snapshot = await getDocs(userAlertsCollectionRef(ownerUid));
    return snapshot.docs
      .map((item) => toUserAlert(item.id, ownerUid, item.data()))
      .sort((left, right) => {
        const leftTime = left.createdAt?.getTime() ?? 0;
        const rightTime = right.createdAt?.getTime() ?? 0;
        return rightTime - leftTime;
      });
  } catch (error) {
    throw toFirestoreServiceError(error);
  }
}

export async function getUserAlert(uid: string, alertId: string): Promise<UserAlert | null> {
  const ownerUid = requireUserId(uid);

  try {
    const snapshot = await getDoc(userAlertDocRef(ownerUid, alertId));
    if (!snapshot.exists()) {
      return null;
    }

    return toUserAlert(snapshot.id, ownerUid, snapshot.data());
  } catch (error) {
    throw toFirestoreServiceError(error);
  }
}

export async function createUserAlert(uid: string, alert: UserAlertWrite): Promise<UserAlert> {
  const ownerUid = requireUserId(uid);
  assertSameOwner(ownerUid, alert.ownerUid);

  const alertId = resolveAlertId(ownerUid, alert);
  const ref = userAlertDocRef(ownerUid, alertId);

  try {
    const existing = await getDoc(ref);
    if (existing.exists()) {
      throw new Error('An alert with this id already exists.');
    }

    await setDoc(ref, {
      ownerUid,
      appId: alert.appId,
      appName: alert.appName,
      permissionType: alert.permissionType,
      permissionLabel: alert.permissionLabel,
      title: alert.title,
      description: alert.description,
      severity: alert.severity,
      status: alert.status,
      createdAt: serverTimestamp(),
      readAt: alert.status === 'read' ? serverTimestamp() : null,
      resolvedAt: alert.status === 'resolved' ? serverTimestamp() : null,
    });

    const created = await getUserAlert(ownerUid, alertId);
    if (!created) {
      throw new Error('Unable to complete this request. Please try again.');
    }

    return created;
  } catch (error) {
    throw toFirestoreServiceError(error);
  }
}

export async function updateUserAlert(
  uid: string,
  alertId: string,
  updates: Partial<UserAlertWrite>,
): Promise<void> {
  const ownerUid = requireUserId(uid);
  assertSameOwner(ownerUid, updates.ownerUid);

  const payload: Record<string, unknown> = {
    ownerUid,
  };

  if (updates.appId !== undefined) payload.appId = updates.appId;
  if (updates.appName !== undefined) payload.appName = updates.appName;
  if (updates.permissionType !== undefined) payload.permissionType = updates.permissionType;
  if (updates.permissionLabel !== undefined) payload.permissionLabel = updates.permissionLabel;
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.severity !== undefined) payload.severity = updates.severity;
  if (updates.status !== undefined) {
    payload.status = updates.status;
    if (updates.status === 'read') {
      payload.readAt = serverTimestamp();
    }
    if (updates.status === 'resolved') {
      payload.resolvedAt = serverTimestamp();
    }
  }

  try {
    await updateDoc(userAlertDocRef(ownerUid, alertId), payload);
  } catch (error) {
    throw toFirestoreServiceError(error);
  }
}

export async function deleteUserAlert(uid: string, alertId: string): Promise<void> {
  const ownerUid = requireUserId(uid);

  try {
    await deleteDoc(userAlertDocRef(ownerUid, alertId));
  } catch (error) {
    throw toFirestoreServiceError(error);
  }
}

/**
 * Firestore collection names, document paths, and typed references.
 * All user-owned data is nested under users/{uid}.
 * Authorization is enforced by Firestore rules on request.auth.uid.
 */

import {collection, doc, type CollectionReference, type DocumentReference} from 'firebase/firestore';
import {db} from './firebase';
import {requireUserId} from './owner';

export const USERS_COLLECTION = 'users';
export const APPS_COLLECTION = 'apps';
export const ALERTS_COLLECTION = 'alerts';

export function userDocPath(uid: string): readonly [string, string] {
  return [USERS_COLLECTION, requireUserId(uid)];
}

export function userAppsPath(uid: string): readonly [string, string, string] {
  const userId = requireUserId(uid);
  return [USERS_COLLECTION, userId, APPS_COLLECTION];
}

export function userAppPath(uid: string, appId: string): readonly [string, string, string, string] {
  const userId = requireUserId(uid);
  const id = appId.trim();
  if (!id) {
    throw new Error('An app id is required.');
  }
  return [USERS_COLLECTION, userId, APPS_COLLECTION, id];
}

export function userAlertsPath(uid: string): readonly [string, string, string] {
  const userId = requireUserId(uid);
  return [USERS_COLLECTION, userId, ALERTS_COLLECTION];
}

export function userAlertPath(uid: string, alertId: string): readonly [string, string, string, string] {
  const userId = requireUserId(uid);
  const id = alertId.trim();
  if (!id) {
    throw new Error('An alert id is required.');
  }
  return [USERS_COLLECTION, userId, ALERTS_COLLECTION, id];
}

export function userDocRef(uid: string): DocumentReference {
  return doc(db, ...userDocPath(uid));
}

export function userAppsCollectionRef(uid: string): CollectionReference {
  return collection(db, ...userAppsPath(uid));
}

export function userAppDocRef(uid: string, appId: string): DocumentReference {
  return doc(db, ...userAppPath(uid, appId));
}

export function userAlertsCollectionRef(uid: string): CollectionReference {
  return collection(db, ...userAlertsPath(uid));
}

export function userAlertDocRef(uid: string, alertId: string): DocumentReference {
  return doc(db, ...userAlertPath(uid, alertId));
}

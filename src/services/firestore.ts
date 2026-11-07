import {getDoc, serverTimestamp, setDoc} from 'firebase/firestore';
import {userDocRef} from '../lib/collections';
import {toFirestoreServiceError} from '../lib/firestoreErrors';
import {requireUserId} from '../lib/owner';
import {toDate} from '../lib/timestamps';
import type {UserProfile} from '../types';

export type UserProfileWrite = Pick<UserProfile, 'email' | 'displayName'>;

function toUserProfile(id: string, data: Record<string, unknown>): UserProfile {
  return {
    uid: typeof data.uid === 'string' ? data.uid : id,
    email: typeof data.email === 'string' ? data.email : null,
    displayName: typeof data.displayName === 'string' ? data.displayName : null,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const ownerUid = requireUserId(uid);

  try {
    const snapshot = await getDoc(userDocRef(ownerUid));
    if (!snapshot.exists()) {
      return null;
    }

    return toUserProfile(snapshot.id, snapshot.data() as Record<string, unknown>);
  } catch (error) {
    throw toFirestoreServiceError(error);
  }
}

export async function saveUserProfile(uid: string, data: UserProfileWrite): Promise<void> {
  const ownerUid = requireUserId(uid);
  const ref = userDocRef(ownerUid);

  try {
    const existing = await getDoc(ref);

    await setDoc(
      ref,
      {
        uid: ownerUid,
        email: data.email,
        displayName: data.displayName,
        updatedAt: serverTimestamp(),
        ...(existing.exists() ? {} : {createdAt: serverTimestamp()}),
      },
      {merge: true},
    );
  } catch (error) {
    throw toFirestoreServiceError(error);
  }
}

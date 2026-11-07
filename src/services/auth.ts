import {FirebaseError} from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type Unsubscribe,
  type User,
} from 'firebase/auth';
import {auth} from '../lib/firebase';
import {saveUserProfile} from './firestore';

export type {User};

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/missing-email': 'Enter a valid email address.',
  'auth/missing-password': 'Enter your password.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/invalid-login-credentials': 'Incorrect email or password.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/too-many-requests': 'Too many attempts. Try again later.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/operation-not-allowed': 'Email sign-in is not available right now.',
};

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError && AUTH_ERROR_MESSAGES[error.code]) {
    return AUTH_ERROR_MESSAGES[error.code];
  }

  return 'Unable to complete sign-in. Please try again.';
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signUpWithEmail(email: string, password: string): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function registerWithEmail(email: string, password: string): Promise<User> {
  const user = await signUpWithEmail(email, password);
  await saveUserProfile(user.uid, {
    email: user.email,
    displayName: user.displayName,
  });
  return user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export function observeAuthState(onChange: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, onChange);
}

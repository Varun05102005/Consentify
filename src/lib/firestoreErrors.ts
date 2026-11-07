import {FirebaseError} from 'firebase/app';

const FIRESTORE_ERROR_MESSAGES: Record<string, string> = {
  'permission-denied': 'You do not have access to this data.',
  'not-found': 'That record could not be found.',
  'unavailable': 'Network error. Check your connection and try again.',
  'deadline-exceeded': 'The request timed out. Please try again.',
  'resource-exhausted': 'Too many requests. Please try again later.',
  'unauthenticated': 'You need to sign in again.',
  'already-exists': 'That record already exists.',
  'failed-precondition': 'Unable to complete this update right now.',
};

export function getFirestoreErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError && FIRESTORE_ERROR_MESSAGES[error.code]) {
    return FIRESTORE_ERROR_MESSAGES[error.code];
  }

  return 'Unable to complete this request. Please try again.';
}

export function toFirestoreServiceError(error: unknown): Error {
  if (error instanceof FirebaseError) {
    return new Error(getFirestoreErrorMessage(error));
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error(getFirestoreErrorMessage(error));
}

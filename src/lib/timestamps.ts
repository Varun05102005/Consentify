import {Timestamp} from 'firebase/firestore';

export function toDate(value: unknown): Date | null {
  if (value == null) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as {toDate?: unknown}).toDate === 'function'
  ) {
    const converted = (value as Timestamp).toDate();
    return converted instanceof Date && !Number.isNaN(converted.getTime()) ? converted : null;
  }

  return null;
}

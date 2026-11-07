export function requireUserId(uid: string): string {
  const trimmed = uid.trim();
  if (!trimmed) {
    throw new Error('A signed-in user is required.');
  }
  return trimmed;
}

export function assertSameOwner(pathUid: string, ownerUid: string | undefined): void {
  if (ownerUid && ownerUid !== pathUid) {
    throw new Error('Cannot write data for another user.');
  }
}

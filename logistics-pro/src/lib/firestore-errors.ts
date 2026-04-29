// This file is deprecated. Firebase has been replaced with the MySQL backend API.
export enum OperationType { GET = 'GET', CREATE = 'CREATE', WRITE = 'WRITE', DELETE = 'DELETE' }
export function handleFirestoreError(err: any, op: OperationType, path: string) {
  console.warn(`[Deprecated] Firestore error handler called for ${op} on ${path}:`, err?.message);
}

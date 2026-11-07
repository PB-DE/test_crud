import { AssetRecord } from './types';

// Re-export filter & log utilities for unified UI helper access (including findAssetByCode)
export * from './filter-utils';

/**
 * Sanitizes raw QR code payload by trimming surrounding whitespace and newlines.
 */
export function cleanQrPayload(raw: string): string {
  return (raw || '').trim();
}

/**
 * Reconciles asset records list with a newly saved or updated record:
 * - If saved.id already exists in prev, replaces that record in-place.
 * - Otherwise, prepends the new record to the list.
 */
export function reconcileAssetRecords(
  prev: AssetRecord[] | undefined | null,
  saved: AssetRecord
): AssetRecord[] {
  const safePrev = Array.isArray(prev) ? prev : [];
  const exists = safePrev.some((r) => r.id === saved.id);
  if (exists) {
    return safePrev.map((r) => (r.id === saved.id ? saved : r));
  }
  return [saved, ...safePrev];
}



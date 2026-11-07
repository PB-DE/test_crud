import { AssetRecord } from './types';

// Re-export filter & log utilities for unified UI helper access
export * from './filter-utils';

/**
 * Searches for an existing asset record by assetCode, ignoring case and leading/trailing whitespace.
 * Returns the matching AssetRecord or null if not found.
 */
export function findAssetByCode(
  code: string,
  records?: AssetRecord[] | null
): AssetRecord | null {
  if (!code || !records || !Array.isArray(records)) {
    return null;
  }
  const cleanCode = code.trim().toLowerCase();
  if (!cleanCode) {
    return null;
  }
  const found = records.find(
    (r) => (r.assetCode || '').trim().toLowerCase() === cleanCode
  );
  return found || null;
}

/**
 * Sanitizes raw QR code payload by trimming surrounding whitespace and newlines.
 */
export function cleanQrPayload(raw: string): string {
  return (raw || '').trim();
}


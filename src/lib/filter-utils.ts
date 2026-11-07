import { AssetRecord } from './types';

export type SortField =
  | 'id'
  | 'assetCode'
  | 'name'
  | 'location'
  | 'status'
  | 'responsiblePerson'
  | 'recordedBy'
  | 'notes'
  | 'createdAt'
  | 'updatedAt';

export type SortDirection = 'asc' | 'desc';

/**
 * Filter records by search query (matching assetCode, name, location, responsiblePerson, recordedBy, or notes case-insensitively)
 * and optional status filter tag ('All', 'ทั้งหมด', or specific status).
 */
export function filterRecords(
  records: AssetRecord[],
  query: string,
  statusFilter: string
): AssetRecord[] {
  const normalizedQuery = query.trim().toLowerCase();
  const isAllStatus = !statusFilter || statusFilter === 'All' || statusFilter === 'ทั้งหมด';

  return records.filter((record) => {
    // Status filter
    if (!isAllStatus && (record.status || '') !== statusFilter) {
      return false;
    }

    // Search query
    if (normalizedQuery.length === 0) {
      return true;
    }

    const assetCodeMatch = (record.assetCode || '').toLowerCase().includes(normalizedQuery);
    const nameMatch = (record.name || '').toLowerCase().includes(normalizedQuery);
    const locationMatch = (record.location || '').toLowerCase().includes(normalizedQuery);
    const responsibleMatch = (record.responsiblePerson || '').toLowerCase().includes(normalizedQuery);
    const recordedByMatch = (record.recordedBy || '').toLowerCase().includes(normalizedQuery);
    const notesMatch = (record.notes || '').toLowerCase().includes(normalizedQuery);

    return (
      assetCodeMatch ||
      nameMatch ||
      locationMatch ||
      responsibleMatch ||
      recordedByMatch ||
      notesMatch
    );
  });
}

/**
 * Sorts records by specified field and direction without mutating the original array.
 */
export function sortRecords(
  records: AssetRecord[],
  field: SortField,
  direction: SortDirection = 'asc'
): AssetRecord[] {
  const sorted = [...records];
  const multiplier = direction === 'desc' ? -1 : 1;

  sorted.sort((a, b) => {
    const valA = a[field] ?? '';
    const valB = b[field] ?? '';

    // Handle date comparisons
    if (field === 'createdAt' || field === 'updatedAt') {
      const timeA = new Date(valA).getTime() || 0;
      const timeB = new Date(valB).getTime() || 0;
      return (timeA - timeB) * multiplier;
    }

    // String locale comparison case-insensitively
    return (
      String(valA).localeCompare(String(valB), undefined, {
        sensitivity: 'base',
        numeric: true,
      }) * multiplier
    );
  });

  return sorted;
}

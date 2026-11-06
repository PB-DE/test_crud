import { RecordItem } from './types';

export type SortField = 'id' | 'name' | 'email' | 'role' | 'status' | 'notes' | 'createdAt' | 'updatedAt';
export type SortDirection = 'asc' | 'desc';

/**
 * Filter records by search query (matching name, email, role, or notes case-insensitively)
 * and optional status filter tag ('All' or specific status).
 */
export function filterRecords(
  records: RecordItem[],
  query: string,
  statusFilter: string
): RecordItem[] {
  const normalizedQuery = query.trim().toLowerCase();
  const shouldFilterStatus = Boolean(statusFilter && statusFilter !== 'All');

  return records.filter((record) => {
    // Status filter
    if (shouldFilterStatus && record.status !== statusFilter) {
      return false;
    }

    // Search query
    if (normalizedQuery.length === 0) {
      return true;
    }

    const nameMatch = record.name.toLowerCase().includes(normalizedQuery);
    const emailMatch = record.email.toLowerCase().includes(normalizedQuery);
    const roleMatch = record.role.toLowerCase().includes(normalizedQuery);
    const notesMatch = (record.notes || '').toLowerCase().includes(normalizedQuery);

    return nameMatch || emailMatch || roleMatch || notesMatch;
  });
}

/**
 * Sorts records by specified field and direction without mutating the original array.
 */
export function sortRecords(
  records: RecordItem[],
  field: SortField,
  direction: SortDirection = 'asc'
): RecordItem[] {
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

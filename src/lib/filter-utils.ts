import { AssetRecord, AssetLogRecord, LogAction } from './types';

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

export interface ActionBadgeStyle {
  bg: string;
  text: string;
  border: string;
  dot: string;
  label: string;
}

/**
 * Returns visual styling tokens for change log action badges.
 */
export function getActionBadgeStyle(action: LogAction | string): ActionBadgeStyle {
  switch (action) {
    case 'บันทึกรายการใหม่':
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200/80',
        dot: 'bg-emerald-500',
        label: 'บันทึกรายการใหม่',
      };
    case 'แก้ไข/ย้ายตำแหน่ง':
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200/80',
        dot: 'bg-blue-500',
        label: 'แก้ไข/ย้ายตำแหน่ง',
      };
    case 'ลบรายการ':
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200/80',
        dot: 'bg-rose-500',
        label: 'ลบรายการ',
      };
    default:
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-200',
        dot: 'bg-slate-400',
        label: typeof action === 'string' ? action : '',
      };
  }
}

/**
 * Formats ISO timestamp to Thai locale datetime (e.g. 7 พ.ย. 2569, 10:30).
 */
export function formatLogDateTime(dateString?: string): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

/**
 * Filters change logs in real-time matching across assetCode, name, action,
 * location changes, responsible person changes, status changes, summary, recordedBy, and notes.
 */
export function filterLogs(logs: AssetLogRecord[], query: string): AssetLogRecord[] {
  const normalizedQuery = (query || '').trim().toLowerCase();
  if (normalizedQuery.length === 0) {
    return logs;
  }

  return logs.filter((log) => {
    const assetCodeMatch = (log.assetCode || '').toLowerCase().includes(normalizedQuery);
    const nameMatch = (log.name || '').toLowerCase().includes(normalizedQuery);
    const actionMatch = (log.action || '').toLowerCase().includes(normalizedQuery);
    const locationMatch = (log.locationChange || '').toLowerCase().includes(normalizedQuery);
    const responsibleMatch = (log.responsibleChange || '').toLowerCase().includes(normalizedQuery);
    const statusMatch = (log.statusChange || '').toLowerCase().includes(normalizedQuery);
    const summaryMatch = (log.changeSummary || '').toLowerCase().includes(normalizedQuery);
    const recordedByMatch = (log.recordedBy || '').toLowerCase().includes(normalizedQuery);
    const notesMatch = (log.notes || '').toLowerCase().includes(normalizedQuery);

    return (
      assetCodeMatch ||
      nameMatch ||
      actionMatch ||
      locationMatch ||
      responsibleMatch ||
      statusMatch ||
      summaryMatch ||
      recordedByMatch ||
      notesMatch
    );
  });
}

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


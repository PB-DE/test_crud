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
  | 'mainCategory'
  | 'subCategory'
  | 'acquisitionDate'
  | 'unitPrice'
  | 'budgetSource'
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
    const mainCategoryMatch = (record.mainCategory || '').toLowerCase().includes(normalizedQuery);
    const subCategoryMatch = (record.subCategory || '').toLowerCase().includes(normalizedQuery);
    const budgetSourceMatch = (record.budgetSource || '').toLowerCase().includes(normalizedQuery);

    return (
      assetCodeMatch ||
      nameMatch ||
      locationMatch ||
      responsibleMatch ||
      recordedByMatch ||
      notesMatch ||
      mainCategoryMatch ||
      subCategoryMatch ||
      budgetSourceMatch
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

    // Handle numeric comparisons for unitPrice
    if (field === 'unitPrice') {
      const numA = typeof a.unitPrice === 'number' ? a.unitPrice : -1;
      const numB = typeof b.unitPrice === 'number' ? b.unitPrice : -1;
      return (numA - numB) * multiplier;
    }

    // Handle date comparisons
    if (field === 'createdAt' || field === 'updatedAt' || field === 'acquisitionDate') {
      const timeA = parseFlexibleDate(String(valA))?.getTime() ?? 0;
      const timeB = parseFlexibleDate(String(valB))?.getTime() ?? 0;
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
    case 'ตรวจเช็กครุภัณฑ์':
      return {
        bg: 'bg-teal-50',
        text: 'text-teal-700',
        border: 'border-teal-200/80',
        dot: 'bg-teal-500',
        label: 'ตรวจเช็กครุภัณฑ์',
      };
    case 'จำหน่าย/ตัดบัญชี':
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200/80',
        dot: 'bg-rose-500',
        label: 'จำหน่าย/ตัดบัญชี',
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
 * Parses ISO timestamps, YYYY-MM-DD, and DD/MM/YYYY (including Thai Buddhist Era years >= 2400)
 * into a local/Gregorian Date object without US MM/DD swapping or double +543 year offset.
 */
export function parseFlexibleDate(dateString?: string): Date | null {
  if (!dateString) return null;
  const raw = dateString.trim();
  if (!raw) return null;

  const buildValidatedDate = (adYear: number, month: number, day: number): Date | null => {
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const d = new Date(adYear, month - 1, day);
    if (d.getFullYear() !== adYear || d.getMonth() !== month - 1 || d.getDate() !== day) {
      return null;
    }
    return d;
  };

  // DD/MM/YYYY or D/M/YYYY (e.g. "11/03/2569", "29/2/2567", "30/05/1961")
  const dmyMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    const rawYear = Number(dmyMatch[3]);
    const adYear = rawYear >= 2400 ? rawYear - 543 : rawYear;
    return buildValidatedDate(adYear, month, day);
  }

  // YYYY-MM-DD (e.g. "2026-03-11" from <input type="date"> or "2569-03-11")
  const ymdMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymdMatch) {
    const rawYear = Number(ymdMatch[1]);
    const month = Number(ymdMatch[2]);
    const day = Number(ymdMatch[3]);
    const adYear = rawYear >= 2400 ? rawYear - 543 : rawYear;
    return buildValidatedDate(adYear, month, day);
  }

  try {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/**
 * Formats ISO/calendar/Thai-BE date strings to Thai locale date (e.g. 11 มี.ค. 2569).
 */
export function formatThaiDate(dateString?: string): string {
  if (!dateString) return '—';
  const d = parseFlexibleDate(dateString);
  if (!d) return dateString;
  try {
    return d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Converts ISO/calendar/Thai-BE date strings into YYYY-MM-DD for <input type="date">.
 */
export function toDateInputValue(dateString?: string): string {
  const d = parseFlexibleDate(dateString);
  if (!d) return '';
  const yyyy = String(d.getFullYear()).padStart(4, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Formats ISO timestamp to Thai locale date with 24-hour HH:MM time (e.g. 12 พ.ย. 2569 18:39).
 */
export function formatDateTime24(dateString?: string): string {
  if (!dateString) return '—';
  const d = parseFlexibleDate(dateString);
  if (!d) return dateString;
  try {
    const datePart = d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const timePart = d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${datePart} ${timePart}`;
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


import { Readable } from 'stream';
import { google, sheets_v4 } from 'googleapis';
import { getEnvConfig } from './env';
import {
  AssetRecord,
  CreateAssetInput,
  UpdateAssetInput,
  isValidAssetStatus,
  AssetLogRecord,
  LogAction,
  AssetTransaction,
  TransactionAction,
  DropdownOption,
  DropdownFieldKey,
  FieldSetting,
  ConfigurableFieldKey,
  DEFAULT_FIELD_SETTINGS,
  SystemOptionsPayload,
  UserAccount,
  StoredUserRecord,
  UserRole,
  isValidUserRole,
} from './types';
import { hashPassword } from './password';
import {
  computeAssetDiff,
  normalizeAssetCode,
  projectLatestAssets,
  computeTransactionDiffs,
} from './log-utils';

export { normalizeAssetCode } from './log-utils';

export const HEADER_ROW = [
  'ID',
  'วันเวลาที่ทำรายการ',
  'การกระทำ',
  'รหัสครุภัณฑ์',
  'ชื่อครุภัณฑ์',
  'ตำแหน่งที่ตั้ง',
  'สถานะ',
  'ผู้รับผิดชอบ',
  'ผู้บันทึก',
  'หมายเหตุ',
  'รูปภาพ',
  'ประเภทหลัก',
  'ประเภทย่อย',
  'วันที่ได้มา',
  'ราคา/หน่วย',
  'งบที่ซื้อ',
];

export const RANGE_ALL = 'A:Z';

export const DROPDOWNS_SHEET_NAME = 'Dropdowns';
export const DROPDOWNS_HEADER_ROW = [
  'ID',
  'ประเภทฟิลด์',
  'ค่าตัวเลือก',
  'ประเภทหลักอ้างอิง',
  'วันที่แก้ไข',
];
export const RANGE_DROPDOWNS_ALL = 'Dropdowns!A:E';

export const FIELD_SETTINGS_SHEET_NAME = 'FieldSettings';
export const FIELD_SETTINGS_HEADER_ROW = [
  'FieldKey',
  'ชื่อฟิลด์',
  'บังคับกรอก',
  'ใช้ Dropdown',
  'รองรับ Dropdown',
];
export const RANGE_FIELD_SETTINGS_ALL = 'FieldSettings!A:E';

export const USERS_SHEET_NAME = 'Users';
export const USERS_HEADER_ROW = [
  'ID',
  'Username',
  'PasswordHash',
  'DisplayName',
  'Role',
  'Active',
  'CreatedAt',
  'UpdatedAt',
];
export const RANGE_USERS_ALL = 'Users!A:H';

export const LOG_HEADER_ROW = [
  'Log ID',
  'วันเวลาที่ทำรายการ',
  'การกระทำ',
  'รหัสครุภัณฑ์',
  'ชื่อครุภัณฑ์',
  'ตำแหน่ง (เดิม ➔ ใหม่)',
  'ผู้รับผิดชอบ (เดิม ➔ ใหม่)',
  'สถานะ (เดิม ➔ ใหม่)',
  'สรุปสิ่งที่เปลี่ยนแปลง',
  'ผู้บันทึก',
  'หมายเหตุ',
  'รูปภาพ',
];

export const RANGE_LOGS_ALL = 'Logs!A:L';

const INITIAL_DEMO_TRANSACTIONS: AssetTransaction[] = [
  {
    id: 'rec-demo-001',
    timestamp: '2026-01-15T09:00:00.000Z',
    action: 'บันทึกรายการใหม่',
    assetCode: 'EQ-2026-001',
    name: 'คอมพิวเตอร์ All-in-One Dell OptiPlex 7400',
    location: 'ฝ่ายเทคโนโลยีสารสนเทศ ชั้น 4',
    status: 'พร้อมใช้งาน',
    responsiblePerson: 'นายสมเกียรติ ยั่งยืน',
    recordedBy: 'นางสาววิไลลักษณ์ มั่นคง',
    notes: 'ติดตั้งชุดโปรแกรมสำนักงานและระบบความปลอดภัยครบถ้วน',
  },
  {
    id: 'rec-demo-002',
    timestamp: '2026-02-01T10:30:00.000Z',
    action: 'บันทึกรายการใหม่',
    assetCode: 'EQ-2026-002',
    name: 'เครื่องพิมพ์มัลติฟังก์ชัน HP LaserJet Pro',
    location: 'กองบริหารงานทั่วไป ชั้น 2',
    status: 'กำลังใช้งาน',
    responsiblePerson: 'นางสาวพัชรี นวลจันทร์',
    recordedBy: 'นางสาววิไลลักษณ์ มั่นคง',
    notes: 'ใช้งานส่วนกลางสำหรับพิมพ์เอกสารราชการ',
  },
  {
    id: 'rec-demo-003',
    timestamp: '2026-03-01T08:45:00.000Z',
    action: 'บันทึกรายการใหม่',
    assetCode: 'EQ-2026-003',
    name: 'จอมอนิเตอร์ Dell UltraSharp 27 นิ้ว 4K',
    location: 'ฝ่ายออกแบบและสื่อสิ่งพิมพ์ ชั้น 3',
    status: 'พร้อมใช้งาน',
    responsiblePerson: 'นายอนุรักษ์ รอบรู้',
    recordedBy: 'นายวีระ ศักดิ์ศรี',
    notes: 'รับมอบจอภาพใหม่',
  },
  {
    id: 'rec-demo-003-tx2',
    timestamp: '2026-03-05T11:20:00.000Z',
    action: 'แก้ไข/ย้ายตำแหน่ง',
    assetCode: 'EQ-2026-003',
    name: 'จอมอนิเตอร์ Dell UltraSharp 27 นิ้ว 4K',
    location: 'ฝ่ายออกแบบและสื่อสิ่งพิมพ์ ชั้น 3',
    status: 'ส่งซ่อม',
    responsiblePerson: 'นายอนุรักษ์ รอบรู้',
    recordedBy: 'นายวีระ ศักดิ์ศรี',
    notes: 'ส่งศูนย์ซ่อมเคลมพาเนลหน้าจอ อาการกระพริบ',
  },
  {
    id: 'rec-demo-004',
    timestamp: '2025-11-20T11:00:00.000Z',
    action: 'บันทึกรายการใหม่',
    assetCode: 'EQ-2026-004',
    name: 'เก้าอี้สำนักงานเพื่อสุขภาพ Ergonomic Steelcase',
    location: 'ห้องประชุมผู้บริหาร ชั้น 5',
    status: 'พร้อมใช้งาน',
    responsiblePerson: 'นายประจักษ์ เกียรติดำรง',
    recordedBy: 'นายวีระ ศักดิ์ศรี',
    notes: 'จัดซื้อประจำปี 2568',
  },
  {
    id: 'rec-demo-004-tx2',
    timestamp: '2026-01-05T16:20:00.000Z',
    action: 'จำหน่าย/ตัดบัญชี',
    assetCode: 'EQ-2026-004',
    name: 'เก้าอี้สำนักงานเพื่อสุขภาพ Ergonomic Steelcase',
    location: 'ห้องประชุมผู้บริหาร ชั้น 5',
    status: 'จำหน่าย/ตัดบัญชี',
    responsiblePerson: 'นายประจักษ์ เกียรติดำรง',
    recordedBy: 'นายวีระ ศักดิ์ศรี',
    notes: 'แกนโช๊คชำรุดตามอายุการใช้งาน เกินระยะคุ้มค่าซ่อม',
  },
];

const INITIAL_DEMO_DROPDOWNS: DropdownOption[] = [
  { id: 'opt-mc-1', fieldKey: 'mainCategory', value: 'ครุภัณฑ์สำนักงาน' },
  { id: 'opt-mc-2', fieldKey: 'mainCategory', value: 'ครุภัณฑ์คอมพิวเตอร์' },
  { id: 'opt-mc-3', fieldKey: 'mainCategory', value: 'ครุภัณฑ์ยานพาหนะและขนส่ง' },
  { id: 'opt-sc-1', fieldKey: 'subCategory', value: 'โต๊ะทำงาน', parentValue: 'ครุภัณฑ์สำนักงาน' },
  { id: 'opt-sc-2', fieldKey: 'subCategory', value: 'เก้าอี้สำนักงาน', parentValue: 'ครุภัณฑ์สำนักงาน' },
  { id: 'opt-sc-3', fieldKey: 'subCategory', value: 'ตู้เก็บเอกสาร', parentValue: 'ครุภัณฑ์สำนักงาน' },
  { id: 'opt-sc-4', fieldKey: 'subCategory', value: 'คอมพิวเตอร์ตั้งโต๊ะ', parentValue: 'ครุภัณฑ์คอมพิวเตอร์' },
  { id: 'opt-sc-5', fieldKey: 'subCategory', value: 'เครื่องพิมพ์เลเซอร์', parentValue: 'ครุภัณฑ์คอมพิวเตอร์' },
  { id: 'opt-sc-6', fieldKey: 'subCategory', value: 'จอมอนิเตอร์', parentValue: 'ครุภัณฑ์คอมพิวเตอร์' },
  { id: 'opt-sc-7', fieldKey: 'subCategory', value: 'รถยนต์ตรวจการณ์', parentValue: 'ครุภัณฑ์ยานพาหนะและขนส่ง' },
  { id: 'opt-loc-1', fieldKey: 'location', value: 'ฝ่ายเทคโนโลยีสารสนเทศ ชั้น 4' },
  { id: 'opt-loc-2', fieldKey: 'location', value: 'กองบริหารงานทั่วไป ชั้น 2' },
  { id: 'opt-loc-3', fieldKey: 'location', value: 'ฝ่ายออกแบบและสื่อสิ่งพิมพ์ ชั้น 3' },
  { id: 'opt-loc-4', fieldKey: 'location', value: 'ห้องประชุมผู้บริหาร ชั้น 5' },
  { id: 'opt-loc-5', fieldKey: 'location', value: 'คลังพัสดุ' },
];

let cachedDefaultAdminHash: string | null = null;
function getDefaultAdminHash(): string {
  if (!cachedDefaultAdminHash) {
    cachedDefaultAdminHash = hashPassword('admin1234');
  }
  return cachedDefaultAdminHash;
}

function buildSeedUsers(): StoredUserRecord[] {
  const now = '2026-01-01T00:00:00.000Z';
  return [
    {
      id: 'user-admin-default',
      username: 'admin',
      passwordHash: getDefaultAdminHash(),
      displayName: 'ผู้ดูแลระบบ (Admin)',
      role: 'admin',
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

let demoTransactions: AssetTransaction[] = INITIAL_DEMO_TRANSACTIONS.map((t) => ({ ...t }));
let demoLogsStore: AssetLogRecord[] = [];
let demoDropdownsStore: DropdownOption[] = INITIAL_DEMO_DROPDOWNS.map((o) => ({ ...o }));
let demoFieldSettingsStore: FieldSetting[] = DEFAULT_FIELD_SETTINGS.map((s) => ({ ...s }));
let demoUsersStore: StoredUserRecord[] | null = null;

function getDemoUsersStore(): StoredUserRecord[] {
  if (!demoUsersStore) {
    demoUsersStore = buildSeedUsers();
  }
  return demoUsersStore;
}

export class AssetCollisionError extends Error {
  code = 'COLLISION';
  constructor(message?: string) {
    super(message || 'Asset code already exists on another item');
    this.name = 'AssetCollisionError';
    Object.setPrototypeOf(this, AssetCollisionError.prototype);
  }
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'rec-' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

export type HeaderIndexMap = Map<string, number>;

export function buildHeaderMap(headerRow: string[] = []): HeaderIndexMap {
  const map: HeaderIndexMap = new Map();
  headerRow.forEach((cell, index) => {
    const normalized = String(cell ?? '').trim();
    if (normalized && !map.has(normalized)) {
      map.set(normalized, index);
    }
  });
  return map;
}

export function columnIndexToLetter(index: number): string {
  let letter = '';
  let n = index;
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

export function parseUnitPrice(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw >= 0 ? raw : undefined;
  }
  const cleaned = String(raw).replace(/,/g, '').trim();
  if (!cleaned) return undefined;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

const DEFAULT_HEADER_MAP = buildHeaderMap(HEADER_ROW);

export function rowToTransaction(
  row: string[],
  headerMap: HeaderIndexMap = DEFAULT_HEADER_MAP
): AssetTransaction {
  const getCell = (header: string): string => {
    const idx = headerMap.get(header);
    if (idx === undefined) return '';
    return String(row?.[idx] ?? '');
  };

  const actionCandidate = getCell('การกระทำ');
  const statusCandidate = getCell('สถานะ');
  const imageUrl = getCell('รูปภาพ').trim() || undefined;
  const mainCategory = getCell('ประเภทหลัก').trim() || undefined;
  const subCategory = getCell('ประเภทย่อย').trim() || undefined;
  const acquisitionDate = getCell('วันที่ได้มา').trim() || undefined;
  const unitPrice = parseUnitPrice(getCell('ราคา/หน่วย'));
  const budgetSource = getCell('งบที่ซื้อ').trim() || undefined;

  const tx: AssetTransaction = {
    id: getCell('ID'),
    timestamp: getCell('วันเวลาที่ทำรายการ'),
    action: (actionCandidate as TransactionAction) || 'บันทึกรายการใหม่',
    assetCode: getCell('รหัสครุภัณฑ์'),
    name: getCell('ชื่อครุภัณฑ์'),
    location: getCell('ตำแหน่งที่ตั้ง'),
    status: isValidAssetStatus(statusCandidate) ? statusCandidate : 'พร้อมใช้งาน',
    responsiblePerson: getCell('ผู้รับผิดชอบ'),
    recordedBy: getCell('ผู้บันทึก'),
    notes: getCell('หมายเหตุ'),
  };

  if (imageUrl !== undefined) tx.imageUrl = imageUrl;
  if (mainCategory !== undefined) tx.mainCategory = mainCategory;
  if (subCategory !== undefined) tx.subCategory = subCategory;
  if (acquisitionDate !== undefined) tx.acquisitionDate = acquisitionDate;
  if (unitPrice !== undefined) tx.unitPrice = unitPrice;
  if (budgetSource !== undefined) tx.budgetSource = budgetSource;

  return tx;
}

export function transactionToRow(
  tx: AssetTransaction,
  headerMap: HeaderIndexMap = DEFAULT_HEADER_MAP
): string[] {
  let cleanImageUrl = tx.imageUrl?.trim() || '';
  // Google Sheets cell character limit is 50,000; reject local blob: URIs and oversize strings
  if (cleanImageUrl.startsWith('blob:') || cleanImageUrl.length > 5000) {
    cleanImageUrl = '';
  }

  let maxIdx = HEADER_ROW.length - 1;
  for (const idx of headerMap.values()) {
    if (idx > maxIdx) maxIdx = idx;
  }

  const row = new Array<string>(maxIdx + 1).fill('');
  const setCell = (header: string, value: string) => {
    const idx = headerMap.get(header);
    if (idx !== undefined) {
      row[idx] = value;
    }
  };

  setCell('ID', tx.id);
  setCell('วันเวลาที่ทำรายการ', tx.timestamp);
  setCell('การกระทำ', tx.action);
  setCell('รหัสครุภัณฑ์', tx.assetCode);
  setCell('ชื่อครุภัณฑ์', tx.name);
  setCell('ตำแหน่งที่ตั้ง', tx.location);
  setCell('สถานะ', tx.status);
  setCell('ผู้รับผิดชอบ', tx.responsiblePerson);
  setCell('ผู้บันทึก', tx.recordedBy);
  setCell('หมายเหตุ', tx.notes ?? '');
  setCell('รูปภาพ', cleanImageUrl);
  setCell('ประเภทหลัก', tx.mainCategory?.trim() || '');
  setCell('ประเภทย่อย', tx.subCategory?.trim() || '');
  setCell('วันที่ได้มา', tx.acquisitionDate?.trim() || '');
  setCell('ราคา/หน่วย', tx.unitPrice !== undefined ? String(tx.unitPrice) : '');
  setCell('งบที่ซื้อ', tx.budgetSource?.trim() || '');

  return row;
}

function rowToLogRecord(
  row: string[],
  codeToRecordMap?: Map<string, AssetRecord>
): AssetLogRecord {
  const assetCode = row?.[3] ?? '';
  const directImage = row?.[11]?.trim() || '';
  const fallbackImage = codeToRecordMap?.get(assetCode)?.imageUrl;
  return {
    id: row?.[0] ?? '',
    timestamp: row?.[1] ?? '',
    action: (row?.[2] as LogAction) ?? 'บันทึกรายการใหม่',
    assetCode,
    name: row?.[4] ?? '',
    locationChange: row?.[5] ?? '-',
    responsibleChange: row?.[6] ?? '-',
    statusChange: row?.[7] ?? '-',
    changeSummary: row?.[8] ?? '',
    recordedBy: row?.[9] ?? '',
    notes: row?.[10] ?? '',
    assetId: codeToRecordMap?.get(assetCode)?.id ?? '',
    imageUrl: directImage || fallbackImage || undefined,
  };
}

function logToRow(log: AssetLogRecord): string[] {
  let cleanImageUrl = log.imageUrl?.trim() || '';
  if (cleanImageUrl.startsWith('blob:') || cleanImageUrl.length > 5000) {
    cleanImageUrl = '';
  }
  return [
    log.id,
    log.timestamp,
    log.action,
    log.assetCode,
    log.name,
    log.locationChange,
    log.responsibleChange,
    log.statusChange,
    log.changeSummary,
    log.recordedBy,
    log.notes ?? '',
    cleanImageUrl,
  ];
}

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

function getSheetsClient() {
  const config = getEnvConfig();
  if (!config.isConfigured || !config.spreadsheetId || !config.clientEmail || !config.privateKey) {
    return null;
  }

  const auth = new google.auth.JWT({
    email: config.clientEmail,
    key: config.privateKey,
    scopes: GOOGLE_SCOPES,
  });

  const sheets = google.sheets({ version: 'v4', auth });
  return { sheets, spreadsheetId: config.spreadsheetId };
}

function getDriveClient() {
  const config = getEnvConfig();
  if (!config.isDriveConfigured || !config.clientEmail || !config.privateKey || !config.driveFolderId) {
    return null;
  }

  const auth = new google.auth.JWT({
    email: config.clientEmail,
    key: config.privateKey,
    scopes: GOOGLE_SCOPES,
  });

  const drive = google.drive({ version: 'v3', auth });
  return { drive, folderId: config.driveFolderId };
}

export async function uploadImageToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ fileId: string; url: string }> {
  const config = getEnvConfig();

  // Mode A: Google Apps Script Web App Bridge (for personal @gmail.com accounts)
  if (config.driveUploadUrl) {
    const res = await fetch(config.driveUploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64: buffer.toString('base64'),
        fileName,
        mimeType,
      }),
      redirect: 'follow',
    });
    const rawText = await res.text();
    let json: any;
    try {
      json = JSON.parse(rawText);
    } catch {
      throw new Error(
        `Apps Script did not return JSON. Please verify that the Web App is deployed with 'Who has access: Anyone'. Response preview: ${rawText.slice(0, 200)}`
      );
    }
    if (!res.ok || !json.success) {
      throw new Error(json.error || `Failed to upload image via Apps Script Web App (status ${res.status})`);
    }
    return {
      fileId: json.fileId,
      url: json.url,
    };
  }

  // Mode B: Google Workspace Shared Drive (Service Account)
  const client = getDriveClient();
  if (!client) {
    // In demo mode or when Google Drive is unconfigured: return base64 data URL
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;
    return {
      fileId: `demo-file-${Date.now()}`,
      url: dataUrl,
    };
  }

  const { drive, folderId } = client;
  const stream = Readable.from(buffer);

  let res;
  try {
    res = await drive.files.create({
      supportsAllDrives: true,
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: 'id, webViewLink, thumbnailLink',
    });
  } catch (err: any) {
    if (err?.message?.includes('storage quota') || err?.message?.includes('Service Accounts do not have storage quota')) {
      throw new Error(
        'Service Account ไม่มีโควตาพื้นที่บน Google Drive ส่วนตัว (@gmail.com) กรุณาเพิ่มตัวแปร GOOGLE_DRIVE_UPLOAD_URL บน Vercel Environment Variables เพื่ออัปโหลดผ่าน Apps Script Web App'
      );
    }
    throw err;
  }

  const fileId = res.data.id || '';

  try {
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
  } catch (err) {
    console.warn('Could not set public permission on Drive file:', err);
  }

  const url = `https://lh3.googleusercontent.com/d/${fileId}`;

  return {
    fileId,
    url,
  };
}

interface HeaderEnsureResult {
  values: string[][];
  headerMap: HeaderIndexMap;
}

async function ensureHeaderRow(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string
): Promise<HeaderEnsureResult> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: RANGE_ALL,
  });

  const values = res.data.values;
  if (!values || values.length === 0 || !values[0] || values[0].length === 0) {
    const endCol = columnIndexToLetter(HEADER_ROW.length - 1);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `A1:${endCol}1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [HEADER_ROW] },
    });
    return {
      values: [HEADER_ROW],
      headerMap: buildHeaderMap(HEADER_ROW),
    };
  }

  // Non-destructive header alignment: preserve existing column order (supports user reordering!)
  // Only append missing headers to the right of existing headers.
  let headerRow = [...values[0]];
  let headerMap = buildHeaderMap(headerRow);
  const missingHeaders = HEADER_ROW.filter((h) => !headerMap.has(h));

  if (missingHeaders.length > 0) {
    const startIdx = headerRow.length;
    const startCol = columnIndexToLetter(startIdx);
    const endCol = columnIndexToLetter(startIdx + missingHeaders.length - 1);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${startCol}1:${endCol}1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [missingHeaders] },
    });
    headerRow = [...headerRow, ...missingHeaders];
    values[0] = headerRow;
    headerMap = buildHeaderMap(headerRow);
  }

  return { values, headerMap };
}

async function ensureSheetExists(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  title: string
): Promise<void> {
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties.title',
  });
  const sheetTitles = metadata?.data?.sheets?.map((s) => s.properties?.title) ?? [];
  if (!sheetTitles.includes(title)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title },
            },
          },
        ],
      },
    });
  }
}

async function ensureDropdownsSheet(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string
): Promise<string[][]> {
  await ensureSheetExists(sheets, spreadsheetId, DROPDOWNS_SHEET_NAME);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: RANGE_DROPDOWNS_ALL,
  });

  const values = res?.data?.values;
  if (!values || values.length === 0 || !values[0] || values[0].length === 0) {
    const now = new Date().toISOString();
    const seedRows = INITIAL_DEMO_DROPDOWNS.map((opt) => [
      opt.id,
      opt.fieldKey,
      opt.value,
      opt.parentValue || '',
      now,
    ]);
    const allRows = [DROPDOWNS_HEADER_ROW, ...seedRows];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${DROPDOWNS_SHEET_NAME}!A1:E${allRows.length}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: allRows },
    });
    return allRows;
  }

  return values;
}

async function ensureFieldSettingsSheet(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string
): Promise<string[][]> {
  await ensureSheetExists(sheets, spreadsheetId, FIELD_SETTINGS_SHEET_NAME);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: RANGE_FIELD_SETTINGS_ALL,
  });

  const values = res?.data?.values;
  if (!values || values.length === 0 || !values[0] || values[0].length === 0) {
    const seedRows = DEFAULT_FIELD_SETTINGS.map((s) => [
      s.fieldKey,
      s.label,
      s.required ? 'TRUE' : 'FALSE',
      s.useDropdown ? 'TRUE' : 'FALSE',
      s.supportsDropdown ? 'TRUE' : 'FALSE',
    ]);
    const allRows = [FIELD_SETTINGS_HEADER_ROW, ...seedRows];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${FIELD_SETTINGS_SHEET_NAME}!A1:E${allRows.length}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: allRows },
    });
    return allRows;
  }

  return values;
}

function parseBoolCell(val: unknown, fallback = false): boolean {
  if (typeof val === 'boolean') return val;
  const s = String(val ?? '').trim().toUpperCase();
  if (s === 'TRUE' || s === '1' || s === 'YES') return true;
  if (s === 'FALSE' || s === '0' || s === 'NO') return false;
  return fallback;
}

function rowToDropdownOption(row: string[]): DropdownOption | null {
  const id = (row?.[0] ?? '').trim();
  const fieldKey = (row?.[1] ?? '').trim() as DropdownFieldKey;
  const value = (row?.[2] ?? '').trim();
  if (!id || !fieldKey || !value) return null;
  const parentValue = (row?.[3] ?? '').trim() || undefined;
  const updatedAt = (row?.[4] ?? '').trim() || undefined;
  return { id, fieldKey, value, parentValue, updatedAt };
}

function mergeFieldSettingsWithDefaults(parsed: FieldSetting[]): FieldSetting[] {
  const parsedMap = new Map(parsed.map((s) => [s.fieldKey, s]));
  return DEFAULT_FIELD_SETTINGS.map((def) => {
    const custom = parsedMap.get(def.fieldKey);
    if (!custom) return { ...def };
    return {
      fieldKey: def.fieldKey,
      label: def.label,
      required: custom.required,
      useDropdown: def.supportsDropdown ? custom.useDropdown : false,
      supportsDropdown: def.supportsDropdown,
    };
  });
}

async function ensureUsersSheet(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string
): Promise<string[][]> {
  await ensureSheetExists(sheets, spreadsheetId, USERS_SHEET_NAME);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: RANGE_USERS_ALL,
  });

  const values = res?.data?.values;
  if (!values || values.length === 0 || !values[0] || values[0].length === 0) {
    const seedRows = buildSeedUsers().map((u) => [
      u.id,
      u.username,
      u.passwordHash,
      u.displayName,
      u.role,
      u.active ? 'TRUE' : 'FALSE',
      u.createdAt,
      u.updatedAt,
    ]);
    const allRows = [USERS_HEADER_ROW, ...seedRows];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${USERS_SHEET_NAME}!A1:H${allRows.length}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: allRows },
    });
    return allRows;
  }

  return values;
}

function rowToStoredUser(row: string[]): StoredUserRecord | null {
  const id = String(row?.[0] ?? '').trim();
  const username = String(row?.[1] ?? '').trim();
  const passwordHash = String(row?.[2] ?? '').trim();
  const displayName = String(row?.[3] ?? '').trim();
  const roleCandidate = String(row?.[4] ?? '').trim();
  if (!id || !username || !passwordHash) return null;

  return {
    id,
    username,
    passwordHash,
    displayName: displayName || username,
    role: isValidUserRole(roleCandidate) ? roleCandidate : 'staff',
    active: parseBoolCell(row?.[5], true),
    createdAt: String(row?.[6] ?? '').trim() || new Date().toISOString(),
    updatedAt: String(row?.[7] ?? '').trim() || new Date().toISOString(),
  };
}

function toPublicUser(user: StoredUserRecord): UserAccount {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function ensureLogsSheet(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string
): Promise<string[][]> {
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties.title',
  });

  const sheetTitles = metadata?.data?.sheets?.map((s) => s.properties?.title) ?? [];
  if (!sheetTitles.includes('Logs')) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: 'Logs',
              },
            },
          },
        ],
      },
    });
  }

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Logs!A1:L1',
  });

  const values = res?.data?.values;
  if (!values || values.length === 0 || !values[0] || values[0].length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Logs!A1:L1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [LOG_HEADER_ROW] },
    });
    return [LOG_HEADER_ROW];
  } else if (values[0].length < 12) {
    try {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Logs!L1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [['รูปภาพ']] },
      });
    } catch {
      // non-fatal upgrade
    }
  }

  return values;
}

export const sheetsService = {
  resetDemoStore(): void {
    demoTransactions = INITIAL_DEMO_TRANSACTIONS.map((t) => ({ ...t }));
    demoLogsStore = [];
    demoDropdownsStore = INITIAL_DEMO_DROPDOWNS.map((o) => ({ ...o }));
    demoFieldSettingsStore = DEFAULT_FIELD_SETTINGS.map((s) => ({ ...s }));
    demoUsersStore = null;
  },

  async getTransactions(): Promise<AssetTransaction[]> {
    const client = getSheetsClient();
    if (!client) {
      return demoTransactions.map((t) => ({ ...t }));
    }

    const { sheets, spreadsheetId } = client;
    const { values, headerMap } = await ensureHeaderRow(sheets, spreadsheetId);
    const idIdx = headerMap.get('ID') ?? 0;

    const dataRows = values.slice(1);
    return dataRows
      .filter((row) => row && row[idIdx] && String(row[idIdx]).trim().length > 0)
      .map((row) => rowToTransaction(row, headerMap));
  },

  async getRecords(): Promise<AssetRecord[]> {
    const txs = await this.getTransactions();
    return projectLatestAssets(txs);
  },

  async getRecordById(id: string): Promise<AssetRecord | null> {
    const records = await this.getRecords();
    return records.find((r) => r.id === id) ?? null;
  },

  async getRecordByAssetCode(code: string): Promise<AssetRecord | null> {
    const normalized = normalizeAssetCode(code);
    const records = await this.getRecords();
    return records.find((r) => normalizeAssetCode(r.assetCode) === normalized) ?? null;
  },

  async getLogs(filter?: { assetId?: string; assetCode?: string }): Promise<AssetLogRecord[]> {
    const client = getSheetsClient();

    // If running in demo mode
    if (!client) {
      let logs = [...demoLogsStore].reverse();
      if (filter?.assetId) {
        logs = logs.filter((l) => l.assetId === filter.assetId);
      }
      if (filter?.assetCode) {
        const norm = normalizeAssetCode(filter.assetCode);
        logs = logs.filter((l) => normalizeAssetCode(l.assetCode) === norm);
      }

      // If matching session audit logs exist, return them
      if (logs.length > 0) {
        return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }

      // Fallback for seed demo items that don't have runtime demoLogsStore entries
      if (filter?.assetId || filter?.assetCode) {
        let targetCode = filter?.assetCode;
        if (!targetCode && filter?.assetId) {
          const records = await this.getRecords();
          const match = records.find((r) => r.id === filter.assetId);
          if (match) targetCode = match.assetCode;
        }
        if (targetCode) {
          const norm = normalizeAssetCode(targetCode);
          const filteredTxs = demoTransactions.filter((t) => normalizeAssetCode(t.assetCode) === norm);
          const computed = computeTransactionDiffs(filteredTxs);
          if (computed.length > 0) {
            return computed;
          }
        }
      }

      return [];
    }

    // Google Sheets mode: check Logs sheet first for backward compatibility
    try {
      const { sheets, spreadsheetId } = client;
      await ensureLogsSheet(sheets, spreadsheetId);
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: RANGE_LOGS_ALL,
      });
      const values = res?.data?.values;
      if (values && values.length > 1) {
        let records: AssetRecord[] = [];
        try {
          records = await this.getRecords();
        } catch {
          // ignore
        }
        const codeToRecordMap = new Map<string, AssetRecord>();
        for (const r of records) {
          codeToRecordMap.set(r.assetCode, r);
        }
        let logs = values
          .slice(1)
          .reverse()
          .filter((row) => row && row[0] && row[0].trim().length > 0)
          .map((row) => rowToLogRecord(row, codeToRecordMap));

        if (filter?.assetId) {
          const targetAsset = records.find((r) => r.id === filter.assetId);
          const tc = targetAsset?.assetCode;
          logs = logs.filter(
            (l) =>
              (l.assetId && l.assetId === filter.assetId) ||
              (tc && l.assetCode === tc)
          );
        }
        if (filter?.assetCode) {
          const norm = normalizeAssetCode(filter.assetCode);
          logs = logs.filter((l) => normalizeAssetCode(l.assetCode) === norm);
        }
        return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
    } catch {
      // fallback to computing from transactions
    }

    const txs = await this.getTransactions();
    let targetCode = filter?.assetCode;

    if (!targetCode && filter?.assetId) {
      const records = await this.getRecords();
      const match = records.find((r) => r.id === filter.assetId);
      if (match) {
        targetCode = match.assetCode;
      }
    }

    let filteredTxs = txs;
    if (targetCode) {
      const normalizedTarget = normalizeAssetCode(targetCode);
      filteredTxs = txs.filter((t) => normalizeAssetCode(t.assetCode) === normalizedTarget);
    }

    return computeTransactionDiffs(filteredTxs);
  },

  async appendLog(log: AssetLogRecord): Promise<void> {
    const client = getSheetsClient();
    if (!client) {
      demoLogsStore.push(log);
      return;
    }

    const { sheets, spreadsheetId } = client;
    await ensureLogsSheet(sheets, spreadsheetId);

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: RANGE_LOGS_ALL,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [logToRow(log)],
      },
    });
  },

  async createRecord(
    data: Omit<CreateAssetInput, 'notes'> & { notes?: string }
  ): Promise<AssetRecord> {
    const normalizedCode = normalizeAssetCode(data.assetCode);
    const existing = await this.getRecordByAssetCode(normalizedCode);
    const isUpdate = Boolean(existing);

    const now = new Date().toISOString();
    const action: TransactionAction = isUpdate ? 'แก้ไข/ย้ายตำแหน่ง' : 'บันทึกรายการใหม่';

    const cleanOpt = (val: string | undefined, fallback?: string): string | undefined => {
      if (val === undefined) return fallback;
      const trimmed = val.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    };

    const newTx: AssetTransaction = {
      id: isUpdate && existing ? existing.id : generateId(),
      timestamp: now,
      action,
      assetCode: data.assetCode.trim(),
      name: data.name,
      location: data.location,
      status: data.status,
      responsiblePerson: data.responsiblePerson,
      recordedBy: data.recordedBy,
      notes: data.notes || '',
      imageUrl: data.imageUrl || (isUpdate && existing ? existing.imageUrl : undefined),
      mainCategory: cleanOpt(data.mainCategory, isUpdate && existing ? existing.mainCategory : undefined),
      subCategory: cleanOpt(data.subCategory, isUpdate && existing ? existing.subCategory : undefined),
      acquisitionDate: cleanOpt(data.acquisitionDate, isUpdate && existing ? existing.acquisitionDate : undefined),
      unitPrice: data.unitPrice !== undefined ? parseUnitPrice(data.unitPrice) : (isUpdate && existing ? existing.unitPrice : undefined),
      budgetSource: cleanOpt(data.budgetSource, isUpdate && existing ? existing.budgetSource : undefined),
    };

    const client = getSheetsClient();
    if (!client) {
      demoTransactions.push(newTx);
    } else {
      const { sheets, spreadsheetId } = client;
      const { headerMap } = await ensureHeaderRow(sheets, spreadsheetId);

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: RANGE_ALL,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [transactionToRow(newTx, headerMap)],
        },
      });
    }

    // Also append to audit log for full audit trail continuity
    const logRecord: AssetLogRecord = {
      id: generateId(),
      timestamp: now,
      action: isUpdate ? 'แก้ไข/ย้ายตำแหน่ง' : 'บันทึกรายการใหม่',
      assetId: newTx.id,
      assetCode: newTx.assetCode,
      name: newTx.name,
      locationChange: isUpdate && existing ? `${existing.location || '-'} ➔ ${newTx.location}` : `- ➔ ${newTx.location}`,
      responsibleChange: isUpdate && existing ? `${existing.responsiblePerson || '-'} ➔ ${newTx.responsiblePerson}` : `- ➔ ${newTx.responsiblePerson}`,
      statusChange: isUpdate && existing ? `${existing.status || '-'} ➔ ${newTx.status}` : `- ➔ ${newTx.status}`,
      changeSummary: isUpdate ? 'อัปเดตข้อมูลครุภัณฑ์' : 'บันทึกครุภัณฑ์ใหม่เข้าสู่ระบบ',
      recordedBy: newTx.recordedBy,
      notes: newTx.notes || '',
      imageUrl: newTx.imageUrl || undefined,
    };

    try {
      await this.appendLog(logRecord);
    } catch (logErr) {
      console.error('Failed to append audit log for createRecord:', logErr);
    }

    const createdRecord: AssetRecord = {
      id: newTx.id,
      assetCode: newTx.assetCode,
      name: newTx.name,
      location: newTx.location,
      status: newTx.status,
      responsiblePerson: newTx.responsiblePerson,
      recordedBy: newTx.recordedBy,
      notes: newTx.notes,
      imageUrl: newTx.imageUrl,
      ...(newTx.mainCategory !== undefined ? { mainCategory: newTx.mainCategory } : {}),
      ...(newTx.subCategory !== undefined ? { subCategory: newTx.subCategory } : {}),
      ...(newTx.acquisitionDate !== undefined ? { acquisitionDate: newTx.acquisitionDate } : {}),
      ...(newTx.unitPrice !== undefined ? { unitPrice: newTx.unitPrice } : {}),
      ...(newTx.budgetSource !== undefined ? { budgetSource: newTx.budgetSource } : {}),
      createdAt: isUpdate && existing ? existing.createdAt : newTx.timestamp,
      updatedAt: newTx.timestamp,
      transactionCount: (existing?.transactionCount || 0) + 1,
      action: newTx.action,
    };

    return createdRecord;
  },

  async updateRecord(idOrCode: string, data: UpdateAssetInput): Promise<AssetRecord | null> {
    const records = await this.getRecords();
    const existing = records.find(
      (r) => r.id === idOrCode || normalizeAssetCode(r.assetCode) === normalizeAssetCode(idOrCode)
    );
    if (!existing) return null;

    const sanitizedData: UpdateAssetInput = {
      ...data,
      ...(data.assetCode !== undefined ? { assetCode: data.assetCode.trim() } : {}),
    };

    // Collision check: only when assetCode actually changes to another asset's code
    if (
      sanitizedData.assetCode !== undefined &&
      normalizeAssetCode(sanitizedData.assetCode) !== normalizeAssetCode(existing.assetCode)
    ) {
      const targetNormalized = normalizeAssetCode(sanitizedData.assetCode);
      const collision = records.find(
        (r) => r.id !== existing.id && normalizeAssetCode(r.assetCode) === targetNormalized
      );
      if (collision) {
        throw new AssetCollisionError(
          `Asset code already exists on another item: ${sanitizedData.assetCode}`
        );
      }
    }

    const cleanOpt = (val: string | undefined, fallback?: string): string | undefined => {
      if (val === undefined) return fallback;
      const trimmed = val.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    };

    const isInspection = Boolean(sanitizedData.isInspection);
    const now = sanitizedData.updatedAt ?? new Date().toISOString();
    const newTx: AssetTransaction = {
      id: generateId(),
      timestamp: now,
      action: isInspection ? 'ตรวจเช็กครุภัณฑ์' : 'แก้ไข/ย้ายตำแหน่ง',
      assetCode: sanitizedData.assetCode !== undefined ? sanitizedData.assetCode : existing.assetCode,
      name: sanitizedData.name !== undefined ? sanitizedData.name : existing.name,
      location: sanitizedData.location !== undefined ? sanitizedData.location : existing.location,
      status: sanitizedData.status !== undefined && isValidAssetStatus(sanitizedData.status)
        ? sanitizedData.status
        : existing.status,
      responsiblePerson: sanitizedData.responsiblePerson !== undefined
        ? sanitizedData.responsiblePerson
        : existing.responsiblePerson,
      recordedBy: sanitizedData.recordedBy !== undefined
        ? sanitizedData.recordedBy
        : (existing.recordedBy || 'ระบบ'),
      notes: sanitizedData.notes !== undefined ? sanitizedData.notes : (existing.notes || ''),
      imageUrl: sanitizedData.imageUrl !== undefined ? sanitizedData.imageUrl : existing.imageUrl,
      mainCategory: cleanOpt(sanitizedData.mainCategory, existing.mainCategory),
      subCategory: cleanOpt(sanitizedData.subCategory, existing.subCategory),
      acquisitionDate: cleanOpt(sanitizedData.acquisitionDate, existing.acquisitionDate),
      unitPrice: sanitizedData.unitPrice !== undefined ? parseUnitPrice(sanitizedData.unitPrice) : existing.unitPrice,
      budgetSource: cleanOpt(sanitizedData.budgetSource, existing.budgetSource),
    };

    const client = getSheetsClient();
    if (!client) {
      demoTransactions.push(newTx);
    } else {
      const { sheets, spreadsheetId } = client;
      const { headerMap } = await ensureHeaderRow(sheets, spreadsheetId);

      // Append transaction to sheet (never in-place overwrite)
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: RANGE_ALL,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [transactionToRow(newTx, headerMap)],
        },
      });
    }

    const diff = computeAssetDiff(
      existing,
      sanitizedData,
      sanitizedData.recordedBy || newTx.recordedBy || 'ระบบ',
      sanitizedData.notes
    );

    if (diff || isInspection) {
      const logRecord: AssetLogRecord = diff
        ? {
            id: generateId(),
            timestamp: newTx.timestamp,
            ...diff,
            action: isInspection ? 'ตรวจเช็กครุภัณฑ์' : diff.action,
            changeSummary: isInspection
              ? `ตรวจเช็กครุภัณฑ์ (${diff.changeSummary})`
              : diff.changeSummary,
            assetId: existing.id,
            imageUrl: diff.imageUrl || newTx.imageUrl || existing.imageUrl || undefined,
          }
        : {
            id: generateId(),
            timestamp: newTx.timestamp,
            action: 'ตรวจเช็กครุภัณฑ์',
            assetId: existing.id,
            assetCode: newTx.assetCode,
            name: newTx.name,
            locationChange: '-',
            responsibleChange: '-',
            statusChange: '-',
            changeSummary: 'ตรวจเช็กครุภัณฑ์ (ไม่พบการเปลี่ยนแปลง)',
            recordedBy: newTx.recordedBy || 'ระบบ',
            notes: newTx.notes || '',
            imageUrl: newTx.imageUrl || existing.imageUrl || undefined,
          };
      try {
        await this.appendLog(logRecord);
      } catch (logErr) {
        console.error('Failed to append audit log for updateRecord:', logErr);
      }
    }

    const updatedRecord: AssetRecord = {
      id: existing.id,
      assetCode: newTx.assetCode,
      name: newTx.name,
      location: newTx.location,
      status: newTx.status,
      responsiblePerson: newTx.responsiblePerson,
      recordedBy: newTx.recordedBy,
      notes: newTx.notes,
      imageUrl: newTx.imageUrl,
      ...(newTx.mainCategory !== undefined ? { mainCategory: newTx.mainCategory } : {}),
      ...(newTx.subCategory !== undefined ? { subCategory: newTx.subCategory } : {}),
      ...(newTx.acquisitionDate !== undefined ? { acquisitionDate: newTx.acquisitionDate } : {}),
      ...(newTx.unitPrice !== undefined ? { unitPrice: newTx.unitPrice } : {}),
      ...(newTx.budgetSource !== undefined ? { budgetSource: newTx.budgetSource } : {}),
      createdAt: existing.createdAt,
      updatedAt: newTx.timestamp,
      transactionCount: (existing.transactionCount || 1) + 1,
      action: newTx.action,
    };

    return updatedRecord;
  },

  async deleteRecord(idOrCode: string, recordedBy?: string, notes?: string): Promise<boolean> {
    const records = await this.getRecords();
    const existing = records.find(
      (r) => r.id === idOrCode || normalizeAssetCode(r.assetCode) === normalizeAssetCode(idOrCode)
    );
    if (!existing) return false;

    const now = new Date().toISOString();
    const newTx: AssetTransaction = {
      id: generateId(),
      timestamp: now,
      action: 'จำหน่าย/ตัดบัญชี',
      assetCode: existing.assetCode,
      name: existing.name,
      location: existing.location,
      status: 'จำหน่าย/ตัดบัญชี',
      responsiblePerson: existing.responsiblePerson,
      recordedBy: recordedBy || existing.recordedBy || 'ระบบ',
      notes: notes || 'จำหน่าย/ตัดบัญชีออกจากระบบ',
      imageUrl: existing.imageUrl,
      mainCategory: existing.mainCategory,
      subCategory: existing.subCategory,
      acquisitionDate: existing.acquisitionDate,
      unitPrice: existing.unitPrice,
      budgetSource: existing.budgetSource,
    };

    const client = getSheetsClient();
    if (!client) {
      demoTransactions.push(newTx);
    } else {
      const { sheets, spreadsheetId } = client;
      const { headerMap } = await ensureHeaderRow(sheets, spreadsheetId);

      // Append decommission transaction (never deleteDimension)
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: RANGE_ALL,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [transactionToRow(newTx, headerMap)],
        },
      });
    }

    const logRecord: AssetLogRecord = {
      id: generateId(),
      timestamp: now,
      action: 'ลบรายการ',
      assetId: existing.id,
      assetCode: existing.assetCode,
      name: existing.name,
      locationChange: `${existing.location || '-'} ➔ -`,
      responsibleChange: `${existing.responsiblePerson || '-'} ➔ -`,
      statusChange: `${existing.status || '-'} ➔ -`,
      changeSummary: 'ลบรายการครุภัณฑ์ออกจากระบบ',
      recordedBy: newTx.recordedBy,
      notes: newTx.notes,
      imageUrl: existing.imageUrl || undefined,
    };

    try {
      await this.appendLog(logRecord);
    } catch (logErr) {
      console.error('Failed to append audit log for deleteRecord:', logErr);
    }

    return true;
  },

  async getFieldSettings(): Promise<FieldSetting[]> {
    const client = getSheetsClient();
    if (!client) {
      return demoFieldSettingsStore.map((s) => ({ ...s }));
    }

    const { sheets, spreadsheetId } = client;
    const values = await ensureFieldSettingsSheet(sheets, spreadsheetId);
    const parsed: FieldSetting[] = values
      .slice(1)
      .filter((row) => row && row[0] && String(row[0]).trim().length > 0)
      .map((row) => ({
        fieldKey: String(row[0]).trim() as ConfigurableFieldKey,
        label: String(row[1] ?? '').trim(),
        required: parseBoolCell(row[2], false),
        useDropdown: parseBoolCell(row[3], false),
        supportsDropdown: parseBoolCell(row[4], false),
      }));

    return mergeFieldSettingsWithDefaults(parsed);
  },

  async saveFieldSettings(settings: FieldSetting[]): Promise<FieldSetting[]> {
    const merged = mergeFieldSettingsWithDefaults(settings);
    const client = getSheetsClient();
    if (!client) {
      demoFieldSettingsStore = merged.map((s) => ({ ...s }));
      return demoFieldSettingsStore.map((s) => ({ ...s }));
    }

    const { sheets, spreadsheetId } = client;
    await ensureFieldSettingsSheet(sheets, spreadsheetId);
    const rows = merged.map((s) => [
      s.fieldKey,
      s.label,
      s.required ? 'TRUE' : 'FALSE',
      s.useDropdown ? 'TRUE' : 'FALSE',
      s.supportsDropdown ? 'TRUE' : 'FALSE',
    ]);
    const allRows = [FIELD_SETTINGS_HEADER_ROW, ...rows];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${FIELD_SETTINGS_SHEET_NAME}!A1:E${allRows.length}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: allRows },
    });

    return merged;
  },

  async getDropdownOptions(): Promise<DropdownOption[]> {
    const client = getSheetsClient();
    if (!client) {
      return demoDropdownsStore.map((o) => ({ ...o }));
    }

    const { sheets, spreadsheetId } = client;
    const values = await ensureDropdownsSheet(sheets, spreadsheetId);
    return values
      .slice(1)
      .map(rowToDropdownOption)
      .filter((o): o is DropdownOption => o !== null);
  },

  async getOptionsAndSettings(): Promise<SystemOptionsPayload> {
    const [options, fieldSettings] = await Promise.all([
      this.getDropdownOptions(),
      this.getFieldSettings(),
    ]);
    return { options, fieldSettings };
  },

  async _persistDropdownOptions(options: DropdownOption[], previousCount = 0): Promise<void> {
    const client = getSheetsClient();
    if (!client) {
      demoDropdownsStore = options.map((o) => ({ ...o }));
      return;
    }

    const { sheets, spreadsheetId } = client;
    const now = new Date().toISOString();
    const rows = options.map((opt) => [
      opt.id,
      opt.fieldKey,
      opt.value,
      opt.parentValue || '',
      opt.updatedAt || now,
    ]);
    const allRows: string[][] = [DROPDOWNS_HEADER_ROW, ...rows];

    // Pad trailing empty rows if list shrank so old cells are cleared without requiring batchUpdate deleteDimension
    const totalNeeded = Math.max(allRows.length, previousCount + 1);
    while (allRows.length < totalNeeded) {
      allRows.push(['', '', '', '', '']);
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${DROPDOWNS_SHEET_NAME}!A1:E${allRows.length}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: allRows },
    });
  },

  async createDropdownOption(input: {
    fieldKey: DropdownFieldKey;
    value: string;
    parentValue?: string;
  }): Promise<DropdownOption> {
    const current = await this.getDropdownOptions();
    const trimmedValue = input.value.trim();
    const trimmedParent = input.parentValue?.trim() || undefined;

    const duplicate = current.find(
      (o) =>
        o.fieldKey === input.fieldKey &&
        o.value.toLowerCase() === trimmedValue.toLowerCase() &&
        (o.parentValue || '') === (trimmedParent || '')
    );
    if (duplicate) {
      return duplicate;
    }

    const newOpt: DropdownOption = {
      id: `opt-${generateId()}`,
      fieldKey: input.fieldKey,
      value: trimmedValue,
      ...(trimmedParent ? { parentValue: trimmedParent } : {}),
      updatedAt: new Date().toISOString(),
    };

    const next = [...current, newOpt];
    await this._persistDropdownOptions(next, current.length);
    return newOpt;
  },

  async updateDropdownOption(
    id: string,
    input: { value: string; parentValue?: string }
  ): Promise<DropdownOption | null> {
    const current = await this.getDropdownOptions();
    const targetIdx = current.findIndex((o) => o.id === id);
    if (targetIdx === -1) return null;

    const existing = current[targetIdx];
    const nextValue = input.value.trim();
    const nextParent = input.parentValue !== undefined
      ? (input.parentValue.trim() || undefined)
      : existing.parentValue;
    const now = new Date().toISOString();

    const updatedOpt: DropdownOption = {
      ...existing,
      value: nextValue,
      ...(nextParent ? { parentValue: nextParent } : { parentValue: undefined }),
      updatedAt: now,
    };

    // If a mainCategory value was renamed, automatically cascade update linked subCategories
    const next = current.map((opt) => {
      if (opt.id === id) return updatedOpt;
      if (
        existing.fieldKey === 'mainCategory' &&
        opt.fieldKey === 'subCategory' &&
        opt.parentValue === existing.value &&
        nextValue !== existing.value
      ) {
        return { ...opt, parentValue: nextValue, updatedAt: now };
      }
      return opt;
    });

    await this._persistDropdownOptions(next, current.length);
    return updatedOpt;
  },

  async deleteDropdownOption(id: string): Promise<boolean> {
    const current = await this.getDropdownOptions();
    const target = current.find((o) => o.id === id);
    if (!target) return false;

    const next = current.filter((o) => o.id !== id);
    await this._persistDropdownOptions(next, current.length);
    return true;
  },

  async _getStoredUsers(): Promise<StoredUserRecord[]> {
    const client = getSheetsClient();
    if (!client) {
      return getDemoUsersStore().map((u) => ({ ...u }));
    }

    const { sheets, spreadsheetId } = client;
    const values = await ensureUsersSheet(sheets, spreadsheetId);
    return values
      .slice(1)
      .map(rowToStoredUser)
      .filter((u): u is StoredUserRecord => u !== null);
  },

  async _persistUsers(users: StoredUserRecord[], previousCount = 0): Promise<void> {
    const client = getSheetsClient();
    if (!client) {
      demoUsersStore = users.map((u) => ({ ...u }));
      return;
    }

    const { sheets, spreadsheetId } = client;
    const rows = users.map((u) => [
      u.id,
      u.username,
      u.passwordHash,
      u.displayName,
      u.role,
      u.active ? 'TRUE' : 'FALSE',
      u.createdAt,
      u.updatedAt,
    ]);
    const allRows: string[][] = [USERS_HEADER_ROW, ...rows];

    const totalNeeded = Math.max(allRows.length, previousCount + 1);
    while (allRows.length < totalNeeded) {
      allRows.push(['', '', '', '', '', '', '', '']);
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${USERS_SHEET_NAME}!A1:H${allRows.length}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: allRows },
    });
  },

  async getUsers(): Promise<UserAccount[]> {
    const stored = await this._getStoredUsers();
    return stored.map(toPublicUser);
  },

  async findUserForAuth(username: string): Promise<StoredUserRecord | null> {
    const normalized = (username || '').trim().toLowerCase();
    if (!normalized) return null;
    const stored = await this._getStoredUsers();
    return stored.find((u) => u.username.trim().toLowerCase() === normalized) ?? null;
  },

  async getUserById(id: string): Promise<UserAccount | null> {
    const stored = await this._getStoredUsers();
    const match = stored.find((u) => u.id === id);
    return match ? toPublicUser(match) : null;
  },

  async createUser(input: {
    username: string;
    password: string;
    displayName: string;
    role: UserRole;
    active?: boolean;
  }): Promise<UserAccount> {
    const current = await this._getStoredUsers();
    const normalized = input.username.trim().toLowerCase();
    if (current.some((u) => u.username.trim().toLowerCase() === normalized)) {
      const err: any = new Error(`ชื่อผู้ใช้ "${input.username.trim()}" มีอยู่ในระบบแล้ว`);
      err.code = 'DUPLICATE_USERNAME';
      throw err;
    }

    const now = new Date().toISOString();
    const newUser: StoredUserRecord = {
      id: `user-${generateId()}`,
      username: input.username.trim(),
      passwordHash: hashPassword(input.password),
      displayName: input.displayName.trim(),
      role: input.role,
      active: input.active !== undefined ? input.active : true,
      createdAt: now,
      updatedAt: now,
    };

    await this._persistUsers([...current, newUser], current.length);
    return toPublicUser(newUser);
  },

  async updateUser(
    id: string,
    input: {
      displayName?: string;
      role?: UserRole;
      active?: boolean;
      password?: string;
    }
  ): Promise<UserAccount | null> {
    const current = await this._getStoredUsers();
    const idx = current.findIndex((u) => u.id === id);
    if (idx === -1) return null;

    const existing = current[idx];
    const now = new Date().toISOString();
    const updated: StoredUserRecord = {
      ...existing,
      ...(input.displayName !== undefined ? { displayName: input.displayName.trim() } : {}),
      ...(input.role !== undefined && isValidUserRole(input.role) ? { role: input.role } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...(input.password && input.password.length > 0
        ? { passwordHash: hashPassword(input.password) }
        : {}),
      updatedAt: now,
    };

    const next = current.map((u) => (u.id === id ? updated : u));
    await this._persistUsers(next, current.length);
    return toPublicUser(updated);
  },

  async deleteUser(id: string): Promise<boolean> {
    const current = await this._getStoredUsers();
    if (!current.some((u) => u.id === id)) return false;

    const next = current.filter((u) => u.id !== id);
    await this._persistUsers(next, current.length);
    return true;
  },
};

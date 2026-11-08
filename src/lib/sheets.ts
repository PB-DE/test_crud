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
} from './types';
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
];

export const RANGE_ALL = 'A:K';

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
];

export const RANGE_LOGS_ALL = 'Logs!A:K';

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

let demoTransactions: AssetTransaction[] = INITIAL_DEMO_TRANSACTIONS.map((t) => ({ ...t }));
let demoLogsStore: AssetLogRecord[] = [];

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

function rowToTransaction(row: string[]): AssetTransaction {
  const actionCandidate = row?.[2];
  const statusCandidate = row?.[6];
  return {
    id: row?.[0] ?? '',
    timestamp: row?.[1] ?? '',
    action: (actionCandidate as TransactionAction) || 'บันทึกรายการใหม่',
    assetCode: row?.[3] ?? '',
    name: row?.[4] ?? '',
    location: row?.[5] ?? '',
    status: isValidAssetStatus(statusCandidate) ? statusCandidate : 'พร้อมใช้งาน',
    responsiblePerson: row?.[7] ?? '',
    recordedBy: row?.[8] ?? '',
    notes: row?.[9] ?? '',
    imageUrl: row?.[10]?.trim() || undefined,
  };
}

function transactionToRow(tx: AssetTransaction): string[] {
  let cleanImageUrl = tx.imageUrl?.trim() || '';
  // Google Sheets cell character limit is 50,000; reject local blob: URIs and oversize strings
  if (cleanImageUrl.startsWith('blob:') || cleanImageUrl.length > 5000) {
    cleanImageUrl = '';
  }
  return [
    tx.id,
    tx.timestamp,
    tx.action,
    tx.assetCode,
    tx.name,
    tx.location,
    tx.status,
    tx.responsiblePerson,
    tx.recordedBy,
    tx.notes,
    cleanImageUrl,
  ];
}

function rowToLogRecord(row: string[], codeToIdMap?: Map<string, string>): AssetLogRecord {
  const assetCode = row?.[3] ?? '';
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
    assetId: codeToIdMap?.get(assetCode) ?? '',
  };
}

function logToRow(log: AssetLogRecord): string[] {
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

  const res = await drive.files.create({
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

async function ensureHeaderRow(sheets: sheets_v4.Sheets, spreadsheetId: string): Promise<string[][]> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: RANGE_ALL,
  });

  const values = res.data.values;
  if (!values || values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'A1:K1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [HEADER_ROW] },
    });
    return [HEADER_ROW];
  }

  // Self-healing: if the existing header doesn't match HEADER_ROW, update it
  if (values[0]?.[1] !== HEADER_ROW[1] || values[0].length < HEADER_ROW.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'A1:K1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [HEADER_ROW] },
    });
    values[0] = HEADER_ROW;
  }

  return values;
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
    range: 'Logs!A1:K1',
  });

  const values = res?.data?.values;
  if (!values || values.length === 0 || !values[0] || values[0].length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Logs!A1:K1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [LOG_HEADER_ROW] },
    });
    return [LOG_HEADER_ROW];
  }

  return values;
}

export const sheetsService = {
  resetDemoStore(): void {
    demoTransactions = INITIAL_DEMO_TRANSACTIONS.map((t) => ({ ...t }));
    demoLogsStore = [];
  },

  async getTransactions(): Promise<AssetTransaction[]> {
    const client = getSheetsClient();
    if (!client) {
      return demoTransactions.map((t) => ({ ...t }));
    }

    const { sheets, spreadsheetId } = client;
    const values = await ensureHeaderRow(sheets, spreadsheetId);

    const dataRows = values.slice(1);
    return dataRows
      .filter((row) => row && row[0] && row[0].trim().length > 0)
      .map(rowToTransaction);
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
        const codeToIdMap = new Map<string, string>();
        for (const r of records) {
          codeToIdMap.set(r.assetCode, r.id);
        }
        let logs = values
          .slice(1)
          .reverse()
          .filter((row) => row && row[0] && row[0].trim().length > 0)
          .map((row) => rowToLogRecord(row, codeToIdMap));

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
    };

    const client = getSheetsClient();
    if (!client) {
      demoTransactions.push(newTx);
    } else {
      const { sheets, spreadsheetId } = client;
      await ensureHeaderRow(sheets, spreadsheetId);

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: RANGE_ALL,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [transactionToRow(newTx)],
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

    const now = sanitizedData.updatedAt ?? new Date().toISOString();
    const newTx: AssetTransaction = {
      id: generateId(),
      timestamp: now,
      action: 'แก้ไข/ย้ายตำแหน่ง',
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
    };

    const client = getSheetsClient();
    if (!client) {
      demoTransactions.push(newTx);
    } else {
      const { sheets, spreadsheetId } = client;
      await ensureHeaderRow(sheets, spreadsheetId);

      // Append transaction to sheet (never in-place overwrite)
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: RANGE_ALL,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [transactionToRow(newTx)],
        },
      });
    }

    const diff = computeAssetDiff(
      existing,
      sanitizedData,
      sanitizedData.recordedBy || newTx.recordedBy || 'ระบบ',
      sanitizedData.notes
    );

    if (diff) {
      const logRecord: AssetLogRecord = {
        id: generateId(),
        timestamp: newTx.timestamp,
        ...diff,
        assetId: existing.id,
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
    };

    const client = getSheetsClient();
    if (!client) {
      demoTransactions.push(newTx);
    } else {
      const { sheets, spreadsheetId } = client;
      await ensureHeaderRow(sheets, spreadsheetId);

      // Append decommission transaction (never deleteDimension)
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: RANGE_ALL,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [transactionToRow(newTx)],
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
    };

    try {
      await this.appendLog(logRecord);
    } catch (logErr) {
      console.error('Failed to append audit log for deleteRecord:', logErr);
    }

    return true;
  },
};

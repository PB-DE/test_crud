import { google, sheets_v4 } from 'googleapis';
import { getEnvConfig } from './env';
import {
  AssetRecord,
  CreateAssetInput,
  UpdateAssetInput,
  isValidAssetStatus,
  AssetLogRecord,
  LogAction,
} from './types';
import { computeAssetDiff } from './log-utils';

export const HEADER_ROW = [
  'ID',
  'รหัสครุภัณฑ์',
  'ชื่อครุภัณฑ์',
  'ตำแหน่งที่ตั้ง',
  'สถานะ',
  'ผู้รับผิดชอบ',
  'ผู้บันทึก',
  'หมายเหตุ',
  'วันที่บันทึก',
  'วันที่แก้ไข',
];

export const RANGE_ALL = 'A:J';

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

const INITIAL_DEMO_RECORDS: AssetRecord[] = [
  {
    id: 'rec-demo-001',
    assetCode: 'EQ-2026-001',
    name: 'คอมพิวเตอร์ All-in-One Dell OptiPlex 7400',
    location: 'ฝ่ายเทคโนโลยีสารสนเทศ ชั้น 4',
    status: 'พร้อมใช้งาน',
    responsiblePerson: 'นายสมเกียรติ ยั่งยืน',
    recordedBy: 'นางสาววิไลลักษณ์ มั่นคง',
    notes: 'ติดตั้งชุดโปรแกรมสำนักงานและระบบความปลอดภัยครบถ้วน',
    createdAt: '2026-01-15T09:00:00.000Z',
    updatedAt: '2026-01-15T09:00:00.000Z',
  },
  {
    id: 'rec-demo-002',
    assetCode: 'EQ-2026-002',
    name: 'เครื่องพิมพ์มัลติฟังก์ชัน HP LaserJet Pro',
    location: 'กองบริหารงานทั่วไป ชั้น 2',
    status: 'กำลังใช้งาน',
    responsiblePerson: 'นางสาวพัชรี นวลจันทร์',
    recordedBy: 'นางสาววิไลลักษณ์ มั่นคง',
    notes: 'ใช้งานส่วนกลางสำหรับพิมพ์เอกสารราชการ',
    createdAt: '2026-02-01T10:30:00.000Z',
    updatedAt: '2026-02-10T14:15:00.000Z',
  },
  {
    id: 'rec-demo-003',
    assetCode: 'EQ-2026-003',
    name: 'จอมอนิเตอร์ Dell UltraSharp 27 นิ้ว 4K',
    location: 'ฝ่ายออกแบบและสื่อสิ่งพิมพ์ ชั้น 3',
    status: 'ส่งซ่อม',
    responsiblePerson: 'นายอนุรักษ์ รอบรู้',
    recordedBy: 'นายวีระ ศักดิ์ศรี',
    notes: 'ส่งศูนย์ซ่อมเคลมพาเนลหน้าจอ อาการกระพริบ',
    createdAt: '2026-03-01T08:45:00.000Z',
    updatedAt: '2026-03-05T11:20:00.000Z',
  },
  {
    id: 'rec-demo-004',
    assetCode: 'EQ-2026-004',
    name: 'เก้าอี้สำนักงานเพื่อสุขภาพ Ergonomic Steelcase',
    location: 'ห้องประชุมผู้บริหาร ชั้น 5',
    status: 'จำหน่าย/ตัดบัญชี',
    responsiblePerson: 'นายประจักษ์ เกียรติดำรง',
    recordedBy: 'นายวีระ ศักดิ์ศรี',
    notes: 'แกนโช๊คชำรุดตามอายุการใช้งาน เกินระยะคุ้มค่าซ่อม',
    createdAt: '2025-11-20T11:00:00.000Z',
    updatedAt: '2026-01-05T16:20:00.000Z',
  },
];

let demoStore: AssetRecord[] = INITIAL_DEMO_RECORDS.map((r) => ({ ...r }));
let demoLogsStore: AssetLogRecord[] = [];

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'rec-' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

function rowToRecord(row: string[]): AssetRecord {
  const statusCandidate = row?.[4];
  return {
    id: row?.[0] ?? '',
    assetCode: row?.[1] ?? '',
    name: row?.[2] ?? '',
    location: row?.[3] ?? '',
    status: isValidAssetStatus(statusCandidate) ? statusCandidate : 'พร้อมใช้งาน',
    responsiblePerson: row?.[5] ?? '',
    recordedBy: row?.[6] ?? '',
    notes: row?.[7] ?? '',
    createdAt: row?.[8] ?? '',
    updatedAt: row?.[9] ?? '',
  };
}

function recordToRow(record: AssetRecord): string[] {
  return [
    record.id,
    record.assetCode,
    record.name,
    record.location,
    record.status,
    record.responsiblePerson,
    record.recordedBy,
    record.notes,
    record.createdAt,
    record.updatedAt,
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

function getSheetsClient() {
  const config = getEnvConfig();
  if (!config.isConfigured || !config.spreadsheetId || !config.clientEmail || !config.privateKey) {
    return null;
  }

  const auth = new google.auth.JWT({
    email: config.clientEmail,
    key: config.privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  return { sheets, spreadsheetId: config.spreadsheetId };
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
      range: 'A1:J1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [HEADER_ROW] },
    });
    return [HEADER_ROW];
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
    demoStore = INITIAL_DEMO_RECORDS.map((r) => ({ ...r }));
    demoLogsStore = [];
  },

  async getRecords(): Promise<AssetRecord[]> {
    const client = getSheetsClient();
    if (!client) {
      return [...demoStore];
    }

    const { sheets, spreadsheetId } = client;
    const values = await ensureHeaderRow(sheets, spreadsheetId);

    // Skip the header row (index 0) and filter out empty rows
    const dataRows = values.slice(1);
    return dataRows
      .filter((row) => row && row[0] && row[0].trim().length > 0)
      .map(rowToRecord);
  },

  async getRecordById(id: string): Promise<AssetRecord | null> {
    const records = await this.getRecords();
    return records.find((r) => r.id === id) ?? null;
  },

  async getLogs(filter?: { assetId?: string; assetCode?: string }): Promise<AssetLogRecord[]> {
    const client = getSheetsClient();
    if (!client) {
      let logs = [...demoLogsStore].reverse();
      if (filter?.assetId) {
        logs = logs.filter((l) => l.assetId === filter.assetId);
      }
      if (filter?.assetCode) {
        logs = logs.filter((l) => l.assetCode === filter.assetCode);
      }
      return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    const { sheets, spreadsheetId } = client;
    await ensureLogsSheet(sheets, spreadsheetId);

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: RANGE_LOGS_ALL,
    });

    const values = res?.data?.values;
    if (!values || values.length <= 1) {
      return [];
    }

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

    const dataRows = values.slice(1).reverse();
    let logs = dataRows
      .filter((row) => row && row[0] && row[0].trim().length > 0)
      .map((row) => rowToLogRecord(row, codeToIdMap));

    if (filter?.assetId) {
      const targetAsset = records.find((r) => r.id === filter.assetId);
      const targetCode = targetAsset?.assetCode;
      logs = logs.filter(
        (l) =>
          (l.assetId && l.assetId === filter.assetId) ||
          (targetCode && l.assetCode === targetCode)
      );
    }
    if (filter?.assetCode) {
      logs = logs.filter((l) => l.assetCode === filter.assetCode);
    }

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
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

  async createRecord(data: CreateAssetInput): Promise<AssetRecord> {
    const now = new Date().toISOString();
    const newRecord: AssetRecord = {
      id: generateId(),
      assetCode: data.assetCode,
      name: data.name,
      location: data.location,
      status: data.status,
      responsiblePerson: data.responsiblePerson,
      recordedBy: data.recordedBy,
      notes: data.notes || '',
      createdAt: now,
      updatedAt: now,
    };

    const client = getSheetsClient();
    if (!client) {
      demoStore.push(newRecord);
    } else {
      const { sheets, spreadsheetId } = client;
      await ensureHeaderRow(sheets, spreadsheetId);

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: RANGE_ALL,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [recordToRow(newRecord)],
        },
      });
    }

    const logRecord: AssetLogRecord = {
      id: generateId(),
      timestamp: now,
      action: 'บันทึกรายการใหม่',
      assetId: newRecord.id,
      assetCode: newRecord.assetCode,
      name: newRecord.name,
      locationChange: `- ➔ ${newRecord.location}`,
      responsibleChange: `- ➔ ${newRecord.responsiblePerson}`,
      statusChange: `- ➔ ${newRecord.status}`,
      changeSummary: 'บันทึกครุภัณฑ์ใหม่เข้าสู่ระบบ',
      recordedBy: newRecord.recordedBy,
      notes: newRecord.notes || '',
    };

    try {
      await this.appendLog(logRecord);
    } catch (logErr) {
      console.error('Failed to append audit log for createRecord:', logErr);
    }

    return newRecord;
  },

  async updateRecord(id: string, data: UpdateAssetInput): Promise<AssetRecord | null> {
    const client = getSheetsClient();
    let oldRecord: AssetRecord;
    let updatedRecord: AssetRecord;

    if (!client) {
      const index = demoStore.findIndex((r) => r.id === id);
      if (index === -1) return null;

      oldRecord = demoStore[index];
      updatedRecord = {
        ...oldRecord,
        ...data,
        id: oldRecord.id,
        createdAt: oldRecord.createdAt,
        updatedAt: data.updatedAt ?? new Date().toISOString(),
      };
      demoStore[index] = updatedRecord;
    } else {
      const { sheets, spreadsheetId } = client;
      const values = await ensureHeaderRow(sheets, spreadsheetId);

      // Find row index (0 is header)
      const rowIndex = values.findIndex((row, idx) => idx > 0 && row?.[0] === id);
      if (rowIndex === -1) return null;

      const currentRow = values[rowIndex];
      oldRecord = rowToRecord(currentRow);
      updatedRecord = {
        ...oldRecord,
        ...data,
        id: oldRecord.id,
        createdAt: oldRecord.createdAt,
        updatedAt: data.updatedAt ?? new Date().toISOString(),
      };

      const sheetRowNum = rowIndex + 1;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `A${sheetRowNum}:J${sheetRowNum}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [recordToRow(updatedRecord)],
        },
      });
    }

    const diff = computeAssetDiff(
      oldRecord,
      data,
      data.recordedBy || updatedRecord.recordedBy || 'ระบบ',
      data.notes
    );

    if (diff) {
      const logRecord: AssetLogRecord = {
        id: generateId(),
        timestamp: updatedRecord.updatedAt,
        ...diff,
      };
      try {
        await this.appendLog(logRecord);
      } catch (logErr) {
        console.error('Failed to append audit log for updateRecord:', logErr);
      }
    }

    return updatedRecord;
  },

  async deleteRecord(id: string): Promise<boolean> {
    const client = getSheetsClient();
    let deletedRecord: AssetRecord;

    if (!client) {
      const index = demoStore.findIndex((r) => r.id === id);
      if (index === -1) return false;
      deletedRecord = demoStore[index];
      demoStore.splice(index, 1);
    } else {
      const { sheets, spreadsheetId } = client;
      const values = await ensureHeaderRow(sheets, spreadsheetId);

      const rowIndex = values.findIndex((row, idx) => idx > 0 && row?.[0] === id);
      if (rowIndex === -1) return false;

      deletedRecord = rowToRecord(values[rowIndex]);

      // Get the non-Logs sheet's ID for deleteDimension
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
      const targetSheet = spreadsheet.data.sheets?.find(
        (s) => s.properties?.title && s.properties.title !== 'Logs'
      ) ?? spreadsheet.data.sheets?.[0];
      const sheetId = targetSheet?.properties?.sheetId ?? 0;

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId,
                  dimension: 'ROWS',
                  startIndex: rowIndex,
                  endIndex: rowIndex + 1,
                },
              },
            },
          ],
        },
      });
    }

    const logRecord: AssetLogRecord = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      action: 'ลบรายการ',
      assetId: deletedRecord.id,
      assetCode: deletedRecord.assetCode,
      name: deletedRecord.name,
      locationChange: `${deletedRecord.location || '-'} ➔ -`,
      responsibleChange: `${deletedRecord.responsiblePerson || '-'} ➔ -`,
      statusChange: `${deletedRecord.status || '-'} ➔ -`,
      changeSummary: 'ลบรายการครุภัณฑ์ออกจากระบบ',
      recordedBy: deletedRecord.recordedBy || 'ระบบ',
      notes: deletedRecord.notes || '',
    };

    try {
      await this.appendLog(logRecord);
    } catch (logErr) {
      console.error('Failed to append audit log for deleteRecord:', logErr);
    }

    return true;
  },
};

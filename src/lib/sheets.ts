import { google, sheets_v4 } from 'googleapis';
import { getEnvConfig } from './env';
import {
  AssetRecord,
  CreateAssetInput,
  UpdateAssetInput,
  isValidAssetStatus,
} from './types';

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

export const sheetsService = {
  resetDemoStore(): void {
    demoStore = INITIAL_DEMO_RECORDS.map((r) => ({ ...r }));
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
      return newRecord;
    }

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

    return newRecord;
  },

  async updateRecord(id: string, data: UpdateAssetInput): Promise<AssetRecord | null> {
    const client = getSheetsClient();
    if (!client) {
      const index = demoStore.findIndex((r) => r.id === id);
      if (index === -1) return null;

      const current = demoStore[index];
      const updated: AssetRecord = {
        ...current,
        ...data,
        id: current.id,
        createdAt: current.createdAt,
        updatedAt: data.updatedAt ?? new Date().toISOString(),
      };
      demoStore[index] = updated;
      return updated;
    }

    const { sheets, spreadsheetId } = client;
    const values = await ensureHeaderRow(sheets, spreadsheetId);

    // Find row index (0 is header)
    const rowIndex = values.findIndex((row, idx) => idx > 0 && row?.[0] === id);
    if (rowIndex === -1) return null;

    const currentRow = values[rowIndex];
    const currentRecord = rowToRecord(currentRow);
    const updatedRecord: AssetRecord = {
      ...currentRecord,
      ...data,
      id: currentRecord.id,
      createdAt: currentRecord.createdAt,
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

    return updatedRecord;
  },

  async deleteRecord(id: string): Promise<boolean> {
    const client = getSheetsClient();
    if (!client) {
      const index = demoStore.findIndex((r) => r.id === id);
      if (index === -1) return false;
      demoStore.splice(index, 1);
      return true;
    }

    const { sheets, spreadsheetId } = client;
    const values = await ensureHeaderRow(sheets, spreadsheetId);

    const rowIndex = values.findIndex((row, idx) => idx > 0 && row?.[0] === id);
    if (rowIndex === -1) return false;

    // Get the first sheet's ID for deleteDimension
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetId = spreadsheet.data.sheets?.[0]?.properties?.sheetId ?? 0;

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

    return true;
  },
};

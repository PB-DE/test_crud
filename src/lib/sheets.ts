import { google, sheets_v4 } from 'googleapis';
import { getEnvConfig } from './env';
import { RecordItem, CreateRecordInput, UpdateRecordInput } from './types';

export const HEADER_ROW = [
  'ID',
  'Name',
  'Email',
  'Role',
  'Status',
  'Notes',
  'Created At',
  'Updated At',
];

export const RANGE_ALL = 'A:H';

const INITIAL_DEMO_RECORDS: RecordItem[] = [
  {
    id: 'rec-demo-001',
    name: 'Sarah Connor',
    email: 'sarah.c@skytech.io',
    role: 'Engineering Lead',
    status: 'Active',
    notes: 'Tech stack modernization champion',
    createdAt: '2026-01-15T09:00:00.000Z',
    updatedAt: '2026-01-15T09:00:00.000Z',
  },
  {
    id: 'rec-demo-002',
    name: 'Alex Rivera',
    email: 'alex.r@skytech.io',
    role: 'Product Designer',
    status: 'Active',
    notes: 'Leading mobile app redesign',
    createdAt: '2026-02-01T10:30:00.000Z',
    updatedAt: '2026-02-10T14:15:00.000Z',
  },
  {
    id: 'rec-demo-003',
    name: 'David Chen',
    email: 'david.c@skytech.io',
    role: 'DevOps Engineer',
    status: 'Pending',
    notes: 'Onboarding in progress, awaiting cloud access',
    createdAt: '2026-03-01T08:45:00.000Z',
    updatedAt: '2026-03-01T08:45:00.000Z',
  },
  {
    id: 'rec-demo-004',
    name: 'Elena Rostova',
    email: 'elena.r@skytech.io',
    role: 'Data Scientist',
    status: 'Inactive',
    notes: 'On sabbatical until Q4',
    createdAt: '2025-11-20T11:00:00.000Z',
    updatedAt: '2026-01-05T16:20:00.000Z',
  },
];

let demoStore: RecordItem[] = INITIAL_DEMO_RECORDS.map((r) => ({ ...r }));

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'rec-' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

function rowToRecord(row: string[]): RecordItem {
  return {
    id: row[0] ?? '',
    name: row[1] ?? '',
    email: row[2] ?? '',
    role: row[3] ?? '',
    status: (row[4] as RecordItem['status']) || 'Pending',
    notes: row[5] ?? '',
    createdAt: row[6] ?? '',
    updatedAt: row[7] ?? '',
  };
}

function recordToRow(record: RecordItem): string[] {
  return [
    record.id,
    record.name,
    record.email,
    record.role,
    record.status,
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
      range: 'A1:H1',
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

  async getRecords(): Promise<RecordItem[]> {
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

  async getRecordById(id: string): Promise<RecordItem | null> {
    const records = await this.getRecords();
    return records.find((r) => r.id === id) ?? null;
  },

  async createRecord(data: CreateRecordInput): Promise<RecordItem> {
    const now = new Date().toISOString();
    const newRecord: RecordItem = {
      id: generateId(),
      name: data.name,
      email: data.email,
      role: data.role,
      status: data.status,
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

  async updateRecord(id: string, data: UpdateRecordInput): Promise<RecordItem | null> {
    const client = getSheetsClient();
    if (!client) {
      const index = demoStore.findIndex((r) => r.id === id);
      if (index === -1) return null;

      const current = demoStore[index];
      const updated: RecordItem = {
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
    const rowIndex = values.findIndex((row, idx) => idx > 0 && row[0] === id);
    if (rowIndex === -1) return null;

    const currentRow = values[rowIndex];
    const currentRecord = rowToRecord(currentRow);
    const updatedRecord: RecordItem = {
      ...currentRecord,
      ...data,
      id: currentRecord.id,
      createdAt: currentRecord.createdAt,
      updatedAt: data.updatedAt ?? new Date().toISOString(),
    };

    const sheetRowNum = rowIndex + 1;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `A${sheetRowNum}:H${sheetRowNum}`,
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

    const rowIndex = values.findIndex((row, idx) => idx > 0 && row[0] === id);
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

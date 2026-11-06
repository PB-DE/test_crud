import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { sheetsService, HEADER_ROW, RANGE_ALL } from '../src/lib/sheets';
import * as envModule from '../src/lib/env';
import { google } from 'googleapis';

describe('sheetsService (demo mode)', () => {
  beforeEach(async () => {
    sheetsService.resetDemoStore();
  });

  it('creates and lists records in demo mode when credentials are not configured', async () => {
    const records = await sheetsService.getRecords();
    const initialCount = records.length;
    expect(initialCount).toBeGreaterThan(0);

    const created = await sheetsService.createRecord({
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: 'Developer',
      status: 'Active',
      notes: 'Initial hire',
    });

    expect(created.id).toBeDefined();
    expect(created.name).toBe('Jane Doe');
    expect(created.createdAt).toBeDefined();
    expect(created.updatedAt).toBeDefined();

    const updatedList = await sheetsService.getRecords();
    expect(updatedList.length).toBe(initialCount + 1);
  });

  it('finds a record by id', async () => {
    const records = await sheetsService.getRecords();
    const first = records[0];

    const found = await sheetsService.getRecordById(first.id);
    expect(found).toEqual(first);

    const notFound = await sheetsService.getRecordById('non-existent-id');
    expect(notFound).toBeNull();
  });

  it('updates an existing record by id', async () => {
    const created = await sheetsService.createRecord({
      name: 'Bob Smith',
      email: 'bob@example.com',
      role: 'Designer',
      status: 'Pending',
      notes: '',
    });

    const updated = await sheetsService.updateRecord(created.id, {
      status: 'Active',
      role: 'Lead Designer',
    });

    expect(updated?.status).toBe('Active');
    expect(updated?.role).toBe('Lead Designer');
    expect(updated?.email).toBe('bob@example.com');
    expect(updated?.id).toBe(created.id);
    expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(created.updatedAt).getTime());

    const notFound = await sheetsService.updateRecord('non-existent-id', {
      status: 'Active',
    });
    expect(notFound).toBeNull();
  });

  it('deletes an existing record by id', async () => {
    const created = await sheetsService.createRecord({
      name: 'Alice Cooper',
      email: 'alice@example.com',
      role: 'QA',
      status: 'Active',
      notes: '',
    });

    const success = await sheetsService.deleteRecord(created.id);
    expect(success).toBe(true);

    const found = await sheetsService.getRecordById(created.id);
    expect(found).toBeNull();

    const notFoundSuccess = await sheetsService.deleteRecord('non-existent-id');
    expect(notFoundSuccess).toBe(false);
  });

  it('resets demo store to initial state', async () => {
    const initialRecords = await sheetsService.getRecords();
    const initialCount = initialRecords.length;

    await sheetsService.createRecord({
      name: 'Temp User',
      email: 'temp@example.com',
      role: 'Intern',
      status: 'Pending',
      notes: '',
    });

    sheetsService.resetDemoStore();
    const resetRecords = await sheetsService.getRecords();
    expect(resetRecords.length).toBe(initialCount);
  });
});

describe('sheetsService (Google Sheets mode)', () => {
  let mockValuesGet: any;
  let mockValuesUpdate: any;
  let mockValuesAppend: any;
  let mockSpreadsheetsGet: any;
  let mockBatchUpdate: any;

  beforeEach(() => {
    vi.spyOn(envModule, 'getEnvConfig').mockReturnValue({
      spreadsheetId: 'test-sheet-id',
      clientEmail: 'test@serviceaccount.com',
      privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgk...',
      isConfigured: true,
    });

    mockValuesGet = vi.fn();
    mockValuesUpdate = vi.fn().mockResolvedValue({});
    mockValuesAppend = vi.fn().mockResolvedValue({});
    mockSpreadsheetsGet = vi.fn().mockResolvedValue({
      data: {
        sheets: [{ properties: { sheetId: 12345 } }],
      },
    });
    mockBatchUpdate = vi.fn().mockResolvedValue({});

    vi.spyOn(google, 'sheets').mockReturnValue({
      spreadsheets: {
        get: mockSpreadsheetsGet,
        batchUpdate: mockBatchUpdate,
        values: {
          get: mockValuesGet,
          update: mockValuesUpdate,
          append: mockValuesAppend,
        },
      },
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('auto-initializes header row when sheet is blank and returns empty records', async () => {
    mockValuesGet.mockResolvedValueOnce({
      data: { values: [] },
    });

    const records = await sheetsService.getRecords();
    expect(records).toEqual([]);

    expect(mockValuesUpdate).toHaveBeenCalledWith({
      spreadsheetId: 'test-sheet-id',
      range: 'A1:H1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [HEADER_ROW] },
    });
  });

  it('reads and parses existing records from Google Sheet', async () => {
    mockValuesGet.mockResolvedValueOnce({
      data: {
        values: [
          HEADER_ROW,
          ['rec-1', 'John Doe', 'john@test.com', 'Engineer', 'Active', 'Good hire', '2026-01-01', '2026-01-02'],
          ['', '', '', '', '', '', '', ''], // empty row to verify filter
          ['rec-2', 'Jane Smith', 'jane@test.com', 'Manager', 'Pending', '', '2026-01-03', '2026-01-03'],
        ],
      },
    });

    const records = await sheetsService.getRecords();
    expect(records.length).toBe(2);
    expect(records[0]).toEqual({
      id: 'rec-1',
      name: 'John Doe',
      email: 'john@test.com',
      role: 'Engineer',
      status: 'Active',
      notes: 'Good hire',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-02',
    });
    expect(records[1].name).toBe('Jane Smith');
    expect(records[1].status).toBe('Pending');
  });

  it('creates record by appending row to sheet', async () => {
    mockValuesGet.mockResolvedValueOnce({
      data: {
        values: [HEADER_ROW],
      },
    });

    const created = await sheetsService.createRecord({
      name: 'New Person',
      email: 'new@test.com',
      role: 'Analyst',
      status: 'Active',
      notes: 'Notes here',
    });

    expect(created.id).toBeDefined();
    expect(created.name).toBe('New Person');
    expect(mockValuesAppend).toHaveBeenCalledTimes(1);

    const callArgs = mockValuesAppend.mock.calls[0][0];
    expect(callArgs.spreadsheetId).toBe('test-sheet-id');
    expect(callArgs.range).toBe(RANGE_ALL);
    expect(callArgs.requestBody.values[0][1]).toBe('New Person');
    expect(callArgs.requestBody.values[0][2]).toBe('new@test.com');
  });

  it('updates an existing row by looking up unique id', async () => {
    mockValuesGet.mockResolvedValueOnce({
      data: {
        values: [
          HEADER_ROW, // row 1
          ['rec-1', 'John Doe', 'john@test.com', 'Engineer', 'Active', '', '2026-01-01', '2026-01-01'], // row 2
          ['rec-2', 'Jane Smith', 'jane@test.com', 'Manager', 'Pending', '', '2026-01-02', '2026-01-02'], // row 3
        ],
      },
    });

    const updated = await sheetsService.updateRecord('rec-2', {
      role: 'Senior Manager',
      status: 'Active',
    });

    expect(updated).not.toBeNull();
    expect(updated?.id).toBe('rec-2');
    expect(updated?.role).toBe('Senior Manager');
    expect(updated?.status).toBe('Active');

    expect(mockValuesUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        spreadsheetId: 'test-sheet-id',
        range: 'A3:H3', // Row 3 in sheet
        valueInputOption: 'USER_ENTERED',
      })
    );
  });

  it('returns null when updating non-existent record in Google Sheet', async () => {
    mockValuesGet.mockResolvedValueOnce({
      data: {
        values: [HEADER_ROW, ['rec-1', 'John', 'j@test.com', 'Dev', 'Active', '', '2026-01-01', '2026-01-01']],
      },
    });

    const updated = await sheetsService.updateRecord('rec-999', {
      status: 'Inactive',
    });
    expect(updated).toBeNull();
    expect(mockValuesUpdate).not.toHaveBeenCalled();
  });

  it('deletes an existing row by id using deleteDimension batchUpdate', async () => {
    mockValuesGet.mockResolvedValueOnce({
      data: {
        values: [
          HEADER_ROW, // index 0 (row 1)
          ['rec-1', 'John Doe', 'john@test.com', 'Engineer', 'Active', '', '2026-01-01', '2026-01-01'], // index 1 (row 2)
          ['rec-2', 'Jane Smith', 'jane@test.com', 'Manager', 'Pending', '', '2026-01-02', '2026-01-02'], // index 2 (row 3)
        ],
      },
    });

    const success = await sheetsService.deleteRecord('rec-2');
    expect(success).toBe(true);

    expect(mockBatchUpdate).toHaveBeenCalledWith({
      spreadsheetId: 'test-sheet-id',
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: 12345,
                dimension: 'ROWS',
                startIndex: 2,
                endIndex: 3,
              },
            },
          },
        ],
      },
    });
  });

  it('returns false when deleting a non-existent record in Google Sheet', async () => {
    mockValuesGet.mockResolvedValueOnce({
      data: {
        values: [HEADER_ROW, ['rec-1', 'John', 'j@test.com', 'Dev', 'Active', '', '2026-01-01', '2026-01-01']],
      },
    });

    const success = await sheetsService.deleteRecord('rec-999');
    expect(success).toBe(false);
    expect(mockBatchUpdate).not.toHaveBeenCalled();
  });
});

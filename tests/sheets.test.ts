import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { sheetsService, HEADER_ROW, RANGE_ALL } from '../src/lib/sheets';
import * as envModule from '../src/lib/env';
import { google } from 'googleapis';

describe('HEADER_ROW and RANGE_ALL constants', () => {
  it('defines the correct 10 Thai column headers for asset tracking', () => {
    expect(HEADER_ROW).toEqual([
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
    ]);
  });

  it('defines the correct column range A:J', () => {
    expect(RANGE_ALL).toBe('A:J');
  });
});

describe('sheetsService (demo mode)', () => {
  beforeEach(async () => {
    sheetsService.resetDemoStore();
  });

  it('creates and lists records in demo mode when credentials are not configured', async () => {
    const records = await sheetsService.getRecords();
    const initialCount = records.length;
    expect(initialCount).toBeGreaterThan(0);

    const created = await sheetsService.createRecord({
      assetCode: 'EQ-2026-999',
      name: 'เครื่องสแกนบาร์โค้ดไร้สาย Zebra DS2278',
      location: 'ฝ่ายเทคโนโลยีสารสนเทศ ชั้น 4',
      status: 'พร้อมใช้งาน',
      responsiblePerson: 'สมชาย สายตรวจ',
      recordedBy: 'สุพัตรา สารสนเทศ',
      notes: 'รับมอบใหม่ ประกัน 3 ปี',
    });

    expect(created.id).toBeDefined();
    expect(created.assetCode).toBe('EQ-2026-999');
    expect(created.name).toBe('เครื่องสแกนบาร์โค้ดไร้สาย Zebra DS2278');
    expect(created.location).toBe('ฝ่ายเทคโนโลยีสารสนเทศ ชั้น 4');
    expect(created.status).toBe('พร้อมใช้งาน');
    expect(created.responsiblePerson).toBe('สมชาย สายตรวจ');
    expect(created.recordedBy).toBe('สุพัตรา สารสนเทศ');
    expect(created.notes).toBe('รับมอบใหม่ ประกัน 3 ปี');
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
      assetCode: 'EQ-2026-101',
      name: 'เครื่องสำรองไฟ APC 1000VA',
      location: 'ห้องเซิร์ฟเวอร์ ชั้น 2',
      status: 'พร้อมใช้งาน',
      responsiblePerson: 'วิชัย ปลอดภัย',
      recordedBy: 'สมชาย สายตรวจ',
      notes: '',
    });

    const updated = await sheetsService.updateRecord(created.id, {
      status: 'กำลังใช้งาน',
      location: 'ห้องเครือข่าย ชั้น 3',
      responsiblePerson: 'ประเสริฐ ดียิ่ง',
    });

    expect(updated?.status).toBe('กำลังใช้งาน');
    expect(updated?.location).toBe('ห้องเครือข่าย ชั้น 3');
    expect(updated?.responsiblePerson).toBe('ประเสริฐ ดียิ่ง');
    expect(updated?.assetCode).toBe('EQ-2026-101');
    expect(updated?.id).toBe(created.id);
    expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(created.updatedAt).getTime());

    const notFound = await sheetsService.updateRecord('non-existent-id', {
      status: 'กำลังใช้งาน',
    });
    expect(notFound).toBeNull();
  });

  it('deletes an existing record by id', async () => {
    const created = await sheetsService.createRecord({
      assetCode: 'EQ-2026-102',
      name: 'เก้าอี้สำนักงานทดสอบ',
      location: 'ห้องเก็บของ',
      status: 'จำหน่าย/ตัดบัญชี',
      responsiblePerson: 'สมชาย สายตรวจ',
      recordedBy: 'สุพัตรา สารสนเทศ',
      notes: 'รอทิ้ง',
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
      assetCode: 'EQ-2026-103',
      name: 'อุปกรณ์ชั่วคราว',
      location: 'จุดพักของ',
      status: 'พร้อมใช้งาน',
      responsiblePerson: 'ทดสอบ ผู้รับ',
      recordedBy: 'ทดสอบ ผู้บันทึก',
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
      range: 'A1:J1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [HEADER_ROW] },
    });
  });

  it('reads and parses existing records from Google Sheet', async () => {
    mockValuesGet.mockResolvedValueOnce({
      data: {
        values: [
          HEADER_ROW,
          [
            'rec-1',
            'EQ-2026-001',
            'คอมพิวเตอร์ All-in-One Dell OptiPlex',
            'อาคาร 1 ชั้น 3 ห้อง 302',
            'พร้อมใช้งาน',
            'นายสมเกียรติ ยั่งยืน',
            'นางสาววิไลลักษณ์ มั่นคง',
            'สภาพสมบูรณ์',
            '2026-01-01T08:00:00.000Z',
            '2026-01-02T09:00:00.000Z',
          ],
          ['', '', '', '', '', '', '', '', '', ''], // empty row to verify filter
          [
            'rec-2',
            'EQ-2026-002',
            'เครื่องพิมพ์เลเซอร์ HP LaserJet',
            'ฝ่ายสารสนเทศ ชั้น 2',
            'ส่งซ่อม',
            'นายอนุรักษ์ รอบรู้',
            'นายวีระ ศักดิ์ศรี',
            'ดรัมหมึกมีปัญหา',
            '2026-01-03T10:00:00.000Z',
            '2026-01-03T10:00:00.000Z',
          ],
        ],
      },
    });

    const records = await sheetsService.getRecords();
    expect(records.length).toBe(2);
    expect(records[0]).toEqual({
      id: 'rec-1',
      assetCode: 'EQ-2026-001',
      name: 'คอมพิวเตอร์ All-in-One Dell OptiPlex',
      location: 'อาคาร 1 ชั้น 3 ห้อง 302',
      status: 'พร้อมใช้งาน',
      responsiblePerson: 'นายสมเกียรติ ยั่งยืน',
      recordedBy: 'นางสาววิไลลักษณ์ มั่นคง',
      notes: 'สภาพสมบูรณ์',
      createdAt: '2026-01-01T08:00:00.000Z',
      updatedAt: '2026-01-02T09:00:00.000Z',
    });
    expect(records[1].assetCode).toBe('EQ-2026-002');
    expect(records[1].name).toBe('เครื่องพิมพ์เลเซอร์ HP LaserJet');
    expect(records[1].status).toBe('ส่งซ่อม');
  });

  it('falls back to default status when status in sheet is invalid', async () => {
    mockValuesGet.mockResolvedValueOnce({
      data: {
        values: [
          HEADER_ROW,
          [
            'rec-bad',
            'EQ-2026-999',
            'อุปกรณ์สถานะไม่ถูกต้อง',
            'ชั้น 1',
            'UnknownStatus',
            'สมชาย',
            'วิไลลักษณ์',
            '',
            '2026-01-01T08:00:00.000Z',
            '2026-01-01T08:00:00.000Z',
          ],
        ],
      },
    });

    const records = await sheetsService.getRecords();
    expect(records.length).toBe(1);
    expect(records[0].status).toBe('พร้อมใช้งาน');
  });

  it('creates record by appending row to sheet', async () => {
    mockValuesGet.mockResolvedValueOnce({
      data: {
        values: [HEADER_ROW],
      },
    });

    const created = await sheetsService.createRecord({
      assetCode: 'EQ-2026-005',
      name: 'เครื่องสำรองไฟ APC 1000VA',
      location: 'ห้อง Server 1',
      status: 'พร้อมใช้งาน',
      responsiblePerson: 'นายช่างใหญ่ ประจำตึก',
      recordedBy: 'นายบันทึก การงาน',
      notes: 'ติดตั้งแล้ว',
    });

    expect(created.id).toBeDefined();
    expect(created.assetCode).toBe('EQ-2026-005');
    expect(created.name).toBe('เครื่องสำรองไฟ APC 1000VA');
    expect(mockValuesAppend).toHaveBeenCalledTimes(1);

    const callArgs = mockValuesAppend.mock.calls[0][0];
    expect(callArgs.spreadsheetId).toBe('test-sheet-id');
    expect(callArgs.range).toBe(RANGE_ALL);
    const rowValues = callArgs.requestBody.values[0];
    expect(rowValues.length).toBe(10);
    expect(rowValues[0]).toBe(created.id);
    expect(rowValues[1]).toBe('EQ-2026-005');
    expect(rowValues[2]).toBe('เครื่องสำรองไฟ APC 1000VA');
    expect(rowValues[3]).toBe('ห้อง Server 1');
    expect(rowValues[4]).toBe('พร้อมใช้งาน');
    expect(rowValues[5]).toBe('นายช่างใหญ่ ประจำตึก');
    expect(rowValues[6]).toBe('นายบันทึก การงาน');
    expect(rowValues[7]).toBe('ติดตั้งแล้ว');
    expect(rowValues[8]).toBe(created.createdAt);
    expect(rowValues[9]).toBe(created.updatedAt);
  });

  it('updates an existing row by looking up unique id', async () => {
    mockValuesGet.mockResolvedValueOnce({
      data: {
        values: [
          HEADER_ROW, // row 1
          [
            'rec-1',
            'EQ-2026-001',
            'คอมพิวเตอร์ Dell',
            'ห้อง 101',
            'พร้อมใช้งาน',
            'สมศักดิ์',
            'สมชาย',
            '',
            '2026-01-01',
            '2026-01-01',
          ], // row 2
          [
            'rec-2',
            'EQ-2026-002',
            'เครื่องพิมพ์ HP',
            'ห้อง 102',
            'พร้อมใช้งาน',
            'วิไลลักษณ์',
            'สมชาย',
            '',
            '2026-01-02',
            '2026-01-02',
          ], // row 3
        ],
      },
    });

    const updated = await sheetsService.updateRecord('rec-2', {
      name: 'เครื่องพิมพ์ HP LaserJet Pro (อัปเกรด)',
      location: 'ห้อง 205',
      status: 'กำลังใช้งาน',
      responsiblePerson: 'วิชัย ปลอดภัย',
    });

    expect(updated).not.toBeNull();
    expect(updated?.id).toBe('rec-2');
    expect(updated?.assetCode).toBe('EQ-2026-002');
    expect(updated?.name).toBe('เครื่องพิมพ์ HP LaserJet Pro (อัปเกรด)');
    expect(updated?.location).toBe('ห้อง 205');
    expect(updated?.status).toBe('กำลังใช้งาน');
    expect(updated?.responsiblePerson).toBe('วิชัย ปลอดภัย');

    expect(mockValuesUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        spreadsheetId: 'test-sheet-id',
        range: 'A3:J3', // Row 3 in sheet with 10 columns
        valueInputOption: 'USER_ENTERED',
      })
    );

    const callArgs = mockValuesUpdate.mock.calls[0][0];
    const updatedRow = callArgs.requestBody.values[0];
    expect(updatedRow.length).toBe(10);
    expect(updatedRow[0]).toBe('rec-2');
    expect(updatedRow[1]).toBe('EQ-2026-002');
    expect(updatedRow[2]).toBe('เครื่องพิมพ์ HP LaserJet Pro (อัปเกรด)');
    expect(updatedRow[3]).toBe('ห้อง 205');
    expect(updatedRow[4]).toBe('กำลังใช้งาน');
    expect(updatedRow[5]).toBe('วิชัย ปลอดภัย');
  });

  it('returns null when updating non-existent record in Google Sheet', async () => {
    mockValuesGet.mockResolvedValueOnce({
      data: {
        values: [
          HEADER_ROW,
          ['rec-1', 'EQ-2026-001', 'คอมพิวเตอร์', 'ห้อง 1', 'พร้อมใช้งาน', 'สมศักดิ์', 'สมชาย', '', '2026-01-01', '2026-01-01'],
        ],
      },
    });

    const updated = await sheetsService.updateRecord('rec-999', {
      status: 'ส่งซ่อม',
    });
    expect(updated).toBeNull();
    expect(mockValuesUpdate).not.toHaveBeenCalled();
  });

  it('deletes an existing row by id using deleteDimension batchUpdate', async () => {
    mockValuesGet.mockResolvedValueOnce({
      data: {
        values: [
          HEADER_ROW, // index 0 (row 1)
          ['rec-1', 'EQ-2026-001', 'คอมพิวเตอร์', 'ห้อง 1', 'พร้อมใช้งาน', 'สมศักดิ์', 'สมชาย', '', '2026-01-01', '2026-01-01'], // index 1 (row 2)
          ['rec-2', 'EQ-2026-002', 'เครื่องพิมพ์', 'ห้อง 2', 'พร้อมใช้งาน', 'วิไลลักษณ์', 'สมชาย', '', '2026-01-02', '2026-01-02'], // index 2 (row 3)
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
        values: [
          HEADER_ROW,
          ['rec-1', 'EQ-2026-001', 'คอมพิวเตอร์', 'ห้อง 1', 'พร้อมใช้งาน', 'สมศักดิ์', 'สมชาย', '', '2026-01-01', '2026-01-01'],
        ],
      },
    });

    const success = await sheetsService.deleteRecord('rec-999');
    expect(success).toBe(false);
    expect(mockBatchUpdate).not.toHaveBeenCalled();
  });
});

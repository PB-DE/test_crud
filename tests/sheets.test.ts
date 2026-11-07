import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  sheetsService,
  HEADER_ROW,
  RANGE_ALL,
  LOG_HEADER_ROW,
  RANGE_LOGS_ALL,
  ensureLogsSheet,
} from '../src/lib/sheets';
import * as envModule from '../src/lib/env';
import { google } from 'googleapis';

describe('HEADER_ROW and RANGE_ALL constants', () => {
  it('defines the correct 10 Thai column headers for asset tracking transaction ledger', () => {
    expect(HEADER_ROW).toEqual([
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
    ]);
  });

  it('defines the correct column range A:J', () => {
    expect(RANGE_ALL).toBe('A:J');
  });
});

describe('LOG_HEADER_ROW and RANGE_LOGS_ALL constants', () => {
  it('defines the correct 11 Thai column headers for change logs', () => {
    expect(LOG_HEADER_ROW).toEqual([
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
    ]);
  });

  it('defines the correct column range Logs!A:K', () => {
    expect(RANGE_LOGS_ALL).toBe('Logs!A:K');
  });
});

describe('sheetsService (demo mode)', () => {
  beforeEach(async () => {
    sheetsService.resetDemoStore();
  });

  it('derives timeline from demoTransactions so seed assets show full audit history', async () => {
    sheetsService.resetDemoStore();
    const logs = await sheetsService.getLogs({ assetCode: 'EQ-2026-003' });
    expect(logs.length).toBe(2);
    expect(logs[0].action).toBe('แก้ไข/ย้ายตำแหน่ง');
    expect(logs[1].action).toBe('บันทึกรายการใหม่');
  });

  it('createRecord, updateRecord, and deleteRecord append transactions without modifying existing rows', async () => {
    sheetsService.resetDemoStore();

    const created = await sheetsService.createRecord({
      assetCode: 'EQ-APPEND-01',
      name: 'Camera Sony',
      location: 'Studio A',
      status: 'พร้อมใช้งาน',
      responsiblePerson: 'Photographer',
      recordedBy: 'Admin',
    });

    const updated = await sheetsService.updateRecord(created.assetCode, {
      location: 'Studio B',
      recordedBy: 'Admin',
    });

    const deleted = await sheetsService.deleteRecord(created.assetCode, 'Admin', 'Decommissioned');

    expect(deleted).toBe(true);

    // All transactions are preserved in the ledger
    const txs = await sheetsService.getTransactions();
    const matching = txs.filter((t) => t.assetCode === 'EQ-APPEND-01');
    expect(matching.length).toBe(3);
    expect(matching[0].action).toBe('บันทึกรายการใหม่');
    expect(matching[1].action).toBe('แก้ไข/ย้ายตำแหน่ง');
    expect(matching[2].action).toBe('จำหน่าย/ตัดบัญชี');

    // getRecords projects latest state
    const records = await sheetsService.getRecords();
    const current = records.find((r) => r.assetCode === 'EQ-APPEND-01');
    expect(current?.location).toBe('Studio B');
    expect(current?.status).toBe('จำหน่าย/ตัดบัญชี');
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

  it('deletes an existing record by id (soft decommissioning in ledger)', async () => {
    const created = await sheetsService.createRecord({
      assetCode: 'EQ-2026-102',
      name: 'เก้าอี้สำนักงานทดสอบ',
      location: 'ห้องเก็บของ',
      status: 'พร้อมใช้งาน',
      responsiblePerson: 'สมชาย สายตรวจ',
      recordedBy: 'สุพัตรา สารสนเทศ',
      notes: 'รอทิ้ง',
    });

    const success = await sheetsService.deleteRecord(created.id);
    expect(success).toBe(true);

    const found = await sheetsService.getRecordById(created.id);
    expect(found?.status).toBe('จำหน่าย/ตัดบัญชี');

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

  it('automatically appends an audit log when a record is created', async () => {
    const created = await sheetsService.createRecord({
      assetCode: 'EQ-LOG-001',
      name: 'เครื่องเซิร์ฟเวอร์ Dell PowerEdge',
      location: 'ห้อง IDC',
      status: 'พร้อมใช้งาน',
      responsiblePerson: 'วิศวกร ระบบ',
      recordedBy: 'ผู้ดูแล แอดมิน',
      notes: 'เครื่องใหม่แกะกล่อง',
    });

    const logs = await sheetsService.getLogs();
    expect(logs.length).toBeGreaterThan(0);
    const log = logs[0];
    expect(log.action).toBe('บันทึกรายการใหม่');
    expect(log.assetId).toBe(created.id);
    expect(log.assetCode).toBe('EQ-LOG-001');
    expect(log.name).toBe('เครื่องเซิร์ฟเวอร์ Dell PowerEdge');
    expect(log.locationChange).toBe('- ➔ ห้อง IDC');
    expect(log.responsibleChange).toBe('- ➔ วิศวกร ระบบ');
    expect(log.statusChange).toBe('- ➔ พร้อมใช้งาน');
    expect(log.changeSummary).toBe('บันทึกครุภัณฑ์ใหม่เข้าสู่ระบบ');
    expect(log.recordedBy).toBe('ผู้ดูแล แอดมิน');
    expect(log.notes).toBe('เครื่องใหม่แกะกล่อง');
  });

  it('automatically appends an audit log when a record is updated with changes', async () => {
    const created = await sheetsService.createRecord({
      assetCode: 'EQ-LOG-002',
      name: 'เก้าอี้เพื่อสุขภาพ',
      location: 'ห้องทำงาน 1',
      status: 'พร้อมใช้งาน',
      responsiblePerson: 'เจ้าหน้าที่ ก',
      recordedBy: 'เจ้าหน้าที่ ข',
      notes: '',
    });

    const updated = await sheetsService.updateRecord(created.id, {
      location: 'ห้องทำงาน 2',
      responsiblePerson: 'เจ้าหน้าที่ ค',
      recordedBy: 'เจ้าหน้าที่ ง',
      notes: 'ย้ายโต๊ะทำงาน',
    });

    expect(updated).not.toBeNull();
    const logs = await sheetsService.getLogs({ assetId: created.id });
    expect(logs.length).toBe(2);
    // Newest log should be update
    const updateLog = logs[0];
    expect(updateLog.action).toBe('แก้ไข/ย้ายตำแหน่ง');
    expect(updateLog.locationChange).toBe('ห้องทำงาน 1 ➔ ห้องทำงาน 2');
    expect(updateLog.responsibleChange).toBe('เจ้าหน้าที่ ก ➔ เจ้าหน้าที่ ค');
    expect(updateLog.statusChange).toBe('-');
    expect(updateLog.changeSummary).toContain('ย้ายสถานที่');
    expect(updateLog.changeSummary).toContain('เปลี่ยนผู้รับผิดชอบ');
    expect(updateLog.recordedBy).toBe('เจ้าหน้าที่ ง');
    expect(updateLog.notes).toBe('ย้ายโต๊ะทำงาน');
  });

  it('does not append a log when updateRecord is called without changes', async () => {
    const created = await sheetsService.createRecord({
      assetCode: 'EQ-LOG-003',
      name: 'โปรเจคเตอร์',
      location: 'ห้องประชุม',
      status: 'พร้อมใช้งาน',
      responsiblePerson: 'เจ้าหน้าที่ ก',
      recordedBy: 'เจ้าหน้าที่ ข',
      notes: '',
    });

    const logsBefore = await sheetsService.getLogs({ assetId: created.id });
    expect(logsBefore.length).toBe(1);

    await sheetsService.updateRecord(created.id, {
      location: 'ห้องประชุม',
      status: 'พร้อมใช้งาน',
    });

    const logsAfter = await sheetsService.getLogs({ assetId: created.id });
    expect(logsAfter.length).toBe(1);
  });

  it('automatically appends an audit log when a record is deleted', async () => {
    const created = await sheetsService.createRecord({
      assetCode: 'EQ-LOG-004',
      name: 'โน้ตบุ๊ก ThinkPad',
      location: 'ฝ่ายขาย',
      status: 'จำหน่าย/ตัดบัญชี',
      responsiblePerson: 'เซลส์แมน',
      recordedBy: 'ไอที ซัพพอร์ต',
      notes: 'เครื่องเสียซ่อมไม่คุ้ม',
    });

    const success = await sheetsService.deleteRecord(created.id);
    expect(success).toBe(true);

    const logs = await sheetsService.getLogs({ assetId: created.id });
    expect(logs.length).toBe(2);
    const deleteLog = logs[0];
    expect(deleteLog.action).toBe('ลบรายการ');
    expect(deleteLog.assetCode).toBe('EQ-LOG-004');
    expect(deleteLog.name).toBe('โน้ตบุ๊ก ThinkPad');
    expect(deleteLog.locationChange).toBe('ฝ่ายขาย ➔ -');
    expect(deleteLog.responsibleChange).toBe('เซลส์แมน ➔ -');
    expect(deleteLog.statusChange).toBe('จำหน่าย/ตัดบัญชี ➔ -');
    expect(deleteLog.changeSummary).toBe('ลบรายการครุภัณฑ์ออกจากระบบ');
  });

  it('filters logs by assetId and assetCode and sorts newest first', async () => {
    const item1 = await sheetsService.createRecord({
      assetCode: 'EQ-FILT-1',
      name: 'Item 1',
      location: 'Loc 1',
      status: 'พร้อมใช้งาน',
      responsiblePerson: 'Resp 1',
      recordedBy: 'User 1',
      notes: '',
    });

    const item2 = await sheetsService.createRecord({
      assetCode: 'EQ-FILT-2',
      name: 'Item 2',
      location: 'Loc 2',
      status: 'พร้อมใช้งาน',
      responsiblePerson: 'Resp 2',
      recordedBy: 'User 2',
      notes: '',
    });

    const logsItem1 = await sheetsService.getLogs({ assetId: item1.id });
    expect(logsItem1.length).toBeGreaterThan(0);
    expect(logsItem1.every((l) => l.assetId === item1.id)).toBe(true);

    const logsItem2 = await sheetsService.getLogs({ assetCode: 'EQ-FILT-2' });
    expect(logsItem2.length).toBeGreaterThan(0);
    expect(logsItem2.every((l) => l.assetCode === 'EQ-FILT-2')).toBe(true);
  });

  it('resets demo logs store when resetDemoStore is called', async () => {
    await sheetsService.createRecord({
      assetCode: 'EQ-RESET-01',
      name: 'Item',
      location: 'Loc',
      status: 'พร้อมใช้งาน',
      responsiblePerson: 'Resp',
      recordedBy: 'User',
      notes: '',
    });

    const logsBefore = await sheetsService.getLogs();
    expect(logsBefore.length).toBeGreaterThan(0);

    sheetsService.resetDemoStore();
    const logsAfter = await sheetsService.getLogs();
    expect(logsAfter.length).toBe(0);
  });

  it('createRecord updates existing record when assetCode matches case-insensitively', async () => {
    const existing = await sheetsService.createRecord({
      assetCode: 'EQ-UNIQUE-01',
      name: 'Original Laptop',
      location: 'Room 101',
      status: 'พร้อมใช้งาน',
      responsiblePerson: 'User A',
      recordedBy: 'Admin',
      notes: 'Initial',
    });

    const updated = await sheetsService.createRecord({
      assetCode: '  eq-unique-01  ',
      name: 'Original Laptop',
      location: 'Room 202',
      status: 'กำลังใช้งาน',
      responsiblePerson: 'User B',
      recordedBy: 'Admin',
      notes: 'Moved',
    });

    expect(updated.id).toBe(existing.id);
    expect(updated.location).toBe('Room 202');
    expect(updated.responsiblePerson).toBe('User B');

    const allRecords = await sheetsService.getRecords();
    const matches = allRecords.filter(
      (r) => r.assetCode.trim().toLowerCase() === 'eq-unique-01'
    );
    expect(matches.length).toBe(1);
  });

  it('updateRecord throws error if assetCode collides with another record', async () => {
    const item1 = await sheetsService.createRecord({
      assetCode: 'EQ-ALPHA',
      name: 'Alpha',
      location: 'A',
      status: 'พร้อมใช้งาน',
      responsiblePerson: 'User A',
      recordedBy: 'Admin',
    });
    const item2 = await sheetsService.createRecord({
      assetCode: 'EQ-BETA',
      name: 'Beta',
      location: 'B',
      status: 'พร้อมใช้งาน',
      responsiblePerson: 'User B',
      recordedBy: 'Admin',
    });

    await expect(
      sheetsService.updateRecord(item2.id, { assetCode: 'EQ-ALPHA' })
    ).rejects.toThrow(/already exists/i);
  });

  it('updateRecord allows updating own assetCode with different casing or whitespace without error', async () => {
    const item = await sheetsService.createRecord({
      assetCode: 'EQ-SELF-01',
      name: 'Self Item',
      location: 'Room A',
      status: 'พร้อมใช้งาน',
      responsiblePerson: 'User A',
      recordedBy: 'Admin',
    });

    const updated = await sheetsService.updateRecord(item.id, {
      assetCode: '  eq-self-01  ',
      location: 'Room B',
    });

    expect(updated).not.toBeNull();
    expect(updated?.id).toBe(item.id);
    expect(updated?.location).toBe('Room B');
  });

  it('updateRecord does not check collision if assetCode is unchanged', async () => {
    const item = await sheetsService.createRecord({
      assetCode: 'EQ-UNCHANGED',
      name: 'Unchanged Item',
      location: 'Room 101',
      status: 'พร้อมใช้งาน',
      responsiblePerson: 'User A',
      recordedBy: 'Admin',
    });

    const updated = await sheetsService.updateRecord(item.id, {
      assetCode: 'EQ-UNCHANGED',
      location: 'Room 202',
    });

    expect(updated).not.toBeNull();
    expect(updated?.location).toBe('Room 202');
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

    mockValuesGet = vi.fn().mockImplementation(({ range }: { range?: string }) => {
      if (range && range.includes('Logs')) {
        return Promise.resolve({ data: { values: [LOG_HEADER_ROW] } });
      }
      return Promise.resolve({ data: { values: [HEADER_ROW] } });
    });
    mockValuesUpdate = vi.fn().mockResolvedValue({});
    mockValuesAppend = vi.fn().mockResolvedValue({});
    mockSpreadsheetsGet = vi.fn().mockResolvedValue({
      data: {
        sheets: [
          { properties: { sheetId: 12345, title: 'Assets' } },
          { properties: { sheetId: 67890, title: 'Logs' } },
        ],
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
            '2026-01-02T09:00:00.000Z',
            'บันทึกรายการใหม่',
            'EQ-2026-001',
            'คอมพิวเตอร์ All-in-One Dell OptiPlex',
            'อาคาร 1 ชั้น 3 ห้อง 302',
            'พร้อมใช้งาน',
            'นายสมเกียรติ ยั่งยืน',
            'นางสาววิไลลักษณ์ มั่นคง',
            'สภาพสมบูรณ์',
          ],
          ['', '', '', '', '', '', '', '', '', ''], // empty row to verify filter
          [
            'rec-2',
            '2026-01-03T10:00:00.000Z',
            'บันทึกรายการใหม่',
            'EQ-2026-002',
            'เครื่องพิมพ์เลเซอร์ HP LaserJet',
            'ฝ่ายสารสนเทศ ชั้น 2',
            'ส่งซ่อม',
            'นายอนุรักษ์ รอบรู้',
            'นายวีระ ศักดิ์ศรี',
            'ดรัมหมึกมีปัญหา',
          ],
        ],
      },
    });

    const records = await sheetsService.getRecords();
    expect(records.length).toBe(2);
    expect(records[0]).toEqual({
      id: 'rec-2',
      assetCode: 'EQ-2026-002',
      name: 'เครื่องพิมพ์เลเซอร์ HP LaserJet',
      location: 'ฝ่ายสารสนเทศ ชั้น 2',
      status: 'ส่งซ่อม',
      responsiblePerson: 'นายอนุรักษ์ รอบรู้',
      recordedBy: 'นายวีระ ศักดิ์ศรี',
      notes: 'ดรัมหมึกมีปัญหา',
      timestamp: '2026-01-03T10:00:00.000Z',
      createdAt: '2026-01-03T10:00:00.000Z',
      updatedAt: '2026-01-03T10:00:00.000Z',
      transactionCount: 1,
      action: 'บันทึกรายการใหม่',
    });
    expect(records[1].assetCode).toBe('EQ-2026-001');
    expect(records[1].name).toBe('คอมพิวเตอร์ All-in-One Dell OptiPlex');
    expect(records[1].status).toBe('พร้อมใช้งาน');
  });

  it('falls back to default status when status in sheet is invalid', async () => {
    mockValuesGet.mockResolvedValueOnce({
      data: {
        values: [
          HEADER_ROW,
          [
            'rec-bad',
            '2026-01-01T08:00:00.000Z',
            'บันทึกรายการใหม่',
            'EQ-2026-999',
            'อุปกรณ์สถานะไม่ถูกต้อง',
            'ชั้น 1',
            'UnknownStatus',
            'สมชาย',
            'วิไลลักษณ์',
            '',
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
    expect(mockValuesAppend).toHaveBeenCalledTimes(2);

    const callArgs = mockValuesAppend.mock.calls[0][0];
    expect(callArgs.spreadsheetId).toBe('test-sheet-id');
    expect(callArgs.range).toBe(RANGE_ALL);
    const rowValues = callArgs.requestBody.values[0];
    expect(rowValues.length).toBe(10);
    expect(rowValues[0]).toBe(created.id);
    expect(rowValues[1]).toBe(created.createdAt);
    expect(rowValues[2]).toBe('บันทึกรายการใหม่');
    expect(rowValues[3]).toBe('EQ-2026-005');
    expect(rowValues[4]).toBe('เครื่องสำรองไฟ APC 1000VA');
    expect(rowValues[5]).toBe('ห้อง Server 1');
    expect(rowValues[6]).toBe('พร้อมใช้งาน');
    expect(rowValues[7]).toBe('นายช่างใหญ่ ประจำตึก');
    expect(rowValues[8]).toBe('นายบันทึก การงาน');
    expect(rowValues[9]).toBe('ติดตั้งแล้ว');

    const logCallArgs = mockValuesAppend.mock.calls[1][0];
    expect(logCallArgs.spreadsheetId).toBe('test-sheet-id');
    expect(logCallArgs.range).toBe(RANGE_LOGS_ALL);
    const logRowValues = logCallArgs.requestBody.values[0];
    expect(logRowValues[2]).toBe('บันทึกรายการใหม่');
    expect(logRowValues[3]).toBe('EQ-2026-005');
  });

  it('updates an existing record by appending a new transaction row to Google Sheet', async () => {
    mockValuesGet.mockResolvedValueOnce({
      data: {
        values: [
          HEADER_ROW, // row 1
          [
            'rec-1',
            '2026-01-01T00:00:00.000Z',
            'บันทึกรายการใหม่',
            'EQ-2026-001',
            'คอมพิวเตอร์ Dell',
            'ห้อง 101',
            'พร้อมใช้งาน',
            'สมศักดิ์',
            'สมชาย',
            '',
          ],
          [
            'rec-2',
            '2026-01-02T00:00:00.000Z',
            'บันทึกรายการใหม่',
            'EQ-2026-002',
            'เครื่องพิมพ์ HP',
            'ห้อง 102',
            'พร้อมใช้งาน',
            'วิไลลักษณ์',
            'สมชาย',
            '',
          ],
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

    // In append-only architecture, writes use mockValuesAppend, never mockValuesUpdate
    expect(mockValuesAppend).toHaveBeenCalledWith(
      expect.objectContaining({
        spreadsheetId: 'test-sheet-id',
        range: RANGE_ALL,
        valueInputOption: 'USER_ENTERED',
      })
    );

    const callArgs = mockValuesAppend.mock.calls[0][0];
    const appendedRow = callArgs.requestBody.values[0];
    expect(appendedRow.length).toBe(10);
    expect(appendedRow[2]).toBe('แก้ไข/ย้ายตำแหน่ง');
    expect(appendedRow[3]).toBe('EQ-2026-002');
    expect(appendedRow[4]).toBe('เครื่องพิมพ์ HP LaserJet Pro (อัปเกรด)');
    expect(appendedRow[5]).toBe('ห้อง 205');
    expect(appendedRow[6]).toBe('กำลังใช้งาน');
    expect(appendedRow[7]).toBe('วิชัย ปลอดภัย');
    expect(mockValuesUpdate).not.toHaveBeenCalled();
  });

  it('returns null when updating non-existent record in Google Sheet', async () => {
    mockValuesGet.mockResolvedValueOnce({
      data: {
        values: [
          HEADER_ROW,
          ['rec-1', '2026-01-01T00:00:00.000Z', 'บันทึกรายการใหม่', 'EQ-2026-001', 'คอมพิวเตอร์', 'ห้อง 1', 'พร้อมใช้งาน', 'สมศักดิ์', 'สมชาย', ''],
        ],
      },
    });

    const updated = await sheetsService.updateRecord('rec-999', {
      status: 'ส่งซ่อม',
    });
    expect(updated).toBeNull();
    expect(mockValuesUpdate).not.toHaveBeenCalled();
  });

  it('deletes an existing record by appending a decommissioning transaction row', async () => {
    mockValuesGet.mockResolvedValueOnce({
      data: {
        values: [
          HEADER_ROW,
          ['rec-1', '2026-01-01T00:00:00.000Z', 'บันทึกรายการใหม่', 'EQ-2026-001', 'คอมพิวเตอร์', 'ห้อง 1', 'พร้อมใช้งาน', 'สมศักดิ์', 'สมชาย', ''],
          ['rec-2', '2026-01-02T00:00:00.000Z', 'บันทึกรายการใหม่', 'EQ-2026-002', 'เครื่องพิมพ์', 'ห้อง 2', 'พร้อมใช้งาน', 'วิไลลักษณ์', 'สมชาย', ''],
        ],
      },
    });

    const success = await sheetsService.deleteRecord('rec-2');
    expect(success).toBe(true);

    // In append-only architecture, never calls batchUpdate with deleteDimension
    expect(mockBatchUpdate).not.toHaveBeenCalled();
    expect(mockValuesAppend).toHaveBeenCalledWith(
      expect.objectContaining({
        spreadsheetId: 'test-sheet-id',
        range: RANGE_ALL,
        valueInputOption: 'USER_ENTERED',
      })
    );
    const callArgs = mockValuesAppend.mock.calls[0][0];
    const row = callArgs.requestBody.values[0];
    expect(row[2]).toBe('จำหน่าย/ตัดบัญชี');
    expect(row[3]).toBe('EQ-2026-002');
    expect(row[6]).toBe('จำหน่าย/ตัดบัญชี');
  });

  it('returns false when deleting a non-existent record in Google Sheet', async () => {
    mockValuesGet.mockResolvedValueOnce({
      data: {
        values: [
          HEADER_ROW,
          ['rec-1', '2026-01-01T00:00:00.000Z', 'บันทึกรายการใหม่', 'EQ-2026-001', 'คอมพิวเตอร์', 'ห้อง 1', 'พร้อมใช้งาน', 'สมศักดิ์', 'สมชาย', ''],
        ],
      },
    });

    const success = await sheetsService.deleteRecord('rec-999');
    expect(success).toBe(false);
    expect(mockBatchUpdate).not.toHaveBeenCalled();
  });

  it('createRecord appends update transaction when assetCode matches case-insensitively in Google Sheets mode', async () => {
    const sheetData = {
      data: {
        values: [
          HEADER_ROW,
          [
            'rec-existing-1',
            '2026-01-01T00:00:00.000Z',
            'บันทึกรายการใหม่',
            'EQ-GS-01',
            'เครื่องพิมพ์เดิม',
            'ห้อง 1',
            'พร้อมใช้งาน',
            'นาย ก',
            'Admin',
            '',
          ],
        ],
      },
    };
    mockValuesGet.mockResolvedValueOnce(sheetData);

    const result = await sheetsService.createRecord({
      assetCode: '  eq-gs-01  ',
      name: 'เครื่องพิมพ์เดิม',
      location: 'ห้อง 2',
      status: 'กำลังใช้งาน',
      responsiblePerson: 'นาย ข',
      recordedBy: 'Admin 2',
      notes: 'ย้ายแล้ว',
    });

    expect(result.id).toBe('rec-existing-1');
    expect(result.location).toBe('ห้อง 2');
    expect(result.action).toBe('แก้ไข/ย้ายตำแหน่ง');
    expect(mockValuesAppend).toHaveBeenCalled();
  });

  it('updateRecord throws error if assetCode collides with another row in Google Sheets mode', async () => {
    mockValuesGet.mockResolvedValueOnce({
      data: {
        values: [
          HEADER_ROW,
          ['rec-1', '2026-01-01T00:00:00.000Z', 'บันทึกรายการใหม่', 'EQ-ONE', 'Item 1', 'Room 1', 'พร้อมใช้งาน', 'User 1', 'Admin', ''],
          ['rec-2', '2026-01-01T00:00:00.000Z', 'บันทึกรายการใหม่', 'EQ-TWO', 'Item 2', 'Room 2', 'พร้อมใช้งาน', 'User 2', 'Admin', ''],
        ],
      },
    });

    await expect(
      sheetsService.updateRecord('rec-2', { assetCode: 'EQ-ONE' })
    ).rejects.toThrow(/already exists/i);
  });

  describe('ensureLogsSheet and Google Sheets logging', () => {
    it('creates Logs tab and writes header when Logs tab is missing', async () => {
      mockSpreadsheetsGet.mockResolvedValueOnce({
        data: {
          sheets: [{ properties: { sheetId: 1, title: 'Sheet1' } }],
        },
      });
      mockValuesGet.mockResolvedValueOnce({
        data: { values: [] },
      });

      const sheets = google.sheets({ version: 'v4' });
      await ensureLogsSheet(sheets, 'test-sheet-id');

      expect(mockBatchUpdate).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id',
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

      expect(mockValuesUpdate).toHaveBeenCalledWith({
        spreadsheetId: 'test-sheet-id',
        range: 'Logs!A1:K1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [LOG_HEADER_ROW] },
      });
    });

    it('skips addSheet when Logs tab already exists', async () => {
      mockSpreadsheetsGet.mockResolvedValueOnce({
        data: {
          sheets: [
            { properties: { sheetId: 1, title: 'Sheet1' } },
            { properties: { sheetId: 2, title: 'Logs' } },
          ],
        },
      });
      mockValuesGet.mockResolvedValueOnce({
        data: { values: [LOG_HEADER_ROW] },
      });

      const sheets = google.sheets({ version: 'v4' });
      await ensureLogsSheet(sheets, 'test-sheet-id');

      expect(mockBatchUpdate).not.toHaveBeenCalled();
      expect(mockValuesUpdate).not.toHaveBeenCalled();
    });

    it('appends an audit log to Logs!A:K via appendLog', async () => {
      mockSpreadsheetsGet.mockResolvedValueOnce({
        data: {
          sheets: [{ properties: { sheetId: 2, title: 'Logs' } }],
        },
      });
      mockValuesGet.mockResolvedValueOnce({
        data: { values: [LOG_HEADER_ROW] },
      });

      await sheetsService.appendLog({
        id: 'log-test-1',
        timestamp: '2026-03-01T10:00:00.000Z',
        action: 'แก้ไข/ย้ายตำแหน่ง',
        assetId: 'rec-1',
        assetCode: 'EQ-2026-001',
        name: 'Dell OptiPlex',
        locationChange: 'ห้อง 1 ➔ ห้อง 2',
        responsibleChange: '-',
        statusChange: '-',
        changeSummary: 'ย้ายสถานที่',
        recordedBy: 'จนท. ตรวจสอบ',
        notes: 'ย้ายชั่วคราว',
      });

      expect(mockValuesAppend).toHaveBeenCalledWith(
        expect.objectContaining({
          spreadsheetId: 'test-sheet-id',
          range: RANGE_LOGS_ALL,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          requestBody: {
            values: [
              [
                'log-test-1',
                '2026-03-01T10:00:00.000Z',
                'แก้ไข/ย้ายตำแหน่ง',
                'EQ-2026-001',
                'Dell OptiPlex',
                'ห้อง 1 ➔ ห้อง 2',
                '-',
                '-',
                'ย้ายสถานที่',
                'จนท. ตรวจสอบ',
                'ย้ายชั่วคราว',
              ],
            ],
          },
        })
      );
    });

    it('retrieves and parses logs from Google Sheets in getLogs with filtering and newest-first order', async () => {
      mockSpreadsheetsGet.mockResolvedValueOnce({
        data: {
          sheets: [{ properties: { sheetId: 2, title: 'Logs' } }],
        },
      });
      mockValuesGet
        .mockResolvedValueOnce({
          data: { values: [LOG_HEADER_ROW] }, // Logs!A1:K1 inside ensureLogsSheet
        })
        .mockResolvedValueOnce({
          data: {
            values: [
              LOG_HEADER_ROW,
              [
                'log-1',
                '2026-01-01T10:00:00.000Z',
                'บันทึกรายการใหม่',
                'EQ-001',
                'Dell PC',
                '- ➔ ห้อง 101',
                '- ➔ สมชาย',
                '- ➔ พร้อมใช้งาน',
                'บันทึกครุภัณฑ์ใหม่เข้าสู่ระบบ',
                'สมหญิง',
                '',
              ],
              [
                'log-2',
                '2026-01-02T10:00:00.000Z',
                'แก้ไข/ย้ายตำแหน่ง',
                'EQ-001',
                'Dell PC',
                'ห้อง 101 ➔ ห้อง 102',
                '-',
                '-',
                'ย้ายสถานที่',
                'สมชาย',
                'ย้ายห้องทำงาน',
              ],
              [
                'log-3',
                '2026-01-03T10:00:00.000Z',
                'บันทึกรายการใหม่',
                'EQ-002',
                'HP Printer',
                '- ➔ ห้อง 201',
                '- ➔ สมพงษ์',
                '- ➔ พร้อมใช้งาน',
                'บันทึกครุภัณฑ์ใหม่เข้าสู่ระบบ',
                'สมหญิง',
                '',
              ],
            ],
          },
        });

      const logs = await sheetsService.getLogs({ assetCode: 'EQ-001' });
      expect(logs.length).toBe(2);
      expect(logs[0].id).toBe('log-2'); // newest first
      expect(logs[1].id).toBe('log-1');
      expect(logs[0].assetCode).toBe('EQ-001');
      expect(logs[1].assetCode).toBe('EQ-001');
    });
  });
});

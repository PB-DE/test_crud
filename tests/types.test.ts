import { describe, it, expect } from 'vitest';
import {
  isValidAssetStatus,
  ASSET_STATUSES,
  isValidStatus,
  RECORD_STATUSES,
  type AssetStatus,
  type AssetRecord,
  type CreateAssetInput,
  type UpdateAssetInput,
  type RecordItem,
  type CreateRecordInput,
  type UpdateRecordInput,
  type LogAction,
  type AssetLogRecord,
} from '../src/lib/types';

describe('Asset Types & Validation', () => {
  it('validates allowed asset statuses', () => {
    expect(isValidAssetStatus('พร้อมใช้งาน')).toBe(true);
    expect(isValidAssetStatus('กำลังใช้งาน')).toBe(true);
    expect(isValidAssetStatus('ส่งซ่อม')).toBe(true);
    expect(isValidAssetStatus('จำหน่าย/ตัดบัญชี')).toBe(true);
    expect(isValidAssetStatus('InvalidStatus')).toBe(false);
    expect(isValidAssetStatus('')).toBe(false);
    expect(isValidAssetStatus(null)).toBe(false);
    expect(isValidAssetStatus(undefined)).toBe(false);
    expect(isValidAssetStatus(123)).toBe(false);
  });

  it('exports ASSET_STATUSES list with 4 options in correct order', () => {
    expect(ASSET_STATUSES).toHaveLength(4);
    expect(ASSET_STATUSES).toEqual([
      'พร้อมใช้งาน',
      'กำลังใช้งาน',
      'ส่งซ่อม',
      'จำหน่าย/ตัดบัญชี',
    ]);
  });

  it('provides backward compatibility aliases', () => {
    expect(isValidStatus).toBe(isValidAssetStatus);
    expect(isValidStatus('พร้อมใช้งาน')).toBe(true);
    expect(isValidStatus('InvalidStatus')).toBe(false);
  });

  it('allows constructing a valid AssetRecord and CreateAssetInput', () => {
    const input: CreateAssetInput = {
      assetCode: 'EQ-001',
      name: 'โน้ตบุ๊ก Dell Latitude',
      location: 'ห้องประชุม 1 ชั้น 3',
      status: 'พร้อมใช้งาน',
      responsiblePerson: 'สมชาย มั่นคง',
      recordedBy: 'ผู้ดูแลระบบ',
      notes: 'สภาพใหม่',
    };

    const record: AssetRecord = {
      id: 'uuid-1',
      ...input,
      createdAt: '2026-11-07T00:00:00.000Z',
      updatedAt: '2026-11-07T00:00:00.000Z',
    };

    const recordWithPhoto: AssetRecord = {
      ...record,
      imageUrl: 'https://drive.google.com/uc?id=12345',
    };

    const aliasRecord: RecordItem = record;
    const aliasInput: CreateAssetInput = {
      ...input,
      imageUrl: 'https://drive.google.com/uc?id=12345',
    };
    const updateInput: UpdateAssetInput = { status: 'กำลังใช้งาน', imageUrl: 'https://drive.google.com/uc?id=67890' };
    const aliasUpdate: UpdateRecordInput = updateInput;

    expect(record.assetCode).toBe('EQ-001');
    expect(recordWithPhoto.imageUrl).toBe('https://drive.google.com/uc?id=12345');
    expect(aliasRecord.id).toBe('uuid-1');
    expect(aliasInput.imageUrl).toBe('https://drive.google.com/uc?id=12345');
    expect(aliasUpdate.imageUrl).toBe('https://drive.google.com/uc?id=67890');
  });

  it('supports optional imageUrl in AssetTransaction and AssetLogRecord', () => {
    const tx = {
      id: 'tx-1',
      timestamp: '2026-11-08T08:00:00.000Z',
      action: 'บันทึกรายการใหม่' as const,
      assetCode: 'EQ-001',
      name: 'กล้อง',
      location: 'ห้องพัสดุ',
      status: 'พร้อมใช้งาน' as const,
      responsiblePerson: 'สมชาย',
      recordedBy: 'ผู้ดูแลระบบ',
      notes: '',
      imageUrl: 'https://drive.google.com/uc?id=photo-1',
    };
    expect(tx.imageUrl).toBe('https://drive.google.com/uc?id=photo-1');

    const log: AssetLogRecord = {
      id: 'log-1',
      timestamp: '2026-11-08T08:00:00.000Z',
      action: 'บันทึกรายการใหม่',
      assetId: 'tx-1',
      assetCode: 'EQ-001',
      name: 'กล้อง',
      locationChange: '- ➔ ห้องพัสดุ',
      responsibleChange: '- ➔ สมชาย',
      statusChange: '- ➔ พร้อมใช้งาน',
      changeSummary: 'บันทึกครุภัณฑ์ใหม่เข้าสู่ระบบ',
      recordedBy: 'ผู้ดูแลระบบ',
      notes: '',
      imageUrl: 'https://drive.google.com/uc?id=photo-1',
    };
    expect(log.imageUrl).toBe('https://drive.google.com/uc?id=photo-1');
  });

  it('allows constructing a valid AssetLogRecord', () => {
    const logAction: LogAction = 'แก้ไข/ย้ายตำแหน่ง';
    const log: AssetLogRecord = {
      id: 'log-1',
      timestamp: '2026-11-07T09:00:00.000Z',
      action: logAction,
      assetId: 'uuid-1',
      assetCode: 'EQ-001',
      name: 'โน้ตบุ๊ก Dell Latitude',
      locationChange: 'ห้องประชุม 1 ชั้น 3 ➔ ห้อง 201',
      responsibleChange: 'สมชาย มั่นคง ➔ สมหญิง รักดี',
      statusChange: '-',
      changeSummary: 'ย้ายสถานที่, เปลี่ยนผู้รับผิดชอบ',
      recordedBy: 'เจ้าหน้าที่พัสดุ',
      notes: 'ย้ายโต๊ะทำงาน',
    };

    expect(log.action).toBe('แก้ไข/ย้ายตำแหน่ง');
    expect(log.locationChange).toContain('➔');
    expect(log.responsibleChange).toContain('➔');
    expect(log.statusChange).toBe('-');
  });
});

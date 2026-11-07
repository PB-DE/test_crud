import { describe, it, expect } from 'vitest';
import { computeAssetDiff } from '../src/lib/log-utils';
import { AssetRecord, AssetLogRecord, LogAction } from '../src/lib/types';

describe('computeAssetDiff', () => {
  const base: AssetRecord = {
    id: 'rec-1',
    assetCode: 'EQ-001',
    name: 'Dell PC',
    location: 'ห้อง 201',
    status: 'พร้อมใช้งาน',
    responsiblePerson: 'สมชาย',
    recordedBy: 'จนท. A',
    notes: 'เครื่องใหม่',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('detects location and custodian changes', () => {
    const diff = computeAssetDiff(
      base,
      { location: 'ห้อง 305', responsiblePerson: 'สมหญิง' },
      'จนท. B',
      'ย้ายโต๊ะ'
    );
    expect(diff).not.toBeNull();
    expect(diff?.action).toBe('แก้ไข/ย้ายตำแหน่ง');
    expect(diff?.assetId).toBe('rec-1');
    expect(diff?.assetCode).toBe('EQ-001');
    expect(diff?.name).toBe('Dell PC');
    expect(diff?.locationChange).toBe('ห้อง 201 ➔ ห้อง 305');
    expect(diff?.responsibleChange).toBe('สมชาย ➔ สมหญิง');
    expect(diff?.statusChange).toBe('-');
    expect(diff?.changeSummary).toContain('ย้ายสถานที่');
    expect(diff?.changeSummary).toContain('เปลี่ยนผู้รับผิดชอบ');
    expect(diff?.recordedBy).toBe('จนท. B');
    expect(diff?.notes).toBe('ย้ายโต๊ะ');
  });

  it('returns null when no fields changed', () => {
    const diff = computeAssetDiff(base, { location: 'ห้อง 201' }, 'จนท. A');
    expect(diff).toBeNull();
  });

  it('returns null when empty update object passed', () => {
    const diff = computeAssetDiff(base, {}, 'จนท. A');
    expect(diff).toBeNull();
  });

  it('returns null when all passed fields are identical or undefined', () => {
    const diff = computeAssetDiff(
      base,
      {
        location: 'ห้อง 201',
        responsiblePerson: 'สมชาย',
        status: 'พร้อมใช้งาน',
        name: 'Dell PC',
        notes: 'เครื่องใหม่',
      },
      'จนท. A'
    );
    expect(diff).toBeNull();
  });

  it('detects status change alone', () => {
    const diff = computeAssetDiff(base, { status: 'ส่งซ่อม' }, 'จนท. C');
    expect(diff).not.toBeNull();
    expect(diff?.action).toBe('แก้ไข/ย้ายตำแหน่ง');
    expect(diff?.locationChange).toBe('-');
    expect(diff?.responsibleChange).toBe('-');
    expect(diff?.statusChange).toBe('พร้อมใช้งาน ➔ ส่งซ่อม');
    expect(diff?.changeSummary).toBe('เปลี่ยนสถานะ');
    expect(diff?.recordedBy).toBe('จนท. C');
    expect(diff?.notes).toBe('');
  });

  it('detects name change alone', () => {
    const diff = computeAssetDiff(base, { name: 'Dell PC Optiplex 7090' }, 'จนท. C');
    expect(diff).not.toBeNull();
    expect(diff?.name).toBe('Dell PC Optiplex 7090');
    expect(diff?.locationChange).toBe('-');
    expect(diff?.responsibleChange).toBe('-');
    expect(diff?.statusChange).toBe('-');
    expect(diff?.changeSummary).toBe('แก้ไขชื่อ');
  });

  it('detects notes change alone and defaults notes to updated notes if no audit notes provided', () => {
    const diff = computeAssetDiff(base, { notes: 'เปลี่ยนอะไหล่แล้ว' }, 'จนท. D');
    expect(diff).not.toBeNull();
    expect(diff?.changeSummary).toBe('แก้ไขหมายเหตุ');
    expect(diff?.notes).toBe('เปลี่ยนอะไหล่แล้ว');
  });

  it('prefers explicit audit note parameter when provided', () => {
    const diff = computeAssetDiff(
      base,
      { notes: 'เปลี่ยนอะไหล่แล้ว' },
      'จนท. D',
      'บันทึกเพื่อการตรวจสอบ'
    );
    expect(diff).not.toBeNull();
    expect(diff?.notes).toBe('บันทึกเพื่อการตรวจสอบ');
  });

  it('handles all fields changed at once', () => {
    const diff = computeAssetDiff(
      base,
      {
        location: 'ห้อง 404',
        responsiblePerson: 'วิชัย',
        status: 'จำหน่าย/ตัดบัญชี',
        name: 'HP Workstation',
        notes: 'หมดอายุการใช้งาน',
      },
      'หัวหน้างาน',
      'ตัดจำหน่ายประจำปี'
    );
    expect(diff).not.toBeNull();
    expect(diff?.locationChange).toBe('ห้อง 201 ➔ ห้อง 404');
    expect(diff?.responsibleChange).toBe('สมชาย ➔ วิชัย');
    expect(diff?.statusChange).toBe('พร้อมใช้งาน ➔ จำหน่าย/ตัดบัญชี');
    expect(diff?.name).toBe('HP Workstation');
    expect(diff?.notes).toBe('ตัดจำหน่ายประจำปี');
    expect(diff?.changeSummary).toBe(
      'ย้ายสถานที่, เปลี่ยนผู้รับผิดชอบ, เปลี่ยนสถานะ, แก้ไขชื่อ, แก้ไขหมายเหตุ'
    );
  });
});

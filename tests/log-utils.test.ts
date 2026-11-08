import { describe, it, expect } from 'vitest';
import { computeAssetDiff, projectLatestAssets, computeTransactionDiffs } from '../src/lib/log-utils';
import { AssetRecord, AssetLogRecord, AssetTransaction } from '../src/lib/types';

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

  it('detects photo change and passes imageUrl in diff', () => {
    const diff = computeAssetDiff(
      base,
      { imageUrl: 'https://lh3.googleusercontent.com/d/new-photo-id' },
      'จนท. ถ่ายรูป'
    );
    expect(diff).not.toBeNull();
    expect(diff?.changeSummary).toBe('อัปเดตรูปถ่าย');
    expect(diff?.imageUrl).toBe('https://lh3.googleusercontent.com/d/new-photo-id');
  });
});

describe('projectLatestAssets', () => {
  it('projects single latest state for an asset with multiple transactions', () => {
    const txs: AssetTransaction[] = [
      {
        id: '1',
        timestamp: '2026-01-01T10:00:00Z',
        action: 'บันทึกรายการใหม่',
        assetCode: 'EQ-01',
        name: 'Laptop Dell',
        location: 'Room 101',
        status: 'พร้อมใช้งาน',
        responsiblePerson: 'Alice',
        recordedBy: 'Admin',
        notes: '',
      },
      {
        id: '2',
        timestamp: '2026-01-02T10:00:00Z',
        action: 'แก้ไข/ย้ายตำแหน่ง',
        assetCode: '  eq-01  ',
        name: 'Laptop Dell',
        location: 'Room 202',
        status: 'กำลังใช้งาน',
        responsiblePerson: 'Bob',
        recordedBy: 'Admin',
        notes: 'Moved',
      },
    ];

    const projected = projectLatestAssets(txs);
    expect(projected.length).toBe(1);
    expect(projected[0].location).toBe('Room 202');
    expect(projected[0].status).toBe('กำลังใช้งาน');
    expect(projected[0].responsiblePerson).toBe('Bob');
    expect(projected[0].createdAt).toBe('2026-01-01T10:00:00Z');
    expect(projected[0].updatedAt).toBe('2026-01-02T10:00:00Z');
    expect(projected[0].transactionCount).toBe(2);
  });

  it('handles empty or malformed transaction lists gracefully', () => {
    expect(projectLatestAssets([])).toEqual([]);
    // @ts-expect-error testing invalid input
    expect(projectLatestAssets(null)).toEqual([]);
  });

  it('correctly handles out-of-order timestamps in transaction list', () => {
    const txs: AssetTransaction[] = [
      {
        id: '2',
        timestamp: '2026-01-05T12:00:00Z',
        action: 'แก้ไข/ย้ายตำแหน่ง',
        assetCode: 'EQ-02',
        name: 'Projector',
        location: 'Hall B',
        status: 'กำลังใช้งาน',
        responsiblePerson: 'Charlie',
        recordedBy: 'Admin',
        notes: '',
      },
      {
        id: '1',
        timestamp: '2026-01-01T09:00:00Z',
        action: 'บันทึกรายการใหม่',
        assetCode: 'EQ-02',
        name: 'Projector',
        location: 'Hall A',
        status: 'พร้อมใช้งาน',
        responsiblePerson: 'Charlie',
        recordedBy: 'Admin',
        notes: '',
      },
    ];

    const projected = projectLatestAssets(txs);
    expect(projected.length).toBe(1);
    expect(projected[0].location).toBe('Hall B');
    expect(projected[0].createdAt).toBe('2026-01-01T09:00:00Z');
    expect(projected[0].updatedAt).toBe('2026-01-05T12:00:00Z');
    expect(projected[0].transactionCount).toBe(2);
  });

  it('projects multiple distinct assets sorted by updatedAt descending', () => {
    const txs: AssetTransaction[] = [
      {
        id: '1',
        timestamp: '2026-01-01T10:00:00Z',
        action: 'บันทึกรายการใหม่',
        assetCode: 'EQ-01',
        name: 'Laptop',
        location: '101',
        status: 'พร้อมใช้งาน',
        responsiblePerson: 'Alice',
        recordedBy: 'Admin',
        notes: '',
      },
      {
        id: '2',
        timestamp: '2026-01-03T10:00:00Z',
        action: 'บันทึกรายการใหม่',
        assetCode: 'EQ-02',
        name: 'Monitor',
        location: '102',
        status: 'พร้อมใช้งาน',
        responsiblePerson: 'Bob',
        recordedBy: 'Admin',
        notes: '',
      },
    ];

    const projected = projectLatestAssets(txs);
    expect(projected.length).toBe(2);
    expect(projected[0].assetCode).toBe('EQ-02');
    expect(projected[1].assetCode).toBe('EQ-01');
  });

  it('preserves decommissioned status in projection', () => {
    const txs: AssetTransaction[] = [
      {
        id: '1',
        timestamp: '2026-01-01T10:00:00Z',
        action: 'บันทึกรายการใหม่',
        assetCode: 'EQ-RETIRE',
        name: 'Old Printer',
        location: 'Warehouse',
        status: 'พร้อมใช้งาน',
        responsiblePerson: 'Dan',
        recordedBy: 'Admin',
        notes: '',
      },
      {
        id: '2',
        timestamp: '2026-01-10T10:00:00Z',
        action: 'จำหน่าย/ตัดบัญชี',
        assetCode: 'EQ-RETIRE',
        name: 'Old Printer',
        location: 'Warehouse',
        status: 'จำหน่าย/ตัดบัญชี',
        responsiblePerson: 'Dan',
        recordedBy: 'Admin',
        notes: 'Disposed',
      },
    ];

    const projected = projectLatestAssets(txs);
    expect(projected.length).toBe(1);
    expect(projected[0].status).toBe('จำหน่าย/ตัดบัญชี');
    expect(projected[0].transactionCount).toBe(2);
  });

  it('projects asset with 10 sequential updates with transactionCount: 10, createdAt from first, and updatedAt from 10th', () => {
    const txs: AssetTransaction[] = Array.from({ length: 10 }, (_, i) => ({
      id: `tx-${i + 1}`,
      timestamp: `2026-01-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
      action: i === 0 ? 'บันทึกรายการใหม่' : 'แก้ไข/ย้ายตำแหน่ง',
      assetCode: 'EQ-10-UPDATES',
      name: 'Server Rack',
      location: `Room ${100 + i}`,
      status: 'กำลังใช้งาน',
      responsiblePerson: `Engineer ${i}`,
      recordedBy: 'Admin',
      notes: `Update #${i}`,
    }));

    const projected = projectLatestAssets(txs);
    expect(projected.length).toBe(1);
    expect(projected[0].transactionCount).toBe(10);
    expect(projected[0].createdAt).toBe('2026-01-01T10:00:00Z');
    expect(projected[0].updatedAt).toBe('2026-01-10T10:00:00Z');
    expect(projected[0].location).toBe('Room 109');
    expect(projected[0].responsiblePerson).toBe('Engineer 9');
  });

  it('preserves previous imageUrl when a subsequent update transaction does not specify a new photo', () => {
    const txs: AssetTransaction[] = [
      {
        id: 'tx-1',
        timestamp: '2026-01-01T10:00:00Z',
        action: 'บันทึกรายการใหม่',
        assetCode: 'EQ-PHOTO-RETAIN',
        name: 'กล้องสำรวจระดับ',
        location: 'ห้องพัสดุ',
        status: 'พร้อมใช้งาน',
        responsiblePerson: 'สมชาย',
        recordedBy: 'Admin',
        notes: '',
        imageUrl: 'https://drive.google.com/uc?id=original-photo',
      },
      {
        id: 'tx-2',
        timestamp: '2026-01-02T10:00:00Z',
        action: 'แก้ไข/ย้ายตำแหน่ง',
        assetCode: 'EQ-PHOTO-RETAIN',
        name: 'กล้องสำรวจระดับ',
        location: 'ไซต์งานก่อสร้าง A',
        status: 'กำลังใช้งาน',
        responsiblePerson: 'วิศวกร บอย',
        recordedBy: 'Admin',
        notes: 'เบิกไปใช้งานภาคสนาม',
        // imageUrl is undefined in this update
      },
    ];

    const projected = projectLatestAssets(txs);
    expect(projected.length).toBe(1);
    expect(projected[0].location).toBe('ไซต์งานก่อสร้าง A');
    expect(projected[0].imageUrl).toBe('https://drive.google.com/uc?id=original-photo');
  });

  it('updates imageUrl when a subsequent transaction provides a new photo URL', () => {
    const txs: AssetTransaction[] = [
      {
        id: 'tx-1',
        timestamp: '2026-01-01T10:00:00Z',
        action: 'บันทึกรายการใหม่',
        assetCode: 'EQ-PHOTO-NEW',
        name: 'โต๊ะทำงาน',
        location: 'ชั้น 1',
        status: 'พร้อมใช้งาน',
        responsiblePerson: 'สมชาย',
        recordedBy: 'Admin',
        notes: '',
        imageUrl: 'https://drive.google.com/uc?id=photo-old',
      },
      {
        id: 'tx-2',
        timestamp: '2026-01-02T10:00:00Z',
        action: 'แก้ไข/ย้ายตำแหน่ง',
        assetCode: 'EQ-PHOTO-NEW',
        name: 'โต๊ะทำงาน',
        location: 'ชั้น 2',
        status: 'กำลังใช้งาน',
        responsiblePerson: 'วิภาดา',
        recordedBy: 'Admin',
        notes: 'ถ่ายรูปใหม่หลังจัดห้อง',
        imageUrl: 'https://drive.google.com/uc?id=photo-new',
      },
    ];

    const projected = projectLatestAssets(txs);
    expect(projected.length).toBe(1);
    expect(projected[0].location).toBe('ชั้น 2');
    expect(projected[0].imageUrl).toBe('https://drive.google.com/uc?id=photo-new');
  });
});

describe('computeTransactionDiffs', () => {
  it('converts transactions into chronologically diffed AssetLogRecords', () => {
    const txs: AssetTransaction[] = [
      {
        id: '1',
        timestamp: '2026-01-01T10:00:00Z',
        action: 'บันทึกรายการใหม่',
        assetCode: 'EQ-DIFF',
        name: 'Server A',
        location: 'Rack 1',
        status: 'พร้อมใช้งาน',
        responsiblePerson: 'Engineer 1',
        recordedBy: 'Admin',
        notes: 'Initial',
      },
      {
        id: '2',
        timestamp: '2026-01-02T10:00:00Z',
        action: 'แก้ไข/ย้ายตำแหน่ง',
        assetCode: 'EQ-DIFF',
        name: 'Server A',
        location: 'Rack 2',
        status: 'กำลังใช้งาน',
        responsiblePerson: 'Engineer 2',
        recordedBy: 'Admin',
        notes: 'Upgraded',
      },
      {
        id: '3',
        timestamp: '2026-01-03T10:00:00Z',
        action: 'จำหน่าย/ตัดบัญชี',
        assetCode: 'EQ-DIFF',
        name: 'Server A',
        location: 'Rack 2',
        status: 'จำหน่าย/ตัดบัญชี',
        responsiblePerson: 'Engineer 2',
        recordedBy: 'Admin',
        notes: 'Decommissioned',
      },
    ];

    const logs = computeTransactionDiffs(txs);
    // Returned in reverse chronological order (newest first) for UI timeline
    expect(logs.length).toBe(3);
    
    // Newest: Decommission
    expect(logs[0].id).toBe('3');
    expect(logs[0].action).toBe('จำหน่าย/ตัดบัญชี');
    expect(logs[0].statusChange).toBe('กำลังใช้งาน ➔ จำหน่าย/ตัดบัญชี');
    expect(logs[0].notes).toBe('Decommissioned');

    // Middle: Update/Move
    expect(logs[1].id).toBe('2');
    expect(logs[1].action).toBe('แก้ไข/ย้ายตำแหน่ง');
    expect(logs[1].locationChange).toBe('Rack 1 ➔ Rack 2');
    expect(logs[1].statusChange).toBe('พร้อมใช้งาน ➔ กำลังใช้งาน');
    expect(logs[1].responsibleChange).toBe('Engineer 1 ➔ Engineer 2');

    // Oldest: Initial creation
    expect(logs[2].id).toBe('1');
    expect(logs[2].action).toBe('บันทึกรายการใหม่');
    expect(logs[2].locationChange).toBe('- ➔ Rack 1');
    expect(logs[2].statusChange).toBe('- ➔ พร้อมใช้งาน');
  });

  it('attaches imageUrl to AssetLogRecords and notes photo updates in changeSummary', () => {
    const txs: AssetTransaction[] = [
      {
        id: 'tx-1',
        timestamp: '2026-01-01T10:00:00Z',
        action: 'บันทึกรายการใหม่',
        assetCode: 'EQ-DIFF-PHOTO',
        name: 'อุปกรณ์พกพา',
        location: 'โต๊ะ 1',
        status: 'พร้อมใช้งาน',
        responsiblePerson: 'นารี',
        recordedBy: 'Admin',
        notes: '',
        imageUrl: 'https://drive.google.com/uc?id=img-01',
      },
      {
        id: 'tx-2',
        timestamp: '2026-01-02T10:00:00Z',
        action: 'แก้ไข/ย้ายตำแหน่ง',
        assetCode: 'EQ-DIFF-PHOTO',
        name: 'อุปกรณ์พกพา',
        location: 'โต๊ะ 1',
        status: 'พร้อมใช้งาน',
        responsiblePerson: 'นารี',
        recordedBy: 'Admin',
        notes: '',
        imageUrl: 'https://drive.google.com/uc?id=img-02',
      },
    ];

    const logs = computeTransactionDiffs(txs);
    expect(logs.length).toBe(2);
    // Newest log (tx-2): photo updated
    expect(logs[0].imageUrl).toBe('https://drive.google.com/uc?id=img-02');
    expect(logs[0].changeSummary).toContain('อัปเดตรูปถ่าย');

    // Oldest log (tx-1): initial photo
    expect(logs[1].imageUrl).toBe('https://drive.google.com/uc?id=img-01');
  });
});

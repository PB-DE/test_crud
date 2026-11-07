import { describe, it, expect } from 'vitest';
import {
  filterRecords,
  sortRecords,
  filterLogs,
  formatLogDateTime,
  getActionBadgeStyle,
} from '../src/lib/filter-utils';
import { findAssetByCode, reconcileAssetRecords } from '../src/lib/ui-helpers';
import { AssetRecord, AssetLogRecord } from '../src/lib/types';

describe('filterRecords', () => {
  const records: AssetRecord[] = [
    {
      id: '1',
      assetCode: 'EQ-2026-001',
      name: 'คอมพิวเตอร์ All-in-One Dell OptiPlex',
      location: 'อาคาร 1 ชั้น 3 ห้อง 301',
      status: 'พร้อมใช้งาน',
      responsiblePerson: 'สมชาย ใจดี',
      recordedBy: 'เจ้าหน้าที่พัสดุ A',
      notes: 'ใช้งานได้ปกติ',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: '2',
      assetCode: 'EQ-2026-002',
      name: 'เครื่องพิมพ์ HP LaserJet Pro',
      location: 'อาคาร 2 ชั้น 1 ฝ่ายการเงิน',
      status: 'ส่งซ่อม',
      responsiblePerson: 'วิภาดา รักงาน',
      recordedBy: 'เจ้าหน้าที่พัสดุ B',
      notes: 'ลูกกลิ้งดึงกระดาษติดขัด รออะไหล่',
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    },
    {
      id: '3',
      assetCode: 'EQ-2026-003',
      name: 'เก้าอี้เพื่อสุขภาพ Ergonomic Chair',
      location: 'อาคาร 1 ชั้น 2 ห้อง HR',
      status: 'กำลังใช้งาน',
      responsiblePerson: 'อนุชา กิตติสุข',
      recordedBy: 'เจ้าหน้าที่พัสดุ A',
      notes: 'เบิกไปใช้งานประจำโต๊ะ',
      createdAt: '2026-01-03T00:00:00Z',
      updatedAt: '2026-01-03T00:00:00Z',
    },
    {
      id: '4',
      assetCode: 'EQ-2026-004',
      name: 'โปรเจคเตอร์ Epson EB-X51',
      location: 'ห้องประชุมใหญ่ ชั้น 4',
      status: 'จำหน่าย/ตัดบัญชี',
      responsiblePerson: 'ธนากร มั่งคั่ง',
      recordedBy: 'เจ้าหน้าที่พัสดุ C',
      notes: 'หลอดภาพขาด ชำรุดตามอายุการใช้งาน',
      createdAt: '2026-01-04T00:00:00Z',
      updatedAt: '2026-01-04T00:00:00Z',
    },
  ];

  it('filters records by search query case-insensitively across assetCode', () => {
    const result = filterRecords(records, 'eq-2026-002', 'All');
    expect(result.length).toBe(1);
    expect(result[0].assetCode).toBe('EQ-2026-002');
  });

  it('filters records by search query across name', () => {
    const result = filterRecords(records, 'laserjet', 'All');
    expect(result.length).toBe(1);
    expect(result[0].assetCode).toBe('EQ-2026-002');
  });

  it('filters records by search query across location', () => {
    const result = filterRecords(records, 'ฝ่ายการเงิน', 'All');
    expect(result.length).toBe(1);
    expect(result[0].assetCode).toBe('EQ-2026-002');
  });

  it('filters records by search query across responsiblePerson', () => {
    const result = filterRecords(records, 'สมชาย', 'All');
    expect(result.length).toBe(1);
    expect(result[0].assetCode).toBe('EQ-2026-001');
  });

  it('filters records by search query across recordedBy', () => {
    const result = filterRecords(records, 'เจ้าหน้าที่พัสดุ B', 'All');
    expect(result.length).toBe(1);
    expect(result[0].assetCode).toBe('EQ-2026-002');
  });

  it('filters records by search query across notes', () => {
    const result = filterRecords(records, 'รออะไหล่', 'All');
    expect(result.length).toBe(1);
    expect(result[0].assetCode).toBe('EQ-2026-002');
  });

  it('filters records by status tag', () => {
    const result = filterRecords(records, '', 'ส่งซ่อม');
    expect(result.length).toBe(1);
    expect(result[0].assetCode).toBe('EQ-2026-002');
  });

  it('returns all records when query is empty and status is All or ทั้งหมด', () => {
    const resultAll = filterRecords(records, '', 'All');
    expect(resultAll.length).toBe(4);

    const resultThaiAll = filterRecords(records, '', 'ทั้งหมด');
    expect(resultThaiAll.length).toBe(4);
  });

  it('combines search query and status filter correctly', () => {
    const result = filterRecords(records, 'อาคาร 1', 'พร้อมใช้งาน');
    expect(result.length).toBe(1);
    expect(result[0].assetCode).toBe('EQ-2026-001');

    const noMatch = filterRecords(records, 'อาคาร 1', 'ส่งซ่อม');
    expect(noMatch.length).toBe(0);
  });

  it('handles whitespace-only queries by ignoring them', () => {
    const result = filterRecords(records, '   ', 'All');
    expect(result.length).toBe(4);
  });

  it('handles records with undefined or null fields defensively without crashing', () => {
    const sparseRecords = [
      {
        id: '99',
        assetCode: undefined as unknown as string,
        name: undefined as unknown as string,
        location: null as unknown as string,
        status: undefined as unknown as any,
        responsiblePerson: undefined as unknown as string,
        recordedBy: null as unknown as string,
        notes: undefined as unknown as string,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: '100',
        assetCode: 'EQ-DEF-100',
        name: 'Defensive Test Asset',
        location: 'Lab Room',
        status: 'พร้อมใช้งาน' as const,
        responsiblePerson: 'Tester',
        recordedBy: 'Admin',
        notes: '',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];

    expect(() => filterRecords(sparseRecords, 'defensive', 'All')).not.toThrow();
    const matches = filterRecords(sparseRecords, 'defensive', 'All');
    expect(matches.length).toBe(1);
    expect(matches[0].id).toBe('100');

    expect(() => filterRecords(sparseRecords, 'anything', 'พร้อมใช้งาน')).not.toThrow();
  });
});

describe('sortRecords', () => {
  const records: AssetRecord[] = [
    {
      id: '1',
      assetCode: 'EQ-003',
      name: 'Charlie Display Monitor',
      location: 'อาคาร C ชั้น 3',
      status: 'ส่งซ่อม',
      responsiblePerson: 'สมศักดิ์',
      recordedBy: 'พัสดุ 3',
      notes: '',
      createdAt: '2026-01-03T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: '2',
      assetCode: 'EQ-001',
      name: 'Alice Laptop Dell',
      location: 'อาคาร A ชั้น 1',
      status: 'พร้อมใช้งาน',
      responsiblePerson: 'กานดา',
      recordedBy: 'พัสดุ 1',
      notes: '',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-03T00:00:00Z',
    },
    {
      id: '3',
      assetCode: 'EQ-002',
      name: 'bob Projector Sony',
      location: 'อาคาร B ชั้น 2',
      status: 'กำลังใช้งาน',
      responsiblePerson: 'ประสิทธิ์',
      recordedBy: 'พัสดุ 2',
      notes: '',
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    },
  ];

  it('sorts records ascending by assetCode case-insensitively', () => {
    const sorted = sortRecords(records, 'assetCode', 'asc');
    expect(sorted.map((r) => r.assetCode)).toEqual(['EQ-001', 'EQ-002', 'EQ-003']);
  });

  it('sorts records descending by assetCode case-insensitively', () => {
    const sorted = sortRecords(records, 'assetCode', 'desc');
    expect(sorted.map((r) => r.assetCode)).toEqual(['EQ-003', 'EQ-002', 'EQ-001']);
  });

  it('sorts records ascending by name case-insensitively', () => {
    const sorted = sortRecords(records, 'name', 'asc');
    expect(sorted.map((r) => r.name)).toEqual([
      'Alice Laptop Dell',
      'bob Projector Sony',
      'Charlie Display Monitor',
    ]);
  });

  it('sorts records descending by name case-insensitively', () => {
    const sorted = sortRecords(records, 'name', 'desc');
    expect(sorted.map((r) => r.name)).toEqual([
      'Charlie Display Monitor',
      'bob Projector Sony',
      'Alice Laptop Dell',
    ]);
  });

  it('sorts records ascending and descending by location', () => {
    const asc = sortRecords(records, 'location', 'asc');
    expect(asc.map((r) => r.id)).toEqual(['2', '3', '1']);

    const desc = sortRecords(records, 'location', 'desc');
    expect(desc.map((r) => r.id)).toEqual(['1', '3', '2']);
  });

  it('sorts records ascending and descending by responsiblePerson', () => {
    const asc = sortRecords(records, 'responsiblePerson', 'asc');
    expect(asc.map((r) => r.id)).toEqual(['2', '3', '1']);

    const desc = sortRecords(records, 'responsiblePerson', 'desc');
    expect(desc.map((r) => r.id)).toEqual(['1', '3', '2']);
  });

  it('sorts records ascending by updatedAt date', () => {
    const sorted = sortRecords(records, 'updatedAt', 'asc');
    expect(sorted.map((r) => r.id)).toEqual(['1', '3', '2']);
  });

  it('sorts records descending by updatedAt date', () => {
    const sorted = sortRecords(records, 'updatedAt', 'desc');
    expect(sorted.map((r) => r.id)).toEqual(['2', '3', '1']);
  });

  it('does not mutate the original array', () => {
    const copy = [...records];
    sortRecords(records, 'assetCode', 'asc');
    expect(records).toEqual(copy);
  });
});

describe('filterLogs', () => {
  const sampleLogs: AssetLogRecord[] = [
    {
      id: 'log-1',
      timestamp: '2026-01-01T10:00:00.000Z',
      action: 'บันทึกรายการใหม่',
      assetId: '1',
      assetCode: 'EQ-001',
      name: 'คอมพิวเตอร์ Dell',
      locationChange: '-',
      responsibleChange: '-',
      statusChange: '-',
      changeSummary: 'สร้างรายการใหม่',
      recordedBy: 'เจ้าหน้าที่สมชาย',
      notes: 'จัดซื้อประจำปี 69',
    },
    {
      id: 'log-2',
      timestamp: '2026-01-02T14:30:00.000Z',
      action: 'แก้ไข/ย้ายตำแหน่ง',
      assetId: '1',
      assetCode: 'EQ-001',
      name: 'คอมพิวเตอร์ Dell',
      locationChange: 'อาคาร 1 ห้อง 101 ➔ อาคาร 2 ห้อง 202',
      responsibleChange: 'สมชาย ➔ สมหญิง',
      statusChange: 'พร้อมใช้งาน ➔ กำลังใช้งาน',
      changeSummary: 'ย้ายสถานที่, เปลี่ยนผู้รับผิดชอบ, เปลี่ยนสถานะ',
      recordedBy: 'เจ้าหน้าที่สมหญิง',
      notes: 'ย้ายไปห้องแล็บใหม่',
    },
    {
      id: 'log-3',
      timestamp: '2026-01-03T09:15:00.000Z',
      action: 'ลบรายการ',
      assetId: '2',
      assetCode: 'EQ-002',
      name: 'เครื่องพิมพ์ HP',
      locationChange: '-',
      responsibleChange: '-',
      statusChange: '-',
      changeSummary: 'ลบรายการออกจากระบบ',
      recordedBy: 'เจ้าหน้าที่สมชาย',
      notes: 'ชำรุดจำหน่ายออก',
    },
  ];

  it('filters logs by assetCode query case-insensitively', () => {
    const result = filterLogs(sampleLogs, 'eq-002');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('log-3');
  });

  it('filters logs by asset name', () => {
    const result = filterLogs(sampleLogs, 'Dell');
    expect(result.length).toBe(2);
  });

  it('filters logs by action', () => {
    const result = filterLogs(sampleLogs, 'ลบรายการ');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('log-3');
  });

  it('filters logs by location change text', () => {
    const result = filterLogs(sampleLogs, 'อาคาร 2');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('log-2');
  });

  it('filters logs by responsible person change text', () => {
    const result = filterLogs(sampleLogs, 'สมหญิง');
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('log-2');
  });

  it('filters logs by recordedBy and notes', () => {
    const resultNotes = filterLogs(sampleLogs, 'จัดซื้อประจำปี');
    expect(resultNotes.length).toBe(1);
    expect(resultNotes[0].id).toBe('log-1');
  });

  it('returns all logs when query is empty or whitespace', () => {
    expect(filterLogs(sampleLogs, '').length).toBe(3);
    expect(filterLogs(sampleLogs, '   ').length).toBe(3);
  });

  it('handles null and undefined fields defensively', () => {
    const sparseLogs: any[] = [
      {
        id: 'sparse-1',
        assetCode: null,
        name: undefined,
        action: 'บันทึกรายการใหม่',
        locationChange: undefined,
        responsibleChange: null,
        statusChange: undefined,
        changeSummary: null,
        recordedBy: undefined,
        notes: null,
      },
    ];
    expect(() => filterLogs(sparseLogs, 'test')).not.toThrow();
    expect(filterLogs(sparseLogs, 'test').length).toBe(0);
  });
});

describe('getActionBadgeStyle', () => {
  it('returns green badge style for "บันทึกรายการใหม่"', () => {
    const style = getActionBadgeStyle('บันทึกรายการใหม่');
    expect(style.bg).toContain('emerald');
    expect(style.text).toContain('emerald');
  });

  it('returns blue badge style for "แก้ไข/ย้ายตำแหน่ง"', () => {
    const style = getActionBadgeStyle('แก้ไข/ย้ายตำแหน่ง');
    expect(style.bg).toContain('blue');
    expect(style.text).toContain('blue');
  });

  it('returns rose badge style for "ลบรายการ"', () => {
    const style = getActionBadgeStyle('ลบรายการ');
    expect(style.bg).toContain('rose');
    expect(style.text).toContain('rose');
  });

  it('returns neutral badge style for unknown action', () => {
    const style = getActionBadgeStyle('unknown');
    expect(style.bg).toContain('slate');
  });
});

describe('formatLogDateTime', () => {
  it('formats ISO timestamp into readable Thai datetime', () => {
    const formatted = formatLogDateTime('2026-01-15T08:30:00.000Z');
    expect(formatted).toBeTruthy();
    expect(typeof formatted).toBe('string');
  });

  it('returns fallback string for invalid or empty dates', () => {
    expect(formatLogDateTime('')).toBe('—');
    expect(formatLogDateTime(undefined)).toBe('—');
    expect(formatLogDateTime('invalid-date')).toBe('invalid-date');
  });
});

describe('findAssetByCode lookup helper', () => {
  const records: AssetRecord[] = [
    {
      id: '1',
      assetCode: 'EQ-001',
      name: 'Server Dell',
      location: 'Room 101',
      status: 'พร้อมใช้งาน',
      responsiblePerson: 'Alice',
      recordedBy: 'Admin',
      notes: '',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: '2',
      assetCode: 'EQ-002',
      name: 'Switch Cisco',
      location: 'Room 202',
      status: 'กำลังใช้งาน',
      responsiblePerson: 'Bob',
      recordedBy: 'Admin',
      notes: '',
      createdAt: '',
      updatedAt: '',
    },
  ];

  it('finds existing asset ignoring case and whitespace', () => {
    expect(findAssetByCode('  eq-001 ', records)?.name).toBe('Server Dell');
  });

  it('returns null when asset code not found', () => {
    expect(findAssetByCode('EQ-999', records)).toBeNull();
  });

  it('returns null when code is empty or only whitespace', () => {
    expect(findAssetByCode('', records)).toBeNull();
    expect(findAssetByCode('   ', records)).toBeNull();
  });

  it('returns null when records is empty or undefined', () => {
    expect(findAssetByCode('EQ-001', [])).toBeNull();
    expect(findAssetByCode('EQ-001', undefined as unknown as AssetRecord[])).toBeNull();
  });

  it('handles records with missing or empty assetCode gracefully', () => {
    const recordsWithEmpty = [
      ...records,
      {
        id: '3',
        assetCode: '',
        name: 'No Code Item',
        location: 'Room 303',
        status: 'พร้อมใช้งาน' as const,
        responsiblePerson: 'Charlie',
        recordedBy: 'Admin',
        notes: '',
        createdAt: '',
        updatedAt: '',
      },
    ];
    expect(findAssetByCode('EQ-002', recordsWithEmpty)?.name).toBe('Switch Cisco');
    expect(findAssetByCode('', recordsWithEmpty)).toBeNull();
  });
});

describe('reconcileAssetRecords helper', () => {
  const current: AssetRecord[] = [
    {
      id: '1',
      assetCode: 'EQ-01',
      name: 'PC',
      location: '101',
      status: 'พร้อมใช้งาน',
      responsiblePerson: 'A',
      recordedBy: 'Admin',
      notes: '',
      createdAt: '',
      updatedAt: '',
    },
    {
      id: '2',
      assetCode: 'EQ-02',
      name: 'Printer',
      location: '102',
      status: 'พร้อมใช้งาน',
      responsiblePerson: 'B',
      recordedBy: 'Admin',
      notes: '',
      createdAt: '',
      updatedAt: '',
    },
  ];

  it('updates existing record in-place without duplicating rows', () => {
    const updated: AssetRecord = { ...current[0], location: '202' };
    const result = reconcileAssetRecords(current, updated);
    expect(result.length).toBe(2);
    expect(result[0].location).toBe('202');
    expect(result[1].id).toBe('2');
  });

  it('updates existing record in the middle without changing order', () => {
    const updated: AssetRecord = { ...current[1], status: 'ส่งซ่อม' };
    const result = reconcileAssetRecords(current, updated);
    expect(result.length).toBe(2);
    expect(result[0].id).toBe('1');
    expect(result[1].status).toBe('ส่งซ่อม');
  });

  it('prepends newly created record if not already in list', () => {
    const created: AssetRecord = {
      id: '3',
      assetCode: 'EQ-03',
      name: 'Monitor',
      location: '103',
      status: 'พร้อมใช้งาน',
      responsiblePerson: 'C',
      recordedBy: 'Admin',
      notes: '',
      createdAt: '',
      updatedAt: '',
    };
    const result = reconcileAssetRecords(current, created);
    expect(result.length).toBe(3);
    expect(result[0].id).toBe('3');
    expect(result[1].id).toBe('1');
    expect(result[2].id).toBe('2');
  });

  it('does not mutate original array', () => {
    const copy = [...current];
    const created: AssetRecord = {
      id: '3',
      assetCode: 'EQ-03',
      name: 'Monitor',
      location: '103',
      status: 'พร้อมใช้งาน',
      responsiblePerson: 'C',
      recordedBy: 'Admin',
      notes: '',
      createdAt: '',
      updatedAt: '',
    };
    reconcileAssetRecords(current, created);
    expect(current).toEqual(copy);
  });

  it('handles empty or undefined previous records array defensively', () => {
    const item: AssetRecord = {
      id: '1',
      assetCode: 'EQ-01',
      name: 'PC',
      location: '101',
      status: 'พร้อมใช้งาน',
      responsiblePerson: 'A',
      recordedBy: 'Admin',
      notes: '',
      createdAt: '',
      updatedAt: '',
    };
    expect(reconcileAssetRecords([], item)).toEqual([item]);
    expect(reconcileAssetRecords(undefined as unknown as AssetRecord[], item)).toEqual([item]);
  });

  it('reconciles soft-decommissioned record by preserving its place and updating status to จำหน่าย/ตัดบัญชี', () => {
    const decommissioned: AssetRecord = {
      ...current[0],
      status: 'จำหน่าย/ตัดบัญชี',
      updatedAt: '2026-02-01T00:00:00Z',
      transactionCount: 2,
    };
    const reconciled = reconcileAssetRecords(current, decommissioned);
    expect(reconciled.length).toBe(2);
    expect(reconciled[0].status).toBe('จำหน่าย/ตัดบัญชี');
    expect(reconciled[0].transactionCount).toBe(2);
    expect(reconciled[1].status).toBe('พร้อมใช้งาน');
  });
});

describe('sortRecords by updatedAt (indicator of latest state)', () => {
  it('sorts records chronologically descending by updatedAt as the latest state indicator', () => {
    const list: AssetRecord[] = [
      {
        id: '1',
        assetCode: 'EQ-01',
        name: 'Item 1',
        location: 'A',
        status: 'พร้อมใช้งาน',
        responsiblePerson: 'A',
        recordedBy: 'Admin',
        notes: '',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T10:00:00Z',
      },
      {
        id: '2',
        assetCode: 'EQ-02',
        name: 'Item 2',
        location: 'B',
        status: 'กำลังใช้งาน',
        responsiblePerson: 'B',
        recordedBy: 'Admin',
        notes: '',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-03T15:00:00Z',
      },
    ];

    const sortedDesc = sortRecords(list, 'updatedAt', 'desc');
    expect(sortedDesc[0].id).toBe('2');
    expect(sortedDesc[1].id).toBe('1');

    const sortedAsc = sortRecords(list, 'updatedAt', 'asc');
    expect(sortedAsc[0].id).toBe('1');
    expect(sortedAsc[1].id).toBe('2');
  });
});



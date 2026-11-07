import { describe, it, expect } from 'vitest';
import { filterRecords, sortRecords } from '../src/lib/filter-utils';
import { AssetRecord } from '../src/lib/types';

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

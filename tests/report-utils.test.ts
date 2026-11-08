import { describe, it, expect } from 'vitest';
import {
  calculateStatusSummary,
  groupAssetsByStatus,
} from '@/lib/report-utils';
import { AssetRecord } from '@/lib/types';

describe('report-utils', () => {
  const mockRecords: AssetRecord[] = [
    {
      id: 'rec-1',
      assetCode: 'DLT-001',
      name: 'คอมพิวเตอร์ตั้งโต๊ะ',
      location: 'ห้อง 101',
      status: 'พร้อมใช้งาน',
      responsiblePerson: 'สมชาย',
      recordedBy: 'ผู้ดูแล',
      notes: 'สภาพดี',
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-01T10:00:00.000Z',
    },
    {
      id: 'rec-2',
      assetCode: 'DLT-002',
      name: 'เครื่องพิมพ์เลเซอร์',
      location: 'ห้อง 102',
      status: 'กำลังใช้งาน',
      responsiblePerson: 'สมหญิง',
      recordedBy: 'ผู้ดูแล',
      notes: '',
      createdAt: '2026-11-02T10:00:00.000Z',
      updatedAt: '2026-11-02T10:00:00.000Z',
    },
    {
      id: 'rec-3',
      assetCode: 'DLT-003',
      name: 'จอภาพ 24 นิ้ว',
      location: 'ห้อง 101',
      status: 'กำลังใช้งาน',
      responsiblePerson: 'สมชาย',
      recordedBy: 'ผู้ดูแล',
      notes: '',
      createdAt: '2026-11-03T10:00:00.000Z',
      updatedAt: '2026-11-03T10:00:00.000Z',
    },
    {
      id: 'rec-4',
      assetCode: 'DLT-004',
      name: 'เก้าอี้สำนักงาน',
      location: 'ห้องประชุม',
      status: 'ส่งซ่อม',
      responsiblePerson: 'ประสิทธิ์',
      recordedBy: 'ผู้ดูแล',
      notes: 'ขาเก้าอี้หัก',
      createdAt: '2026-11-04T10:00:00.000Z',
      updatedAt: '2026-11-04T10:00:00.000Z',
    },
    {
      id: 'rec-5',
      assetCode: 'DLT-005',
      name: 'โต๊ะทำงานเก่า',
      location: 'ห้องเก็บของ',
      status: 'จำหน่าย/ตัดบัญชี',
      responsiblePerson: '-',
      recordedBy: 'ผู้ดูแล',
      notes: 'ชำรุดทรุดโทรม',
      createdAt: '2026-11-05T10:00:00.000Z',
      updatedAt: '2026-11-05T10:00:00.000Z',
    },
  ];

  describe('calculateStatusSummary', () => {
    it('handles empty records array gracefully', () => {
      const summary = calculateStatusSummary([]);
      expect(summary.total).toBe(0);
      expect(summary.items).toHaveLength(4);

      for (const item of summary.items) {
        expect(item.count).toBe(0);
        expect(item.percentage).toBe(0);
      }
    });

    it('correctly calculates counts and percentages for populated records', () => {
      const summary = calculateStatusSummary(mockRecords);
      expect(summary.total).toBe(5);

      const readyItem = summary.items.find((i) => i.status === 'พร้อมใช้งาน');
      expect(readyItem).toBeDefined();
      expect(readyItem?.count).toBe(1);
      expect(readyItem?.percentage).toBe(20);

      const inUseItem = summary.items.find((i) => i.status === 'กำลังใช้งาน');
      expect(inUseItem).toBeDefined();
      expect(inUseItem?.count).toBe(2);
      expect(inUseItem?.percentage).toBe(40);

      const repairItem = summary.items.find((i) => i.status === 'ส่งซ่อม');
      expect(repairItem).toBeDefined();
      expect(repairItem?.count).toBe(1);
      expect(repairItem?.percentage).toBe(20);

      const disposedItem = summary.items.find((i) => i.status === 'จำหน่าย/ตัดบัญชี');
      expect(disposedItem).toBeDefined();
      expect(disposedItem?.count).toBe(1);
      expect(disposedItem?.percentage).toBe(20);
    });

    it('provides theme color tokens for each status', () => {
      const summary = calculateStatusSummary(mockRecords);
      for (const item of summary.items) {
        expect(item.colorClass).toBeDefined();
        expect(item.bgClass).toBeDefined();
        expect(item.borderClass).toBeDefined();
      }
    });
  });

  describe('groupAssetsByStatus', () => {
    it('returns empty lists for all statuses when records are empty', () => {
      const grouped = groupAssetsByStatus([]);
      expect(grouped['พร้อมใช้งาน']).toEqual([]);
      expect(grouped['กำลังใช้งาน']).toEqual([]);
      expect(grouped['ส่งซ่อม']).toEqual([]);
      expect(grouped['จำหน่าย/ตัดบัญชี']).toEqual([]);
    });

    it('groups records under their corresponding status accurately', () => {
      const grouped = groupAssetsByStatus(mockRecords);

      expect(grouped['พร้อมใช้งาน']).toHaveLength(1);
      expect(grouped['พร้อมใช้งาน'][0].assetCode).toBe('DLT-001');

      expect(grouped['กำลังใช้งาน']).toHaveLength(2);
      expect(grouped['กำลังใช้งาน'].map((r) => r.assetCode)).toEqual(['DLT-002', 'DLT-003']);

      expect(grouped['ส่งซ่อม']).toHaveLength(1);
      expect(grouped['ส่งซ่อม'][0].assetCode).toBe('DLT-004');

      expect(grouped['จำหน่าย/ตัดบัญชี']).toHaveLength(1);
      expect(grouped['จำหน่าย/ตัดบัญชี'][0].assetCode).toBe('DLT-005');
    });

    it('safely skips or handles records with unexpected statuses without throwing', () => {
      const recordsWithInvalid: any[] = [
        ...mockRecords,
        {
          id: 'rec-invalid',
          assetCode: 'DLT-999',
          name: 'รายการไม่ระบุ',
          status: 'สถานะแปลกปลอม',
        },
      ];

      expect(() => groupAssetsByStatus(recordsWithInvalid)).not.toThrow();
      const grouped = groupAssetsByStatus(recordsWithInvalid);
      expect(grouped['พร้อมใช้งาน']).toHaveLength(1);
    });
  });
});


import { AssetRecord, AssetStatus, ASSET_STATUSES } from './types';

export interface StatusSummaryItem {
  status: AssetStatus;
  label: string;
  count: number;
  percentage: number;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  dotClass: string;
}

export interface StatusSummaryReport {
  total: number;
  items: StatusSummaryItem[];
  generatedAt: string;
}

export const STATUS_THEME_MAP: Record<
  AssetStatus,
  {
    label: string;
    colorClass: string;
    bgClass: string;
    borderClass: string;
    dotClass: string;
  }
> = {
  พร้อมใช้งาน: {
    label: 'พร้อมใช้งาน',
    colorClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  กำลังใช้งาน: {
    label: 'กำลังใช้งาน',
    colorClass: 'text-blue-700',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
    dotClass: 'bg-blue-500',
  },
  ส่งซ่อม: {
    label: 'ส่งซ่อม',
    colorClass: 'text-amber-700',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
    dotClass: 'bg-amber-500',
  },
  'จำหน่าย/ตัดบัญชี': {
    label: 'จำหน่าย/ตัดบัญชี',
    colorClass: 'text-slate-600',
    bgClass: 'bg-slate-100',
    borderClass: 'border-slate-300',
    dotClass: 'bg-slate-500',
  },
};

/**
 * Calculates total asset count, count per status, and rounded percentage breakdown.
 */
export function calculateStatusSummary(
  records: AssetRecord[],
  timestamp: string = new Date().toISOString()
): StatusSummaryReport {
  const total = records.length;

  const countMap: Record<AssetStatus, number> = {
    พร้อมใช้งาน: 0,
    กำลังใช้งาน: 0,
    ส่งซ่อม: 0,
    'จำหน่าย/ตัดบัญชี': 0,
  };

  for (const record of records) {
    if (record.status in countMap) {
      countMap[record.status as AssetStatus]++;
    }
  }

  const items: StatusSummaryItem[] = ASSET_STATUSES.map((status) => {
    const count = countMap[status] || 0;
    const rawPercentage = total > 0 ? (count / total) * 100 : 0;
    const percentage = Math.round(rawPercentage * 10) / 10;
    const theme = STATUS_THEME_MAP[status];

    return {
      status,
      label: theme.label,
      count,
      percentage,
      colorClass: theme.colorClass,
      bgClass: theme.bgClass,
      borderClass: theme.borderClass,
      dotClass: theme.dotClass,
    };
  });

  return {
    total,
    items,
    generatedAt: timestamp,
  };
}

/**
 * Groups asset records by their status in standard display order.
 */
export function groupAssetsByStatus(
  records: AssetRecord[]
): Record<AssetStatus, AssetRecord[]> {
  const grouped: Record<AssetStatus, AssetRecord[]> = {
    พร้อมใช้งาน: [],
    กำลังใช้งาน: [],
    ส่งซ่อม: [],
    'จำหน่าย/ตัดบัญชี': [],
  };

  for (const record of records) {
    if (record.status in grouped) {
      grouped[record.status as AssetStatus].push(record);
    }
  }

  return grouped;
}

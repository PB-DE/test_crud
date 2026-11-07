export type AssetStatus = 'พร้อมใช้งาน' | 'กำลังใช้งาน' | 'ส่งซ่อม' | 'จำหน่าย/ตัดบัญชี';

export const ASSET_STATUSES: AssetStatus[] = [
  'พร้อมใช้งาน',
  'กำลังใช้งาน',
  'ส่งซ่อม',
  'จำหน่าย/ตัดบัญชี',
];

export interface AssetRecord {
  id: string;
  assetCode: string;
  name: string;
  location: string;
  status: AssetStatus;
  responsiblePerson: string;
  recordedBy: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateAssetInput = Omit<AssetRecord, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateAssetInput = Partial<Omit<AssetRecord, 'id' | 'createdAt'>>;

export function isValidAssetStatus(status: unknown): status is AssetStatus {
  return typeof status === 'string' && (ASSET_STATUSES as readonly string[]).includes(status);
}

export type LogAction = 'บันทึกรายการใหม่' | 'แก้ไข/ย้ายตำแหน่ง' | 'ลบรายการ';

export interface AssetLogRecord {
  id: string;
  timestamp: string;
  action: LogAction;
  assetId: string;
  assetCode: string;
  name: string;
  locationChange: string;
  responsibleChange: string;
  statusChange: string;
  changeSummary: string;
  recordedBy: string;
  notes: string;
}

// Backward-compatible aliases for downstream modules during transition:
export type RecordItem = AssetRecord;
export type CreateRecordInput = CreateAssetInput;
export type UpdateRecordInput = UpdateAssetInput;
export const isValidStatus = isValidAssetStatus;
export const RECORD_STATUSES = ASSET_STATUSES;
export type RecordStatus = AssetStatus;

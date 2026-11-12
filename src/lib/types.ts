export type AssetStatus = 'พร้อมใช้งาน' | 'กำลังใช้งาน' | 'ส่งซ่อม' | 'จำหน่าย/ตัดบัญชี';

export const ASSET_STATUSES: AssetStatus[] = [
  'พร้อมใช้งาน',
  'กำลังใช้งาน',
  'ส่งซ่อม',
  'จำหน่าย/ตัดบัญชี',
];

export type TransactionAction = 'บันทึกรายการใหม่' | 'แก้ไข/ย้ายตำแหน่ง' | 'จำหน่าย/ตัดบัญชี';

export interface AssetTransaction {
  id: string;
  timestamp: string; // ISO 8601
  action: TransactionAction;
  assetCode: string;
  name: string;
  location: string;
  status: AssetStatus;
  responsiblePerson: string;
  recordedBy: string;
  notes: string;
  imageUrl?: string;
  mainCategory?: string;
  subCategory?: string;
  acquisitionDate?: string;
  unitPrice?: number;
  budgetSource?: string;
}

export interface AssetRecord {
  id: string;
  assetCode: string;
  name: string;
  location: string;
  status: AssetStatus;
  responsiblePerson: string;
  recordedBy: string;
  notes: string;
  imageUrl?: string;
  mainCategory?: string;
  subCategory?: string;
  acquisitionDate?: string;
  unitPrice?: number;
  budgetSource?: string;
  createdAt: string;
  updatedAt: string;
  transactionCount?: number;
  action?: TransactionAction;
}

export type CreateAssetInput = Omit<AssetRecord, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateAssetInput = Partial<Omit<AssetRecord, 'id' | 'createdAt'>>;

export function isValidAssetStatus(status: unknown): status is AssetStatus {
  return typeof status === 'string' && (ASSET_STATUSES as readonly string[]).includes(status);
}

export type LogAction = 'บันทึกรายการใหม่' | 'แก้ไข/ย้ายตำแหน่ง' | 'จำหน่าย/ตัดบัญชี' | 'ลบรายการ';

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
  imageUrl?: string;
}

export type ConfigurableFieldKey =
  | 'name'
  | 'location'
  | 'responsiblePerson'
  | 'recordedBy'
  | 'mainCategory'
  | 'subCategory'
  | 'acquisitionDate'
  | 'unitPrice'
  | 'budgetSource'
  | 'notes';

export type DropdownFieldKey =
  | 'name'
  | 'location'
  | 'responsiblePerson'
  | 'recordedBy'
  | 'mainCategory'
  | 'subCategory'
  | 'budgetSource';

export interface DropdownOption {
  id: string;
  fieldKey: DropdownFieldKey;
  value: string;
  parentValue?: string;
  updatedAt?: string;
}

export interface FieldSetting {
  fieldKey: ConfigurableFieldKey;
  label: string;
  required: boolean;
  useDropdown: boolean;
  supportsDropdown: boolean;
}

export interface SystemOptionsPayload {
  options: DropdownOption[];
  fieldSettings: FieldSetting[];
}

export const DEFAULT_FIELD_SETTINGS: FieldSetting[] = [
  { fieldKey: 'name', label: 'ชื่อครุภัณฑ์', required: true, useDropdown: false, supportsDropdown: true },
  { fieldKey: 'mainCategory', label: 'ประเภทหลัก', required: false, useDropdown: true, supportsDropdown: true },
  { fieldKey: 'subCategory', label: 'ประเภทย่อย', required: false, useDropdown: true, supportsDropdown: true },
  { fieldKey: 'location', label: 'ตำแหน่งที่ตั้ง', required: true, useDropdown: true, supportsDropdown: true },
  { fieldKey: 'acquisitionDate', label: 'วันที่ได้มา', required: false, useDropdown: false, supportsDropdown: false },
  { fieldKey: 'unitPrice', label: 'ราคา/หน่วย', required: false, useDropdown: false, supportsDropdown: false },
  { fieldKey: 'budgetSource', label: 'งบที่ซื้อ', required: false, useDropdown: false, supportsDropdown: true },
  { fieldKey: 'responsiblePerson', label: 'ผู้รับผิดชอบ', required: true, useDropdown: false, supportsDropdown: true },
  { fieldKey: 'recordedBy', label: 'ผู้บันทึก', required: true, useDropdown: false, supportsDropdown: true },
  { fieldKey: 'notes', label: 'หมายเหตุ', required: false, useDropdown: false, supportsDropdown: false },
];

// Backward-compatible aliases for downstream modules during transition:
export type RecordItem = AssetRecord;
export type CreateRecordInput = CreateAssetInput;
export type UpdateRecordInput = UpdateAssetInput;
export const isValidStatus = isValidAssetStatus;
export const RECORD_STATUSES = ASSET_STATUSES;
export type RecordStatus = AssetStatus;

export const RECORD_STATUSES = ['Active', 'Pending', 'Inactive'] as const;
export type RecordStatus = (typeof RECORD_STATUSES)[number];

export function isValidStatus(val: unknown): val is RecordStatus {
  return typeof val === 'string' && (RECORD_STATUSES as readonly string[]).includes(val);
}

export interface RecordItem {
  id: string;
  name: string;
  email: string;
  role: string;
  status: RecordStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateRecordInput = Omit<RecordItem, 'id' | 'createdAt' | 'updatedAt'>;

export type UpdateRecordInput = Partial<Omit<RecordItem, 'id' | 'createdAt'>>;

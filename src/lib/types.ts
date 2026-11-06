export type RecordStatus = 'Active' | 'Pending' | 'Inactive';

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

import { AssetRecord, AssetLogRecord } from './types';

/**
 * Computes difference between an existing AssetRecord and updated fields.
 * Returns an AssetLogRecord without `id` and `timestamp` (to be filled by storage layer),
 * or `null` if none of the tracked fields changed.
 *
 * Tracked fields:
 * - location: 'ย้ายสถานที่' ('{old} ➔ {new}')
 * - responsiblePerson: 'เปลี่ยนผู้รับผิดชอบ' ('{old} ➔ {new}')
 * - status: 'เปลี่ยนสถานะ' ('{old} ➔ {new}')
 * - name: 'แก้ไขชื่อ'
 * - notes: 'แก้ไขหมายเหตุ'
 */
export function computeAssetDiff(
  oldRecord: AssetRecord,
  newRecord: Partial<AssetRecord>,
  recordedBy: string,
  notes?: string
): Omit<AssetLogRecord, 'id' | 'timestamp'> | null {
  const changes: string[] = [];

  const locationChanged =
    newRecord.location !== undefined && newRecord.location !== oldRecord.location;
  if (locationChanged) {
    changes.push('ย้ายสถานที่');
  }

  const responsibleChanged =
    newRecord.responsiblePerson !== undefined &&
    newRecord.responsiblePerson !== oldRecord.responsiblePerson;
  if (responsibleChanged) {
    changes.push('เปลี่ยนผู้รับผิดชอบ');
  }

  const statusChanged =
    newRecord.status !== undefined && newRecord.status !== oldRecord.status;
  if (statusChanged) {
    changes.push('เปลี่ยนสถานะ');
  }

  const assetCodeChanged =
    newRecord.assetCode !== undefined && newRecord.assetCode !== oldRecord.assetCode;
  if (assetCodeChanged) {
    changes.push('แก้ไขรหัสครุภัณฑ์');
  }

  const nameChanged =
    newRecord.name !== undefined && newRecord.name !== oldRecord.name;
  if (nameChanged) {
    changes.push('แก้ไขชื่อ');
  }

  const notesChanged =
    newRecord.notes !== undefined && newRecord.notes !== oldRecord.notes;
  if (notesChanged) {
    changes.push('แก้ไขหมายเหตุ');
  }

  if (changes.length === 0) {
    return null;
  }

  const locationChange = locationChanged
    ? `${oldRecord.location || '-'} ➔ ${newRecord.location || '-'}`
    : '-';
  const responsibleChange = responsibleChanged
    ? `${oldRecord.responsiblePerson || '-'} ➔ ${newRecord.responsiblePerson || '-'}`
    : '-';
  const statusChange = statusChanged
    ? `${oldRecord.status || '-'} ➔ ${newRecord.status || '-'}`
    : '-';

  const logNotes =
    notes !== undefined
      ? notes
      : notesChanged && newRecord.notes !== undefined
        ? newRecord.notes
        : '';

  return {
    action: 'แก้ไข/ย้ายตำแหน่ง',
    assetId: oldRecord.id,
    assetCode: newRecord.assetCode ?? oldRecord.assetCode,
    name: newRecord.name ?? oldRecord.name,
    locationChange,
    responsibleChange,
    statusChange,
    changeSummary: changes.join(', '),
    recordedBy,
    notes: logNotes,
  };
}

import { AssetRecord, AssetLogRecord, AssetTransaction, LogAction } from './types';

export function normalizeAssetCode(code: string | undefined | null): string {
  return code ? code.trim().toLowerCase() : '';
}

/**
 * Projects the latest state for each unique asset item from an append-only transaction ledger.
 * - Groups transactions by case-insensitive, whitespace-trimmed assetCode.
 * - Sorts chronologically by timestamp so the newest transaction reflects current state.
 * - Computes `createdAt` as first seen timestamp, `updatedAt` as newest timestamp, and `transactionCount`.
 * - Returns all projected items (including decommissioned ones) sorted by updatedAt descending.
 */
export function projectLatestAssets(transactions: AssetTransaction[]): AssetRecord[] {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return [];
  }

  const map = new Map<string, AssetTransaction>();
  const countMap = new Map<string, number>();
  const firstSeenMap = new Map<string, string>();
  const firstIdMap = new Map<string, string>();
  const latestImageMap = new Map<string, string>();

  // Process transactions chronologically to trace first created and count
  const sortedAsc = [...transactions].sort(
    (a, b) => (new Date(a.timestamp).getTime() || 0) - (new Date(b.timestamp).getTime() || 0)
  );

  for (const tx of sortedAsc) {
    const key = normalizeAssetCode(tx.assetCode);
    if (!key) continue;

    countMap.set(key, (countMap.get(key) || 0) + 1);
    if (!firstSeenMap.has(key)) {
      firstSeenMap.set(key, tx.timestamp);
      firstIdMap.set(key, tx.id);
    }
    if (tx.imageUrl && tx.imageUrl.trim().length > 0) {
      latestImageMap.set(key, tx.imageUrl.trim());
    }
    map.set(key, tx);
  }

  // Convert to AssetRecord with stable id (first seen id), createdAt (first seen) and updatedAt (latest timestamp)
  return Array.from(map.values())
    .map((latestTx) => {
      const key = normalizeAssetCode(latestTx.assetCode);
      const imageUrl = latestImageMap.get(key) || (latestTx.imageUrl?.trim() || undefined);
      return {
        ...latestTx,
        id: firstIdMap.get(key) || latestTx.id,
        imageUrl,
        createdAt: firstSeenMap.get(key) || latestTx.timestamp,
        updatedAt: latestTx.timestamp,
        transactionCount: countMap.get(key) || 1,
      };
    })
    .sort((a, b) => (new Date(b.updatedAt).getTime() || 0) - (new Date(a.updatedAt).getTime() || 0));
}

/**
 * Converts a list of raw AssetTransactions into chronological diffed AssetLogRecords.
 * Groups by assetCode, sorts chronologically, diffs adjacent entries, and returns
 * reverse chronological list (newest first) for UI timeline consumption.
 */
export function computeTransactionDiffs(transactions: AssetTransaction[]): AssetLogRecord[] {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return [];
  }

  // Group by normalized assetCode
  const groups = new Map<string, AssetTransaction[]>();
  for (const tx of transactions) {
    const key = normalizeAssetCode(tx.assetCode);
    if (!key) continue;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(tx);
  }

  const allLogs: AssetLogRecord[] = [];

  for (const [, group] of groups) {
    // Sort transactions chronologically ascending
    const sorted = [...group].sort(
      (a, b) => (new Date(a.timestamp).getTime() || 0) - (new Date(b.timestamp).getTime() || 0)
    );

    let prevTx: AssetTransaction | null = null;

    for (const tx of sorted) {
      if (!prevTx) {
        // Initial transaction
        allLogs.push({
          id: tx.id,
          timestamp: tx.timestamp,
          action: tx.action as LogAction,
          assetId: tx.id,
          assetCode: tx.assetCode,
          name: tx.name,
          locationChange: tx.location ? `- ➔ ${tx.location}` : '-',
          responsibleChange: tx.responsiblePerson ? `- ➔ ${tx.responsiblePerson}` : '-',
          statusChange: tx.status ? `- ➔ ${tx.status}` : '-',
          changeSummary:
            tx.action === 'บันทึกรายการใหม่'
              ? 'บันทึกครุภัณฑ์ใหม่เข้าสู่ระบบ'
              : tx.action === 'จำหน่าย/ตัดบัญชี'
                ? 'จำหน่าย/ตัดบัญชีออกจากระบบ'
                : 'บันทึกรายการ',
          recordedBy: tx.recordedBy || '',
          notes: tx.notes || '',
          imageUrl: tx.imageUrl || undefined,
        });
      } else {
        const changes: string[] = [];

        const locationChanged = tx.location !== prevTx.location;
        if (locationChanged) changes.push('ย้ายสถานที่');

        const responsibleChanged = tx.responsiblePerson !== prevTx.responsiblePerson;
        if (responsibleChanged) changes.push('เปลี่ยนผู้รับผิดชอบ');

        const statusChanged = tx.status !== prevTx.status;
        if (statusChanged) changes.push('เปลี่ยนสถานะ');

        const nameChanged = tx.name !== prevTx.name;
        if (nameChanged) changes.push('แก้ไขชื่อ');

        const notesChanged = tx.notes !== prevTx.notes;
        if (notesChanged) changes.push('แก้ไขหมายเหตุ');

        const imageChanged = Boolean(tx.imageUrl && tx.imageUrl !== prevTx.imageUrl);
        if (imageChanged) changes.push('อัปเดตรูปถ่าย');

        const isDecommission = tx.action === 'จำหน่าย/ตัดบัญชี';
        const summary = isDecommission
          ? 'ลบรายการครุภัณฑ์ออกจากระบบ'
          : changes.length > 0
            ? changes.join(', ')
            : 'แก้ไขข้อมูล';

        allLogs.push({
          id: tx.id,
          timestamp: tx.timestamp,
          action: tx.action as LogAction,
          assetId: tx.id,
          assetCode: tx.assetCode,
          name: tx.name,
          locationChange: isDecommission
            ? `${prevTx.location || '-'} ➔ -`
            : locationChanged
              ? `${prevTx.location || '-'} ➔ ${tx.location || '-'}`
              : '-',
          responsibleChange: isDecommission
            ? `${prevTx.responsiblePerson || '-'} ➔ -`
            : responsibleChanged
              ? `${prevTx.responsiblePerson || '-'} ➔ ${tx.responsiblePerson || '-'}`
              : '-',
          statusChange: statusChanged
            ? `${prevTx.status || '-'} ➔ ${tx.status || '-'}`
            : isDecommission
              ? `${prevTx.status || '-'} ➔ จำหน่าย/ตัดบัญชี`
              : '-',
          changeSummary: summary,
          recordedBy: tx.recordedBy || '',
          notes: tx.notes || '',
          imageUrl: tx.imageUrl || prevTx.imageUrl || undefined,
        });
      }

      prevTx = tx;
    }
  }

  // Return sorted by timestamp descending
  return allLogs.sort((a, b) => (new Date(b.timestamp).getTime() || 0) - (new Date(a.timestamp).getTime() || 0));
}

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

  const imageChanged =
    newRecord.imageUrl !== undefined &&
    newRecord.imageUrl !== (oldRecord.imageUrl || '');
  if (imageChanged) {
    changes.push('อัปเดตรูปถ่าย');
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
    imageUrl: newRecord.imageUrl || oldRecord.imageUrl || undefined,
  };
}

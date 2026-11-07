# Design Document: Append-Only Transaction Log Architecture for Asset Tracking

**Date:** 2026-11-07  
**Status:** Draft / Review  
**Target File:** `docs/superpowers/specs/2026-11-07-append-only-transaction-log-design.md`

---

## 1. Intent & Purpose

The user requires the Google Sheet to serve as an immutable, complete transaction ledger for all asset activity. Instead of performing in-place row overwrites or physical deletions when an asset is updated or moved:
1. **Append-Only Operations:** Every action (registering an asset, moving to a new location, changing custodians, updating status, or decommissioning) appends a new transaction row with a timestamp to the ledger.
2. **Latest State Projection:** The dashboard table aggregates transactions by `assetCode` (case-insensitive), projecting the most recent record (using `timestamp` as the indicator) to display current location, status, and custodian.
3. **Zero Collision Risk:** Multiple rows sharing the same `assetCode` represent that asset's history over time. Updating an asset simply writes its next state to the log, eliminating false collision errors.
4. **Permanent Audit Preservation:** No data is ever physically deleted. Deleting an asset writes a decommissioning transaction.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **100% Append-Only Persistence:** In both Google Sheets API and demo in-memory storage, all write operations (`createRecord`, `updateRecord`, `deleteRecord`) append a new transaction row.
- **Unified 10-Column Transaction Schema:**
  ```text
  Column A: ID (UUID)
  Column B: วันเวลาที่ทำรายการ (ISO Timestamp)
  Column C: การกระทำ (Action: 'บันทึกรายการใหม่' | 'แก้ไข/ย้ายตำแหน่ง' | 'จำหน่าย/ตัดบัญชี')
  Column D: รหัสครุภัณฑ์ (assetCode)
  Column E: ชื่อครุภัณฑ์ (name)
  Column F: ตำแหน่งที่ตั้ง (location)
  Column G: สถานะ (status)
  Column H: ผู้รับผิดชอบ (responsiblePerson)
  Column I: ผู้บันทึก (recordedBy)
  Column J: หมายเหตุ (notes)
  ```
- **Projection Engine:**
  - `projectLatestAssets(transactions)` groups all rows by `normalizeAssetCode(assetCode)`.
  - For each unique `assetCode`, picks the row with the newest `timestamp`.
  - Rows marked as deleted/decommissioned (`status === 'จำหน่าย/ตัดบัญชี'` or `action === 'จำหน่าย/ตัดบัญชี'`) are either marked with that status or filtered based on user preference, with status badge clearly showing `จำหน่าย/ตัดบัญชี`.
- **History Timeline from Ledger:**
  - `getLogs({ assetCode })` queries all transaction rows matching that code sorted by `timestamp` descending, providing a complete audit trail without requiring a secondary sheet.
- **Full Backward & Forward Compatibility:**
  - Frontend components (`RecordTable`, `RecordModal`, `LogHistoryModal`, `page.tsx`) continue to consume `AssetRecord` and `AssetLogRecord` structures seamlessly.

### Non-Goals
- Complex snapshotting or compaction (Google Sheets handles thousands of rows easily for organization assets).
- Cross-spreadsheet replication.

### Anti-Goals
- Never issue `deleteDimension` or in-place range overwrites to Google Sheets.
- Never lose past movements when updating an asset.

---

## 3. Data Flow & Architecture

```
[ User Action: Move / Update / Create ]
                    │
                    ▼
          [ Unified Record Modal ]
                    │
                    ▼
       [ POST / PUT / DELETE API ]
                    │
                    ▼
     [ sheetsService.appendTransaction ]
                    │
                    ▼
        [ Google Sheets / Demo ]
    (Appends new row at bottom of sheet)
                    │
                    ▼
    [ GET /api/records or Dashboard ]
                    │
                    ▼
         [ projectLatestAssets ]
   - Groups by assetCode (case-insensitive)
   - Picks newest row by timestamp
                    │
                    ▼
   [ Dashboard displays current state ]
```

---

## 4. Technical Specifications

### 4.1 Schema & Types (`src/lib/types.ts`)

```ts
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
}

export interface AssetRecord extends AssetTransaction {
  createdAt: string;
  updatedAt: string;
  transactionCount?: number;
}
```

### 4.2 Projection Engine (`src/lib/log-utils.ts` or `src/lib/filter-utils.ts`)

```ts
export function projectLatestAssets(transactions: AssetTransaction[]): AssetRecord[] {
  const map = new Map<string, AssetTransaction>();
  const countMap = new Map<string, number>();
  const firstSeenMap = new Map<string, string>();

  // Process transactions chronologically to trace first created and count
  const sortedAsc = [...transactions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (const tx of sortedAsc) {
    const key = normalizeAssetCode(tx.assetCode);
    if (!key) continue;

    countMap.set(key, (countMap.get(key) || 0) + 1);
    if (!firstSeenMap.has(key)) {
      firstSeenMap.set(key, tx.timestamp);
    }
    map.set(key, tx);
  }

  // Convert to AssetRecord with createdAt (first seen) and updatedAt (latest timestamp)
  return Array.from(map.values())
    .map((latestTx) => {
      const key = normalizeAssetCode(latestTx.assetCode);
      return {
        ...latestTx,
        createdAt: firstSeenMap.get(key) || latestTx.timestamp,
        updatedAt: latestTx.timestamp,
        transactionCount: countMap.get(key) || 1,
      };
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}
```

### 4.3 Service Layer (`src/lib/sheets.ts`)

1. **Header Row:**
   `['ID', 'วันเวลาที่ทำรายการ', 'การกระทำ', 'รหัสครุภัณฑ์', 'ชื่อครุภัณฑ์', 'ตำแหน่งที่ตั้ง', 'สถานะ', 'ผู้รับผิดชอบ', 'ผู้บันทึก', 'หมายเหตุ']`
2. **`createRecord(data)`:**
   - Appends a transaction with `action: 'บันทึกรายการใหม่'`, `timestamp: now`.
3. **`updateRecord(idOrCode, data)`:**
   - Resolves existing record by `id` or `assetCode` to inherit immutable fields (like `name` if not supplied).
   - Appends a transaction with `action: 'แก้ไข/ย้ายตำแหน่ง'`, `timestamp: now`.
4. **`deleteRecord(idOrCode, recordedBy?, notes?)`:**
   - Appends a transaction with `action: 'จำหน่าย/ตัดบัญชี'`, `status: 'จำหน่าย/ตัดบัญชี'`, `timestamp: now`.
5. **`getRecords()`:**
   - Reads all transaction rows, executes `projectLatestAssets()`, returns active/latest records.
6. **`getLogs(filter)`:**
   - Converts transaction rows for the matching `assetCode` into `AssetLogRecord` format for the timeline view, calculating diffs against the previous chronological transaction.

---

## 5. What's Left to the Builder

- Exact label on the soft delete confirmation dialog ("ยืนยันการจำหน่าย/ตัดบัญชีครุภัณฑ์").
- Transition handling for existing sheets (self-healing header row on first load).

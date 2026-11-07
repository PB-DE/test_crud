# Append-Only Transaction Log Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the asset tracking system into an immutable, 100% append-only transaction ledger in Google Sheets where every create, location change, status update, and decommissioning appends a timestamped transaction, and the dashboard projects the latest state of each unique asset item.

**Architecture:** The Google Sheet acts as an event ledger with a single 10-column transaction format (`ID | Timestamp | Action | AssetCode | Name | Location | Status | Responsible | RecordedBy | Notes`). Write operations (`createRecord`, `updateRecord`, `deleteRecord`) only append rows. `projectLatestAssets()` aggregates transactions by `assetCode` (case-insensitive) and selects the newest row by `timestamp` for the dashboard table. History timeline is derived directly from chronological transactions.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Google Sheets API v4 (JWT), Vitest.

**Spec:** `docs/superpowers/specs/2026-11-07-append-only-transaction-log-design.md`

## Global Constraints

- Never issue `deleteDimension` or in-place row overwrites to Google Sheets. All writes must be append-only.
- Single 10-column transaction schema:
  `['ID', 'วันเวลาที่ทำรายการ', 'การกระทำ', 'รหัสครุภัณฑ์', 'ชื่อครุภัณฑ์', 'ตำแหน่งที่ตั้ง', 'สถานะ', 'ผู้รับผิดชอบ', 'ผู้บันทึก', 'หมายเหตุ']`.
- Projection: `assetCode` grouping must be case-insensitive and whitespace-trimmed (`normalizeAssetCode`).
- Latest state indicator: `timestamp` (ISO 8601) determines the latest state.
- Decommissioning: Deleting an asset appends a transaction with `action: 'จำหน่าย/ตัดบัญชี'` and `status: 'จำหน่าย/ตัดบัญชี'`.
- Localization: All UI headers, action labels, badges, and dialogs in Thai.

## Review Focus

1. **Out-of-order timestamps in ledger:** If transactions are inserted with slight clock skew, `projectLatestAssets` must sort chronologically by `timestamp` before projecting to guarantee the latest state is selected.
2. **Multiple updates to the same asset:** If an asset is updated 10 times, the dashboard must project exactly 1 row with `transactionCount: 10`, `createdAt` as first seen, and `updatedAt` as newest timestamp.
3. **Decommissioned asset visibility:** When an asset is marked `จำหน่าย/ตัดบัญชี`, it must appear with the red badge under "ทั้งหมด" and "จำหน่าย/ตัดบัญชี" tabs on the dashboard, but not under "พร้อมใช้งาน".
4. **Soft delete without deletion:** `DELETE /api/records/[id]` must append a decommissioning transaction row rather than deleting rows from Google Sheets.
5. **Timeline diff computation:** `getLogs({ assetCode })` must compute field diffs (`old ➔ new`) by comparing adjacent chronological transactions for that `assetCode`.

---

### Task 1: Transaction Types & Projection Engine (`projectLatestAssets`)

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/log-utils.ts`
- Test: `tests/log-utils.test.ts`

**Interfaces:**
- Produces:
  - `TransactionAction = 'บันทึกรายการใหม่' | 'แก้ไข/ย้ายตำแหน่ง' | 'จำหน่าย/ตัดบัญชี'`
  - `interface AssetTransaction`: `{ id, timestamp, action, assetCode, name, location, status, responsiblePerson, recordedBy, notes }`
  - `projectLatestAssets(transactions: AssetTransaction[]): AssetRecord[]`
  - `computeTransactionDiffs(transactions: AssetTransaction[]): AssetLogRecord[]`

- [ ] **Step 1: Write failing tests in `tests/log-utils.test.ts`**

```ts
import { projectLatestAssets, computeTransactionDiffs } from '@/lib/log-utils';
import { AssetTransaction } from '@/lib/types';

describe('projectLatestAssets', () => {
  it('projects single latest state for an asset with multiple transactions', () => {
    const txs: AssetTransaction[] = [
      {
        id: '1',
        timestamp: '2026-01-01T10:00:00Z',
        action: 'บันทึกรายการใหม่',
        assetCode: 'EQ-01',
        name: 'Laptop Dell',
        location: 'Room 101',
        status: 'พร้อมใช้งาน',
        responsiblePerson: 'Alice',
        recordedBy: 'Admin',
        notes: '',
      },
      {
        id: '2',
        timestamp: '2026-01-02T10:00:00Z',
        action: 'แก้ไข/ย้ายตำแหน่ง',
        assetCode: '  eq-01  ',
        name: 'Laptop Dell',
        location: 'Room 202',
        status: 'กำลังใช้งาน',
        responsiblePerson: 'Bob',
        recordedBy: 'Admin',
        notes: 'Moved',
      },
    ];

    const projected = projectLatestAssets(txs);
    expect(projected.length).toBe(1);
    expect(projected[0].location).toBe('Room 202');
    expect(projected[0].status).toBe('กำลังใช้งาน');
    expect(projected[0].responsiblePerson).toBe('Bob');
    expect(projected[0].createdAt).toBe('2026-01-01T10:00:00Z');
    expect(projected[0].updatedAt).toBe('2026-01-02T10:00:00Z');
    expect(projected[0].transactionCount).toBe(2);
  });

  it('handles empty or malformed transaction lists gracefully', () => {
    expect(projectLatestAssets([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/log-utils.test.ts`
Expected: FAIL with `projectLatestAssets is not defined`.

- [ ] **Step 3: Implement `projectLatestAssets` and update types**

- In `src/lib/types.ts`: Define `TransactionAction`, `AssetTransaction`, and extend `AssetRecord` with `transactionCount?: number`.
- In `src/lib/log-utils.ts`:
  - Implement `projectLatestAssets(transactions: AssetTransaction[]): AssetRecord[]`.
  - Implement `computeTransactionDiffs(transactions: AssetTransaction[]): AssetLogRecord[]` for generating chronological timeline diffs.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/log-utils.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/log-utils.ts tests/log-utils.test.ts
git commit -m "feat: define transaction types and latest asset projection engine"
```

---

### Task 2: Append-Only Google Sheets Service Layer (`src/lib/sheets.ts`)

**Files:**
- Modify: `src/lib/sheets.ts`
- Test: `tests/sheets.test.ts`

**Interfaces:**
- Consumes:
  - `AssetTransaction`, `AssetRecord`, `AssetInput`
  - `projectLatestAssets`
- Produces:
  - `sheetsService.getTransactions(): Promise<AssetTransaction[]>`
  - `sheetsService.getRecords(): Promise<AssetRecord[]>`: Returns `projectLatestAssets(transactions)`
  - `sheetsService.getRecordById(id: string): Promise<AssetRecord | null>`
  - `sheetsService.getRecordByAssetCode(code: string): Promise<AssetRecord | null>`
  - `sheetsService.createRecord(data: AssetInput): Promise<AssetRecord>`
  - `sheetsService.updateRecord(idOrCode: string, data: Partial<AssetInput>): Promise<AssetRecord | null>`
  - `sheetsService.deleteRecord(idOrCode: string, recordedBy?: string, notes?: string): Promise<boolean>`
  - `sheetsService.getLogs(filter?: { assetCode?: string }): Promise<AssetLogRecord[]>`

- [ ] **Step 1: Write failing tests in `tests/sheets.test.ts`**

```ts
it('createRecord, updateRecord, and deleteRecord append transactions without modifying existing rows', async () => {
  sheetsService.resetDemoStore();

  const created = await sheetsService.createRecord({
    assetCode: 'EQ-APPEND-01',
    name: 'Camera Sony',
    location: 'Studio A',
    status: 'พร้อมใช้งาน',
    responsiblePerson: 'Photographer',
    recordedBy: 'Admin',
  });

  const updated = await sheetsService.updateRecord(created.assetCode, {
    location: 'Studio B',
    recordedBy: 'Admin',
  });

  const deleted = await sheetsService.deleteRecord(created.assetCode, 'Admin', 'Decommissioned');

  expect(deleted).toBe(true);

  // All transactions are preserved in the ledger
  const txs = await sheetsService.getTransactions();
  const matching = txs.filter(t => t.assetCode === 'EQ-APPEND-01');
  expect(matching.length).toBe(3);
  expect(matching[0].action).toBe('บันทึกรายการใหม่');
  expect(matching[1].action).toBe('แก้ไข/ย้ายตำแหน่ง');
  expect(matching[2].action).toBe('จำหน่าย/ตัดบัญชี');

  // getRecords projects latest state
  const records = await sheetsService.getRecords();
  const current = records.find(r => r.assetCode === 'EQ-APPEND-01');
  expect(current?.location).toBe('Studio B');
  expect(current?.status).toBe('จำหน่าย/ตัดบัญชี');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/sheets.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement append-only service methods in `src/lib/sheets.ts`**

- Update `HEADER_ROW` to 10-column transaction format:
  `['ID', 'วันเวลาที่ทำรายการ', 'การกระทำ', 'รหัสครุภัณฑ์', 'ชื่อครุภัณฑ์', 'ตำแหน่งที่ตั้ง', 'สถานะ', 'ผู้รับผิดชอบ', 'ผู้บันทึก', 'หมายเหตุ']`.
- Convert `demoStore` into `demoTransactions: AssetTransaction[]`.
- `getTransactions()`: Reads sheet `A:J`, maps rows to `AssetTransaction`.
- `getRecords()`: Returns `projectLatestAssets(await getTransactions())`.
- `createRecord(data)`: Checks if code exists. If exists, appends transaction with `action: 'แก้ไข/ย้ายตำแหน่ง'`; if new, appends with `action: 'บันทึกรายการใหม่'`.
- `updateRecord(idOrCode, data)`: Finds previous transaction for this assetCode, inherits missing fields, appends transaction with `action: 'แก้ไข/ย้ายตำแหน่ง'`, `timestamp: new Date().toISOString()`.
- `deleteRecord(idOrCode, recordedBy?, notes?)`: Appends transaction with `action: 'จำหน่าย/ตัดบัญชี'`, `status: 'จำหน่าย/ตัดบัญชี'`, `timestamp: new Date().toISOString()`.
- Remove all `deleteDimension` calls and in-place row overwrite calls.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/sheets.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/sheets.ts tests/sheets.test.ts
git commit -m "feat: implement append-only transaction ledger in Google Sheets service layer"
```

---

### Task 3: REST API Endpoints Update (`/api/records`, `/api/records/[id]`, `/api/logs`)

**Files:**
- Modify: `src/app/api/records/route.ts`
- Modify: `src/app/api/records/[id]/route.ts`
- Modify: `src/app/api/logs/route.ts`
- Test: `tests/api.test.ts`

**Interfaces:**
- `GET /api/records`: Returns `{ success: true, data: AssetRecord[] }`
- `POST /api/records`: Body `{ assetCode, name, location, status, responsiblePerson, recordedBy, notes }`, returns `{ success: true, data: AssetRecord }`
- `PUT /api/records/[id]`: Body `{ location?, status?, responsiblePerson?, recordedBy?, notes? }`, returns `{ success: true, data: AssetRecord }`
- `DELETE /api/records/[id]`: Query or body with optional `{ recordedBy, notes }`, returns `{ success: true, message: 'Decommissioned' }`
- `GET /api/logs?assetCode=...`: Returns `{ success: true, data: AssetLogRecord[] }`

- [ ] **Step 1: Write failing tests in `tests/api.test.ts`**

Update API tests to verify that:
- `POST /api/records` with existing `assetCode` appends an update transaction and returns 201 with updated state.
- `DELETE /api/records/[id]` returns 200 and marks item decommissioned.
- `GET /api/logs?assetCode=...` returns the full timeline.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/api.test.ts`
Expected: FAIL.

- [ ] **Step 3: Update API routes**

- In `src/app/api/records/[id]/route.ts`:
  - `DELETE`: Call `sheetsService.deleteRecord(id, recordedBy, notes)`.
  - `PUT`: Call `sheetsService.updateRecord(id, updateData)`.
- In `src/app/api/records/route.ts`:
  - `POST`: Call `sheetsService.createRecord(input)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/records/route.ts src/app/api/records/[id]/route.ts src/app/api/logs/route.ts tests/api.test.ts
git commit -m "feat: update REST API routes for append-only transaction ledger"
```

---

### Task 4: UI Integration & Verification (`page.tsx`, `DeleteDialog.tsx`, `RecordTable.tsx`)

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/DeleteDialog.tsx`
- Modify: `src/components/RecordTable.tsx`
- Test: `tests/ui-helpers.test.ts`

**Interfaces:**
- `DeleteDialog`: Localized confirmation "ยืนยันการจำหน่าย/ตัดบัญชีครุภัณฑ์"
- `page.tsx`:
  - `handleDeleteConfirm`: Sends `DELETE /api/records/${id}`, updates local state by setting status to `'จำหน่าย/ตัดบัญชี'` or refetches latest records.
  - Table displays latest location and timestamp indicator.

- [ ] **Step 1: Write failing test in `tests/ui-helpers.test.ts`**

Verify that status filters, sorting by `updatedAt` / `timestamp`, and reconciliation behave as expected.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/ui-helpers.test.ts`

- [ ] **Step 3: Update UI components**

- In `src/components/DeleteDialog.tsx`:
  - Update dialog title to "จำหน่าย/ตัดบัญชีครุภัณฑ์" (Decommission asset).
  - Update description to clarify that the record will be marked as decommissioned in the transaction ledger and preserved in audit history.
- In `src/app/page.tsx`:
  - Update `handleDeleteConfirm` to update record status to `'จำหน่าย/ตัดบัญชี'` in state.
  - Show toast: "จำหน่าย/ตัดบัญชีครุภัณฑ์สำเร็จ (บันทึกลง Ledger เรียบร้อย)".

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/DeleteDialog.tsx src/app/page.tsx src/components/RecordTable.tsx tests/ui-helpers.test.ts
git commit -m "feat: update UI for append-only transaction ledger and soft decommissioning"
```

---

### Task 5: End-to-End Verification, Documentation & Production Build

**Files:**
- Modify: `README.md`
- Run: Full test suite (`npm test`)
- Run: Production build (`npm run build`)

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All test suites pass.

- [ ] **Step 2: Run Next.js production build**

Run: `npm run build`
Expected: Build succeeds with 0 errors.

- [ ] **Step 3: Update `README.md`**

- Document the Append-Only Transaction Log architecture.
- Document how `timestamp` serves as the latest state indicator.
- Document soft-decommissioning and projection logic.

- [ ] **Step 4: Commit and push**

```bash
git add README.md
git commit -m "docs: update README with Append-Only Transaction Log architecture and state projection"
git push origin feat/asset-tracking-crud
```

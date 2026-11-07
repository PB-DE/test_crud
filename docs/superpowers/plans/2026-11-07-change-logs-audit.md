# Asset Change Logs & Google Sheet Audit Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement automated change logging (Audit Trail Database) in Google Sheets for the Asset Tracking CRUD application, capturing location moves, status changes, and custodian transfers in a dedicated `Logs` tab, with a frontend History Timeline viewer.

**Architecture:** Next.js 15 (App Router, TypeScript) communicating with a multi-tab Google Spreadsheet. The primary tab (`Assets`) stores the latest state of each equipment item, while the audit tab (`Logs`) appends an immutable chronological record of every create, update (with "Old ➔ New" diffs), and delete operation. Includes in-memory demo fallback and an accessible interactive timeline modal in the UI.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Lucide React, Google APIs Client (`googleapis`), Vitest.

**Spec:** User requirement: "จะต้องมีปุ่มบันทึกรายการใหม่และปุ่มแก้ไขรายการเดิม โดยต้องมีการเก็บ log ไว้ใน sheet เพื่อเป็น db เน้นการเปลี่ยนแปลง (ตำแหน่งเดิม ➔ ใหม่, ผู้รับผิดชอบเดิม ➔ ใหม่, สถานะเดิม ➔ ใหม่, ผู้บันทึก, วันเวลา)".

## Global Constraints

- **Language & Runtime:** TypeScript (strict mode enabled), Node.js >= 18.
- **Data Integrity:** Primary asset table (`Assets`) maintains unique UUID in Column A (`A:J`); audit log table (`Logs`) appends to range `Logs!A:K`.
- **Automatic Sheet Provisioning:** If the Google Spreadsheet lacks a `Logs` tab, `sheetsService` must automatically create the `Logs` sheet tab and insert the header row without user intervention.
- **Change Diffing:** On update, detect exactly which fields changed (`location`, `responsiblePerson`, `status`, `notes`) and record descriptive summaries (e.g., `ห้อง 201 ➔ ห้อง 305`).
- **Zero Regression:** All existing tests (76 passing) must continue to pass, alongside new tests for logging.

## Review Focus

1. **Automatic Tab Creation & Safety:** Calling `sheets.spreadsheets.batchUpdate` with `addSheet` must handle existing tabs gracefully without throwing 400 "sheet already exists".
2. **Accurate Diff Computation:** If an update only modifies `notes` without changing `location`, `locationChange` must indicate no change or remain blank rather than generating false `X ➔ X` diff strings.
3. **Log Append Resilience:** If logging fails due to transient network or Google Sheets quota, `sheetsService` must log the error server-side while ensuring the core asset write does not orphan uncommitted state.
4. **Filtering History by Asset:** `GET /api/logs?assetId=...` and `GET /api/logs?assetCode=...` must filter logs cleanly for asset-specific timeline views.
5. **UI Accessibility & Responsiveness:** The Log History Modal must be keyboard accessible (`Escape` listener, trap focus) and format dates clearly in local Thai locale.

---

### Task 1: Log Types & Change Detection Helpers

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/lib/log-utils.ts`
- Test: `tests/log-utils.test.ts`

**Interfaces:**
- Produces:
  ```typescript
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
  export function computeAssetDiff(
    oldRecord: AssetRecord,
    newRecord: Partial<AssetRecord>,
    recordedBy: string,
    notes?: string
  ): Omit<AssetLogRecord, 'id' | 'timestamp'> | null;
  ```

- [ ] **Step 1: Write failing tests for change diff computation**

```typescript
// tests/log-utils.test.ts
import { describe, it, expect } from 'vitest';
import { computeAssetDiff } from '../src/lib/log-utils';
import { AssetRecord } from '../src/lib/types';

describe('computeAssetDiff', () => {
  const base: AssetRecord = {
    id: 'rec-1',
    assetCode: 'EQ-001',
    name: 'Dell PC',
    location: 'ห้อง 201',
    status: 'พร้อมใช้งาน',
    responsiblePerson: 'สมชาย',
    recordedBy: 'จนท. A',
    notes: 'เครื่องใหม่',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('detects location and custodian changes', () => {
    const diff = computeAssetDiff(base, { location: 'ห้อง 305', responsiblePerson: 'สมหญิง' }, 'จนท. B', 'ย้ายโต๊ะ');
    expect(diff).not.toBeNull();
    expect(diff?.action).toBe('แก้ไข/ย้ายตำแหน่ง');
    expect(diff?.locationChange).toBe('ห้อง 201 ➔ ห้อง 305');
    expect(diff?.responsibleChange).toBe('สมชาย ➔ สมหญิง');
    expect(diff?.statusChange).toBe('-');
    expect(diff?.changeSummary).toContain('ย้ายสถานที่');
    expect(diff?.changeSummary).toContain('เปลี่ยนผู้รับผิดชอบ');
    expect(diff?.recordedBy).toBe('จนท. B');
  });

  it('returns null when no fields changed', () => {
    const diff = computeAssetDiff(base, { location: 'ห้อง 201' }, 'จนท. A');
    expect(diff).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/log-utils.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `src/lib/types.ts` & `src/lib/log-utils.ts`**

Define `AssetLogRecord`, `LogAction`, and implement `computeAssetDiff` handling location, responsiblePerson, status, and notes differences.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/log-utils.test.ts`
Expected: PASS

- [ ] **Step 5: Commit log types and utils**

```bash
git add src/lib/types.ts src/lib/log-utils.ts tests/log-utils.test.ts
git commit -m "feat: implement asset change log types and diff computation"
```

---

### Task 2: Google Sheets Service Layer Dual-Sheet Integration

**Files:**
- Modify: `src/lib/sheets.ts`
- Modify: `tests/sheets.test.ts`

**Interfaces:**
- Produces:
  - `LOG_HEADER_ROW = ['Log ID', 'วันเวลาที่ทำรายการ', 'การกระทำ', 'รหัสครุภัณฑ์', 'ชื่อครุภัณฑ์', 'ตำแหน่ง (เดิม ➔ ใหม่)', 'ผู้รับผิดชอบ (เดิม ➔ ใหม่)', 'สถานะ (เดิม ➔ ใหม่)', 'สรุปสิ่งที่เปลี่ยนแปลง', 'ผู้บันทึก', 'หมายเหตุ']`
  - `sheetsService.getLogs(filter?: { assetId?: string; assetCode?: string }): Promise<AssetLogRecord[]>`
  - `sheetsService.appendLog(log: AssetLogRecord): Promise<void>`
  - Automatic `ensureLogsSheet(sheets, spreadsheetId)` creating `Logs` tab if not present.
  - Automatic logging inside `createRecord`, `updateRecord`, and `deleteRecord`.

- [ ] **Step 1: Write failing tests in `tests/sheets.test.ts` for log retrieval and automatic logging**

Assert that calling `createRecord` adds a log entry in `getLogs()`, and `updateRecord` appends a diff entry.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/sheets.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement Google Sheets dual-sheet integration in `src/lib/sheets.ts`**

1. Implement `ensureLogsSheet` (checks spreadsheet metadata sheets array, issues `addSheet` if `Logs` tab is missing, writes `LOG_HEADER_ROW` to `Logs!A1:K1`).
2. Add in-memory `demoLogsStore` for demo mode.
3. Hook `createRecord` to append log (`บันทึกรายการใหม่`).
4. Hook `updateRecord` to compute diff and append log (`แก้ไข/ย้ายตำแหน่ง`).
5. Hook `deleteRecord` to append log (`ลบรายการ`).
6. Implement `getLogs(filter)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/sheets.test.ts`
Expected: PASS

- [ ] **Step 5: Commit service layer dual-sheet logging**

```bash
git add src/lib/sheets.ts tests/sheets.test.ts
git commit -m "feat: add Google Sheets dual-sheet audit logging in service layer"
```

---

### Task 3: REST API Endpoint for Audit Logs (`/api/logs`)

**Files:**
- Create: `src/app/api/logs/route.ts`
- Modify: `tests/api.test.ts`

**Interfaces:**
- Produces:
  - `GET /api/logs`: returns `{ success: true, data: AssetLogRecord[] }`
  - `GET /api/logs?assetId=...`: filters logs for specific asset
  - `GET /api/logs?assetCode=...`: filters logs by asset code

- [ ] **Step 1: Write failing integration tests for `/api/logs` in `tests/api.test.ts`**

Assert `GET /api/logs` returns 200 with log entries, and asset filtering returns only matching records.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `src/app/api/logs/route.ts`**

Implement route handler parsing query parameters and returning JSON response.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit logs API route**

```bash
git add src/app/api/logs/ tests/api.test.ts
git commit -m "feat: implement REST API endpoint for asset change logs"
```

---

### Task 4: Frontend UI for Change Logs Timeline

**Files:**
- Create: `src/components/LogHistoryModal.tsx`
- Modify: `src/components/RecordTable.tsx`
- Modify: `src/app/page.tsx`
- Modify: `tests/ui-helpers.test.ts`

**Interfaces:**
- Produces:
  - `LogHistoryModal`: accessible modal displaying a chronological timeline with visual badges, location diffs, and custodian transfers.
  - History action button (`History` / `Clock` icon) on each row in `RecordTable`.
  - Top header button in `page.tsx`: "ดูประวัติทั้งหมด (All Logs)".

- [ ] **Step 1: Write failing tests for log formatting helpers**

Test helper for badge styling and diff formatting.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui-helpers.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `LogHistoryModal` and connect to `RecordTable` & `page.tsx`**

1. Build `LogHistoryModal.tsx` with clean timeline layout, search filter, and close button.
2. Add History icon button to `RecordTable.tsx` actions column.
3. Integrate in `page.tsx`: fetch logs on click, manage modal state, and show toast notifications if logs fetch fails.

- [ ] **Step 4: Run tests and verify clean build**

Run:
```bash
npm test
npm run build
```
Expected: PASS

- [ ] **Step 5: Commit UI timeline components**

```bash
git add src/components/LogHistoryModal.tsx src/components/RecordTable.tsx src/app/page.tsx tests/ui-helpers.test.ts
git commit -m "feat: add interactive Change Log History timeline modal in UI"
```

---

### Task 5: Full Verification, Documentation & Remote Push

**Files:**
- Modify: `README.md`
- Modify: `docs/GOOGLE_SHEETS_SETUP.md`
- Verify: Full test suite (`npm test`) and production build (`npm run build`)
- Git push: push to GitHub to trigger Vercel deployment.

- [ ] **Step 1: Update documentation with `Logs` sheet schema and API specs**
- [ ] **Step 2: Run complete test suite and production build**

Run:
```bash
npm test
npm run build
```
Expected: All tests pass, Next.js build succeeds with 0 errors.

- [ ] **Step 3: Commit and push to GitHub**

```bash
git add README.md docs/
git commit -m "docs: add Google Sheets change logs documentation"
git push origin feat/asset-tracking-crud
```


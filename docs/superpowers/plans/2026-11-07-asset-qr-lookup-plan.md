# Unified Asset Tracking with QR Scanning, Lookup & Uniqueness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a unified organization asset registration and update flow featuring QR code scanning via mobile camera, instant asset lookup with auto-fill, change history preview, and strict `assetCode` uniqueness with audit logging in Google Sheets.

**Architecture:** A single "+ บันทึกหรือเปลี่ยนแปลงครุภัณฑ์" modal connects client-side reactive lookup with the existing records cache. QR scanning uses `html5-qrcode` to decode raw asset codes directly from camera streams. Submitting an existing `assetCode` executes an update with field diff logging, while new codes append new rows, enforced both client-side and server-side across Google Sheets API and in-memory demo fallbacks.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, `html5-qrcode`, Lucide React, Google Sheets API v4 (JWT), Vitest.

**Spec:** `docs/superpowers/specs/2026-11-07-asset-qr-lookup-design.md`

## Global Constraints

- Never allow duplicate rows with the same `assetCode` (case-insensitive trimmed comparison) in `Assets` sheet.
- Primary action button text must be "+ บันทึกหรือเปลี่ยนแปลงครุภัณฑ์".
- QR code payload format is direct raw alphanumeric code (e.g. `EQ-2024-001`), trimmed on scan.
- QR scanner must use `facingMode: "environment"` by default with fallback to available cameras.
- Existing assets must preserve immutable `name` and pre-fill `status` and `responsiblePerson` to avoid unintended status resets.
- Multi-sheet architecture: Maintain 10 columns for `Assets!A:J` and 11 columns for `Logs!A:K`.
- Localization: All UI headers, badges, dialogs, and toast messages in Thai.

## Review Focus

1. **Case-insensitive whitespace-padded asset code:** `"  eq-2024-001  "` must match `"EQ-2024-001"` and update the existing asset rather than creating a duplicate row.
2. **PUT Collision Protection:** Changing an asset's code to an `assetCode` owned by another row must be rejected with HTTP 409 Conflict.
3. **Camera Permission Handling:** When camera access is blocked or unavailable, `QrScannerModal` must display a helpful Thai message and close cleanly without crashing.
4. **Pre-fill Lifecycle on Lookup:** Matching an existing asset must retain its current `status` and `responsiblePerson` while leaving `location` editable for the destination room.
5. **UI State Reconciliation:** Updating an existing record via the unified modal must update the row in-place in the client table without appending a duplicate row.

---

### Task 1: Backend Asset Uniqueness & Collision Protection in Sheets Service & API

**Files:**
- Modify: `src/lib/sheets.ts`
- Modify: `src/app/api/records/route.ts`
- Modify: `src/app/api/records/[id]/route.ts`
- Test: `tests/sheets.test.ts`
- Test: `tests/api.test.ts`

**Interfaces:**
- Consumes: `AssetRecord`, `AssetInput` from `src/lib/types.ts`
- Produces:
  - `sheetsService.createRecord(data)`: Checks existing `assetCode`. If match found, calls `updateRecord(existing.id, data)` and returns updated record.
  - `sheetsService.updateRecord(id, data)`: If `data.assetCode` collides with a different record's `assetCode`, throws `CollisionError` (or `Error('COLLISION: ...')`).
  - `POST /api/records`: Returns 200/201 with created or updated record.
  - `PUT /api/records/[id]`: Returns 409 Conflict if `assetCode` collision occurs.

- [ ] **Step 1: Write failing tests in `tests/sheets.test.ts` and `tests/api.test.ts`**

```ts
// in tests/sheets.test.ts
it('createRecord updates existing record when assetCode matches case-insensitively', async () => {
  const existing = await sheetsService.createRecord({
    assetCode: 'EQ-UNIQUE-01',
    name: 'Original Laptop',
    location: 'Room 101',
    status: 'พร้อมใช้งาน',
    responsiblePerson: 'User A',
    recordedBy: 'Admin',
    notes: 'Initial',
  });

  const updated = await sheetsService.createRecord({
    assetCode: '  eq-unique-01  ',
    name: 'Original Laptop',
    location: 'Room 202',
    status: 'กำลังใช้งาน',
    responsiblePerson: 'User B',
    recordedBy: 'Admin',
    notes: 'Moved',
  });

  expect(updated.id).toBe(existing.id);
  expect(updated.location).toBe('Room 202');
  expect(updated.responsiblePerson).toBe('User B');
});

it('updateRecord throws error if assetCode collides with another record', async () => {
  const item1 = await sheetsService.createRecord({
    assetCode: 'EQ-ALPHA',
    name: 'Alpha',
    location: 'A',
    status: 'พร้อมใช้งาน',
    responsiblePerson: 'User A',
    recordedBy: 'Admin',
  });
  const item2 = await sheetsService.createRecord({
    assetCode: 'EQ-BETA',
    name: 'Beta',
    location: 'B',
    status: 'พร้อมใช้งาน',
    responsiblePerson: 'User B',
    recordedBy: 'Admin',
  });

  await expect(
    sheetsService.updateRecord(item2.id, { assetCode: 'EQ-ALPHA' })
  ).rejects.toThrow(/already exists/i);
});
```

```ts
// in tests/api.test.ts
it('PUT /api/records/[id] returns 409 Conflict on assetCode collision', async () => {
  // test colliding assetCode returns status 409
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL due to lack of collision checks and duplicate prevention.

- [ ] **Step 3: Implement collision checks and upsert logic in `sheets.ts` and API routes**

- In `src/lib/sheets.ts`:
  - In `createRecord(data)`: Check `normalizeCode(data.assetCode)`. If found in `getRecords()`, delegate to `updateRecord(found.id, data)`.
  - In `updateRecord(id, data)`: If `data.assetCode` provided, verify no other record with `record.id !== id` matches `normalizeCode(data.assetCode)`. Throw Error with `code: 'COLLISION'`.
- In `src/app/api/records/[id]/route.ts`:
  - Catch collision error and return `NextResponse.json({ error: 'Asset code already exists on another item' }, { status: 409 })`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/sheets.ts src/app/api/records/route.ts src/app/api/records/[id]/route.ts tests/sheets.test.ts tests/api.test.ts
git commit -m "feat: enforce assetCode uniqueness on create and collision protection on update"
```

---

### Task 2: Autocomplete Dropdown, Lookup & State Lifecycle in RecordModal

**Files:**
- Modify: `src/components/RecordModal.tsx`
- Modify: `tests/ui-helpers.test.ts`

**Interfaces:**
- Consumes:
  - `records: AssetRecord[]`
  - `onViewHistory?: (assetCode: string) => void`
  - `record?: AssetRecord | null`
  - `isOpen: boolean`
  - `onClose: () => void`
  - `onSave: (data: AssetInput, id?: string) => Promise<void>`
- Produces:
  - Lookup helper: `findAssetByCode(code: string, records: AssetRecord[]): AssetRecord | null`
  - Dynamic UI displaying green badge, previous location/custodian, and history button when code matches.
  - `<datalist id="asset-code-options">` rendering available `<option value={r.assetCode}>{r.name}</option>`.

- [ ] **Step 1: Write failing test in `tests/ui-helpers.test.ts`**

```ts
describe('findAssetByCode lookup helper', () => {
  const records = [
    { id: '1', assetCode: 'EQ-001', name: 'Server Dell', location: 'Room 101', status: 'พร้อมใช้งาน', responsiblePerson: 'Alice', recordedBy: 'Admin', createdAt: '', updatedAt: '' },
    { id: '2', assetCode: 'EQ-002', name: 'Switch Cisco', location: 'Room 202', status: 'กำลังใช้งาน', responsiblePerson: 'Bob', recordedBy: 'Admin', createdAt: '', updatedAt: '' },
  ];

  it('finds existing asset ignoring case and whitespace', () => {
    expect(findAssetByCode('  eq-001 ', records)?.name).toBe('Server Dell');
  });

  it('returns null when asset code not found', () => {
    expect(findAssetByCode('EQ-999', records)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL with `findAssetByCode is not defined`.

- [ ] **Step 3: Implement lookup helper and `RecordModal` state lifecycle**

- Export `findAssetByCode` helper (in `src/lib/ui-helpers.ts` or `src/lib/log-utils.ts`).
- In `RecordModal.tsx`:
  - Accept `records?: AssetRecord[]` and `onViewHistory?: (code: string) => void`.
  - Add datalist to `assetCode` input with `<datalist id="asset-codes-list">`.
  - When `assetCode` input changes:
    - Look up `existing = findAssetByCode(formData.assetCode, records)`.
    - If found:
      - Set `formData.name = existing.name`.
      - Pre-fill `formData.status = existing.status` and `formData.responsiblePerson = existing.responsiblePerson` (if not dirty).
      - Render green banner with `✓ พบครุภัณฑ์เดิมในระบบ`, previous location `existing.location`, and button `📜 ดูประวัติการเปลี่ยนแปลง` calling `onViewHistory(existing.assetCode)`.
    - If not found:
      - Render orange banner `✦ รหัสนี้ยังไม่มีในระบบ (ลงทะเบียนใหม่)`.
      - Enable `name` text input.
  - On submit: pass `existing?.id || record?.id` to `onSave`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/RecordModal.tsx src/lib/ui-helpers.ts tests/ui-helpers.test.ts
git commit -m "feat: add assetCode autocomplete, reactive lookup, and history button in RecordModal"
```

---

### Task 3: Mobile Camera QR Code Scanner Component

**Files:**
- Install: `html5-qrcode`
- Create: `src/components/QrScannerModal.tsx`
- Modify: `src/components/RecordModal.tsx`
- Create: `tests/qr-scanner.test.ts`

**Interfaces:**
- Consumes:
  - `cleanQrPayload(raw: string): string`: Trims whitespace.
- Produces:
  - `<QrScannerModal isOpen={boolean} onClose={() => void} onScan={(code: string) => void} />`
  - Integrated `📷 สแกน QR` button in `RecordModal.tsx`.

- [ ] **Step 1: Write failing test in `tests/qr-scanner.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { cleanQrPayload } from '@/lib/ui-helpers';

describe('QR Scanner Payload Sanitization', () => {
  it('trims whitespace and returns clean assetCode', () => {
    expect(cleanQrPayload('  EQ-2024-888 \n ')).toBe('EQ-2024-888');
    expect(cleanQrPayload('IT-ASSET-01')).toBe('IT-ASSET-01');
  });

  it('handles empty string gracefully', () => {
    expect(cleanQrPayload('')).toBe('');
    expect(cleanQrPayload('   ')).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/qr-scanner.test.ts`
Expected: FAIL with `cleanQrPayload is not defined`.

- [ ] **Step 3: Install `html5-qrcode` and implement `QrScannerModal.tsx`**

- Install dependency: `npm install html5-qrcode`
- Export `cleanQrPayload(raw: string): string => raw.trim()` in `src/lib/ui-helpers.ts`.
- Create `src/components/QrScannerModal.tsx`:
  - Dynamically load `Html5Qrcode` from `html5-qrcode` in `useEffect`.
  - Start camera with `{ facingMode: 'environment' }`, fps: 10, qrbox: { width: 250, height: 250 }.
  - On decode: call `cleanQrPayload`, stop scanner, call `onScan(cleanCode)`, and call `onClose()`.
  - Handle camera permission errors with clear Thai message: "ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการเข้าถึงกล้องบนอุปกรณ์ หรือพิมพ์รหัสด้วยตนเอง".
  - Clean up scanner on unmount.
- In `RecordModal.tsx`:
  - Add button `📷 สแกน QR` adjacent to `assetCode` input.
  - Clicking button opens `QrScannerModal`.
  - When scanned, updates `formData.assetCode` and triggers lookup.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/components/QrScannerModal.tsx src/components/RecordModal.tsx src/lib/ui-helpers.ts tests/qr-scanner.test.ts
git commit -m "feat: add mobile camera QR code scanner with html5-qrcode"
```

---

### Task 4: Main Page Header Button & UI Reconciliation

**Files:**
- Modify: `src/components/RecordTable.tsx`
- Modify: `src/app/page.tsx`
- Modify: `tests/ui-helpers.test.ts`

**Interfaces:**
- Consumes:
  - `reconcileAssetRecords(prev: AssetRecord[], saved: AssetRecord): AssetRecord[]`
- Produces:
  - Primary button labeled `+ บันทึกหรือเปลี่ยนแปลงครุภัณฑ์`.
  - Idempotent table state reconciliation.
  - `onViewHistory` wiring from `RecordModal` to `LogHistoryModal`.

- [ ] **Step 1: Write failing test in `tests/ui-helpers.test.ts`**

```ts
describe('reconcileAssetRecords helper', () => {
  const current: AssetRecord[] = [
    { id: '1', assetCode: 'EQ-01', name: 'PC', location: '101', status: 'พร้อมใช้งาน', responsiblePerson: 'A', recordedBy: 'Admin', createdAt: '', updatedAt: '' },
    { id: '2', assetCode: 'EQ-02', name: 'Printer', location: '102', status: 'พร้อมใช้งาน', responsiblePerson: 'B', recordedBy: 'Admin', createdAt: '', updatedAt: '' },
  ];

  it('updates existing record in-place without duplicating rows', () => {
    const updated = { ...current[0], location: '202' };
    const result = reconcileAssetRecords(current, updated);
    expect(result.length).toBe(2);
    expect(result[0].location).toBe('202');
  });

  it('prepends newly created record if not already in list', () => {
    const created: AssetRecord = { id: '3', assetCode: 'EQ-03', name: 'Monitor', location: '103', status: 'พร้อมใช้งาน', responsiblePerson: 'C', recordedBy: 'Admin', createdAt: '', updatedAt: '' };
    const result = reconcileAssetRecords(current, created);
    expect(result.length).toBe(3);
    expect(result[0].id).toBe('3');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL with `reconcileAssetRecords is not defined`.

- [ ] **Step 3: Implement `reconcileAssetRecords` and wire `page.tsx` & `RecordTable.tsx`**

- In `src/lib/ui-helpers.ts`:
  - Export `reconcileAssetRecords(prev, saved)`.
- In `src/components/RecordTable.tsx`:
  - Update action button text to `+ บันทึกหรือเปลี่ยนแปลงครุภัณฑ์`.
- In `src/app/page.tsx`:
  - Pass `records` and `onViewHistory={(code) => { setSelectedHistoryAssetCode(code); setIsHistoryOpen(true); }}` to `RecordModal`.
  - Update `handleSaveRecord`:
    - Use `reconcileAssetRecords(records, json.data)` to update state.
    - Show success toast indicating whether updated or created.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/RecordTable.tsx src/app/page.tsx src/lib/ui-helpers.ts tests/ui-helpers.test.ts
git commit -m "feat: update button to 'บันทึกหรือเปลี่ยนแปลงครุภัณฑ์' and reconcile table state"
```

---

### Task 5: Full Verification, Documentation & Production Build

**Files:**
- Modify: `README.md`
- Run: Full test suite (`npm test`)
- Run: Next.js build (`npm run build`)

- [ ] **Step 1: Run full test suite and confirm 100% pass rate**

Run: `npm test`
Expected: All test suites pass (125+ tests).

- [ ] **Step 2: Run Next.js production build**

Run: `npm run build`
Expected: Production build succeeds with 0 errors and all dynamic/static routes generated.

- [ ] **Step 3: Update `README.md` documentation**

- Document the new Unified Create/Update modal.
- Document QR code camera scanning support on mobile devices.
- Document `assetCode` lookup, pre-fill lifecycle, and audit log tracking.

- [ ] **Step 4: Commit and push**

```bash
git add README.md
git commit -m "docs: update README with QR scanning, asset lookup, and unified tracking workflow"
git push origin feat/asset-tracking-crud
```

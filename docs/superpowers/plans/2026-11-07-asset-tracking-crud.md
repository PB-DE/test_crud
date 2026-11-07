# Internal Asset & Equipment Location Tracking CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify the Google Sheets CRUD web application into an internal organizational Asset & Equipment Location Tracking system (ระบบติดตามตำแหน่งครุภัณฑ์ในองค์กร) with tracking number, asset name, current location, status, responsible person, recorded by, and timestamp.

**Architecture:** Full-stack Next.js 15 (App Router, TypeScript, Tailwind CSS) communicating with Google Sheets as the database via official `googleapis` JWT authentication. Operates with an in-memory demo fallback, auto-detects and inserts asset headers (`A1:J1`), and provides an intuitive, responsive Thai-language asset management dashboard.

**Tech Stack:** Next.js 15, React 19, TypeScript (strict), Tailwind CSS, Lucide React, Google APIs Client (`googleapis`), Vitest.

**Spec:** User requirement to track internal equipment: เลขพัสดุ/รหัสครุภัณฑ์ (`assetCode`), ชื่อครุภัณฑ์ (`name`), ตำแหน่งล่าสุด (`location`), สถานะ (`status`), ผู้รับผิดชอบ (`responsiblePerson`), ผู้บันทึก (`recordedBy`), วันเวลา (`updatedAt`), and หมายเหตุ (`notes`).

## Global Constraints

- **Language & Runtime:** TypeScript (strict mode enabled), Node.js >= 18.
- **Data Integrity:** Keep persistent UUID in Column A of Google Sheet; dynamic row lookup must continue to match by UUID, not fragile row indices.
- **Sheet Range:** Expand columns to `A:J` (`ID`, `รหัสครุภัณฑ์`, `ชื่อครุภัณฑ์`, `ตำแหน่งที่ตั้ง`, `สถานะ`, `ผู้รับผิดชอบ`, `ผู้บันทึก`, `หมายเหตุ`, `วันที่บันทึก`, `วันที่แก้ไข`).
- **UI Localization:** Primary labels in Thai with clean, professional iconography; clear status badges (พร้อมใช้งาน: green, กำลังใช้งาน: blue, ส่งซ่อม: amber, จำหน่าย/ตัดบัญชี: gray).
- **Zero Breakage:** All 57+ unit/integration tests must pass and production build (`npm run build`) must succeed with 0 errors.

## Review Focus

1. **Sheet Column Mapping:** Column mapping in `rowToRecord` and `recordToRow` must exactly align with `A:J` to avoid shifting or corrupting cell data.
2. **Backward-Compatibility with Empty Cells:** If existing sheet rows have missing or sparse cells (e.g. no notes or legacy rows), `rowToRecord` must default safely without throwing runtime null reference errors.
3. **Multi-field Search:** Searching in `filterRecords` must match across `assetCode`, `name`, `location`, `responsiblePerson`, `recordedBy`, and `notes`.
4. **Form Validation:** Disallow blank `assetCode`, `name`, `location`, `responsiblePerson`, or `recordedBy`; return clean 400 Bad Request messages.
5. **Timestamp Formatting:** Display dates in readable Thai/local format (e.g. `15 พ.ย. 2026, 14:30` or `DD/MM/YYYY HH:mm`) while persisting ISO 8601 strings in Google Sheets.

---

### Task 1: Update Data Models & Types

**Files:**
- Modify: `src/lib/types.ts`
- Test: `tests/types.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export type AssetStatus = 'พร้อมใช้งาน' | 'กำลังใช้งาน' | 'ส่งซ่อม' | 'จำหน่าย/ตัดบัญชี';
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
  export function isValidAssetStatus(status: unknown): status is AssetStatus;
  ```

- [ ] **Step 1: Write failing test for asset types and status validation**

```typescript
// tests/types.test.ts
import { describe, it, expect } from 'vitest';
import { isValidAssetStatus, ASSET_STATUSES } from '../src/lib/types';

describe('Asset Types & Validation', () => {
  it('validates allowed asset statuses', () => {
    expect(isValidAssetStatus('พร้อมใช้งาน')).toBe(true);
    expect(isValidAssetStatus('กำลังใช้งาน')).toBe(true);
    expect(isValidAssetStatus('ส่งซ่อม')).toBe(true);
    expect(isValidAssetStatus('จำหน่าย/ตัดบัญชี')).toBe(true);
    expect(isValidAssetStatus('InvalidStatus')).toBe(false);
  });

  it('exports ASSET_STATUSES list with 4 options', () => {
    expect(ASSET_STATUSES).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/types.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `src/lib/types.ts`**

Define `AssetStatus`, `AssetRecord`, `CreateAssetInput`, `UpdateAssetInput`, and `isValidAssetStatus`. Provide aliases for backward compatibility if needed (`RecordItem = AssetRecord`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit data models**

```bash
git add src/lib/types.ts tests/types.test.ts
git commit -m "feat: define asset tracking data models and status validation"
```

---

### Task 2: Update Google Sheets Service Layer

**Files:**
- Modify: `src/lib/sheets.ts`
- Modify: `tests/sheets.test.ts`

**Interfaces:**
- Consumes: `AssetRecord`, `CreateAssetInput`, `UpdateAssetInput` from `src/lib/types.ts`
- Produces: `sheetsService` operating on `AssetRecord` with `A:J` range:
  - `HEADER_ROW = ['ID', 'รหัสครุภัณฑ์', 'ชื่อครุภัณฑ์', 'ตำแหน่งที่ตั้ง', 'สถานะ', 'ผู้รับผิดชอบ', 'ผู้บันทึก', 'หมายเหตุ', 'วันที่บันทึก', 'วันที่แก้ไข']`
  - Demo store seeded with realistic Thai organization equipment items.

- [ ] **Step 1: Update unit tests in `tests/sheets.test.ts` to test AssetRecord fields**

Update assertions for `assetCode`, `name`, `location`, `status`, `responsiblePerson`, `recordedBy`, and `notes`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/sheets.test.ts`
Expected: FAIL

- [ ] **Step 3: Update `src/lib/sheets.ts`**

Update `HEADER_ROW` (10 items), `RANGE_ALL = 'A:J'`, `rowToRecord` (indices 0..9), `recordToRow`, and realistic Thai demo items.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/sheets.test.ts`
Expected: PASS

- [ ] **Step 5: Commit sheets service**

```bash
git add src/lib/sheets.ts tests/sheets.test.ts
git commit -m "feat: update Google Sheets service layer for asset tracking schema"
```

---

### Task 3: Update REST API Endpoints

**Files:**
- Modify: `src/app/api/records/route.ts`
- Modify: `src/app/api/records/[id]/route.ts`
- Modify: `tests/api.test.ts`

**Interfaces:**
- Produces:
  - `POST /api/records`: validates `assetCode`, `name`, `location`, `responsiblePerson`, `recordedBy`, `status`
  - `PUT /api/records/[id]`: validates updated asset fields
  - `GET /api/records`: returns `AssetRecord[]`

- [ ] **Step 1: Update API tests in `tests/api.test.ts`**

Update payload shapes to include `assetCode`, `location`, `responsiblePerson`, `recordedBy` and Thai status strings.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/api.test.ts`
Expected: FAIL

- [ ] **Step 3: Update `src/app/api/records/route.ts` and `src/app/api/records/[id]/route.ts`**

Add validation for required fields (`assetCode`, `name`, `location`, `responsiblePerson`, `recordedBy`), sanitize inputs, and preserve `details` in error responses.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit API route handlers**

```bash
git add src/app/api/records/ tests/api.test.ts
git commit -m "feat: update REST API validation and handling for asset records"
```

---

### Task 4: Update Frontend UI Components & Main Dashboard

**Files:**
- Modify: `src/lib/filter-utils.ts`
- Modify: `tests/ui-helpers.test.ts`
- Modify: `src/components/RecordTable.tsx`
- Modify: `src/components/RecordModal.tsx`
- Modify: `src/components/DeleteDialog.tsx`
- Modify: `src/components/SetupBanner.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: Complete Thai-localized Asset Tracking UI with responsive table, status filter tabs, search across all asset properties, accessible Add/Edit modal with field validation, and confirmation dialog.

- [ ] **Step 1: Write failing tests in `tests/ui-helpers.test.ts` for asset search and sorting**

Test filtering by `assetCode`, `location`, `responsiblePerson`, and sorting by `assetCode`, `location`, `updatedAt`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ui-helpers.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `filter-utils.ts` and update React components**

1. Update `filter-utils.ts` for asset fields and statuses.
2. Update `RecordTable.tsx`: display columns (รหัสครุภัณฑ์, รายการครุภัณฑ์, ตำแหน่งที่ตั้ง, ผู้รับผิดชอบ, สถานะ, ผู้บันทึก, อัปเดตล่าสุด).
3. Update `RecordModal.tsx`: form with inputs for รหัสครุภัณฑ์, ชื่อรายการ, ตำแหน่งที่ตั้ง, สถานะ (select), ผู้รับผิดชอบ, ผู้บันทึก, หมายเหตุ.
4. Update `DeleteDialog.tsx` and `SetupBanner.tsx` copy.
5. Update `src/app/page.tsx` and `src/app/layout.tsx` title to "ระบบติดตามตำแหน่งครุภัณฑ์ในองค์กร".

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ui-helpers.test.ts`
Expected: PASS

- [ ] **Step 5: Commit UI changes**

```bash
git add src/lib/filter-utils.ts src/components/ src/app/ tests/ui-helpers.test.ts
git commit -m "feat: implement asset tracking UI table, modal form, and search filters"
```

---

### Task 5: Full Verification, Documentation & Remote Push

**Files:**
- Modify: `README.md`
- Verify: Full test suite (`npm test`) and production build (`npm run build`)
- Git push: push to `origin main` to trigger Vercel deployment.

- [ ] **Step 1: Update `README.md` with the new Asset Tracking schema and screenshots/API docs**
- [ ] **Step 2: Run complete test suite and production build**

Run:
```bash
npm test
npm run build
```
Expected: All tests pass, build completes with 0 errors.

- [ ] **Step 3: Commit and push to GitHub**

```bash
git add README.md
git commit -m "docs: update README for internal asset tracking system"
git push origin main
```


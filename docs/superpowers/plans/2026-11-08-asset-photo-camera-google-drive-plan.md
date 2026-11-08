# Asset Photo Camera Capture & Google Drive Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement camera photo capture and gallery selection for asset records with automated Google Drive upload and 11-column transaction ledger integration.

**Architecture:** Extend the immutable Append-Only Transaction Log with an 11th column (`รูปภาพ`) in Google Sheets (`Sheet1!A:K`). Photos captured via device camera or selected from device gallery are uploaded to a designated Google Drive folder via authenticated Google Service Account (`googleapis.drive`), and the resulting URL/ID is logged with the transaction. The latest photo is reactively projected in `RecordModal` and displayed in the `LogHistoryModal` audit timeline, while preserving a clean, uncluttered main dashboard table.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Google Drive API v3 (`googleapis`), Google Sheets API v4, Tailwind CSS, Lucide React, Vitest.

**Spec:** [`docs/superpowers/specs/2026-11-08-asset-photo-camera-google-drive-design.md`](file:///Users/phanuphong/Documents/MyClaude/DLT%20project/docs/superpowers/specs/2026-11-08-asset-photo-camera-google-drive-design.md)

## Global Constraints

- **Append-Only Immutability:** Never overwrite in-place or physically delete rows in Google Sheets; every photo upload or update appends a timestamped transaction row.
- **Backward Compatibility:** Existing 10-column rows (A:J) must be parsed without crashing or data loss, treating missing column 11 as empty string.
- **Clean Dashboard:** `RecordTable.tsx` must NOT render image thumbnails in table columns to keep the dashboard uncluttered.
- **Demo Mode Resilience:** The application and all tests must run 100% successfully even when Google credentials or Google Drive folders are not configured (storing data URLs in demo store).
- **Mobile First Camera:** Camera capture must use standard HTML5 `<input type="file" accept="image/*" capture="environment">` to seamlessly trigger the native hardware camera on mobile devices.

## Review Focus

1. **Photo Retention Across Updates:** When an asset is updated without taking a new photo, does `projectLatestAssets` retain the previously captured photo rather than clearing it?
2. **Missing Column 11 in Legacy Sheets:** Does reading older Google Sheets rows with only 10 columns parse safely with `imageUrl: undefined` or `""`?
3. **Invalid File Upload Security:** Does `POST /api/upload` reject non-image MIME types (e.g. `.exe`, `.pdf`, `.js`) and oversized files (>10MB) with clean HTTP 400 errors?
4. **Reactive Asset Lookup Image Sync:** When a user types or scans an existing `assetCode` into `RecordModal`, does the modal automatically display the existing item's latest photo preview?
5. **Drive Folder URL Parsing:** Does `src/lib/env.ts` properly parse both raw Google Drive folder IDs (`1a2b3c...`) and full URLs (`https://drive.google.com/drive/folders/1a2b3c...`)?

---

### Task 1: Data Models, Types, and Environment Configuration

**Files:**
- Modify: `src/lib/types.ts:10-50`
- Modify: `src/lib/env.ts:1-60`
- Test: `tests/types.test.ts`
- Test: `tests/env.test.ts`

- [ ] **Step 1: Write failing tests in `tests/types.test.ts` and `tests/env.test.ts`**
  - Assert that `AssetTransaction`, `AssetRecord`, `AssetLogRecord`, `CreateAssetInput`, and `UpdateAssetInput` accept optional `imageUrl?: string`.
  - Assert that `parseEnvConfig` extracts `driveFolderId` from raw folder ID and full Google Drive folder URL.
  - Assert that `isDriveConfigured` is true when credentials and `GOOGLE_DRIVE_FOLDER_ID` are present.
- [ ] **Step 2: Run tests to verify failure**
  - Run `npx vitest run tests/types.test.ts tests/env.test.ts` and confirm failure.
- [ ] **Step 3: Update `src/lib/types.ts`**
  - Add `imageUrl?: string` to `AssetTransaction`, `AssetRecord`, `AssetLogRecord`, `CreateAssetInput`, `UpdateAssetInput`.
- [ ] **Step 4: Update `src/lib/env.ts`**
  - Add `driveFolderId?: string` and `isDriveConfigured: boolean` to `EnvConfig`.
  - Add `parseDriveFolderId` regex parser supporting raw IDs and `https://drive.google.com/drive/folders/<ID>` URLs.
- [ ] **Step 5: Run tests and verify passing**
  - Run `npx vitest run tests/types.test.ts tests/env.test.ts` and confirm 100% pass.
- [ ] **Step 6: Commit changes**
  - `git commit -m "feat: add imageUrl to asset types and parse GOOGLE_DRIVE_FOLDER_ID in env"`

---

### Task 2: State Projection & Diff Engine with Photo Tracking

**Files:**
- Modify: `src/lib/log-utils.ts:1-170`
- Test: `tests/log-utils.test.ts`

- [ ] **Step 1: Write failing tests in `tests/log-utils.test.ts`**
  - Test that `projectLatestAssets` carries `imageUrl` forward when creating an asset.
  - Test that `projectLatestAssets` preserves previous `imageUrl` when a subsequent transaction has empty `imageUrl`.
  - Test that `projectLatestAssets` updates `imageUrl` when a subsequent transaction introduces a new photo URL.
  - Test that `computeTransactionDiffs` propagates `imageUrl` to the resulting `AssetLogRecord`.
- [ ] **Step 2: Run tests to verify failure**
  - Run `npx vitest run tests/log-utils.test.ts` and confirm test failures.
- [ ] **Step 3: Update `src/lib/log-utils.ts`**
  - In `projectLatestAssets`, maintain an `imageMap` or update `map.set(...)` such that if `tx.imageUrl` is provided, it updates the asset's `imageUrl`; if omitted/empty, retain the previous non-empty `imageUrl`.
  - In `computeTransactionDiffs`, include `imageUrl: tx.imageUrl` on emitted `AssetLogRecord`.
- [ ] **Step 4: Run tests and verify passing**
  - Run `npx vitest run tests/log-utils.test.ts` and confirm all tests pass.
- [ ] **Step 5: Commit changes**
  - `git commit -m "feat: support photo retention and diff propagation in log-utils"`

---

### Task 3: 11-Column Ledger & Google Drive Service Integration

**Files:**
- Modify: `src/lib/sheets.ts:1-400`
- Test: `tests/sheets.test.ts`

- [ ] **Step 1: Write failing tests in `tests/sheets.test.ts`**
  - Assert `HEADER_ROW` has 11 columns with `รูปภาพ` as the 11th column and range `A:K`.
  - Assert that reading mock Google Sheets rows with only 10 columns parses without error and sets `imageUrl: undefined`.
  - Assert that reading mock rows with 11 columns sets `imageUrl`.
  - Assert that `createRecord` and `updateRecord` append 11 columns.
  - Assert that demo store stores and returns `imageUrl`.
- [ ] **Step 2: Run tests to verify failure**
  - Run `npx vitest run tests/sheets.test.ts` and verify failures.
- [ ] **Step 3: Update `src/lib/sheets.ts`**
  - Update `HEADER_ROW` to:
    `['ID', 'วันเวลาที่ทำรายการ', 'การกระทำ', 'รหัสครุภัณฑ์', 'ชื่อครุภัณฑ์', 'ตำแหน่งที่ตั้ง', 'สถานะ', 'ผู้รับผิดชอบ', 'ผู้บันทึก', 'หมายเหตุ', 'รูปภาพ']`
  - Update `RANGE_ALL` to `'Sheet1!A:K'`.
  - Update `SCOPES` to include `'https://www.googleapis.com/auth/drive.file'`.
  - Add Google Drive helper function `uploadImageToDrive(fileBuffer, fileName, mimeType)` using `google.drive({ version: 'v3', auth })`.
  - Handle 11th column in `rowToRecord` / `rowToTransaction`: `row[10]?.trim() || undefined`.
  - Update demo transactions to include `imageUrl`.
- [ ] **Step 4: Run tests and verify passing**
  - Run `npx vitest run tests/sheets.test.ts` and verify 35+ tests pass.
- [ ] **Step 5: Commit changes**
  - `git commit -m "feat: expand transaction ledger to 11 columns with Google Drive upload service"`

---

### Task 4: REST API Endpoints for Image Upload and Serving

**Files:**
- Create: `src/app/api/upload/route.ts`
- Modify: `src/app/api/records/route.ts`
- Modify: `src/app/api/records/[id]/route.ts`
- Test: `tests/api.test.ts`

- [ ] **Step 1: Write failing tests in `tests/api.test.ts`**
  - Test `POST /api/upload` returns 400 if no file is sent.
  - Test `POST /api/upload` returns 400 if file is not an image (e.g. `application/pdf`).
  - Test `POST /api/upload` accepts valid image and returns `{ success: true, url, fileId }`.
  - Test `POST /api/records` and `PUT /api/records/[id]` persist `imageUrl`.
- [ ] **Step 2: Run tests to verify failure**
  - Run `npx vitest run tests/api.test.ts` and confirm failure.
- [ ] **Step 3: Implement `src/app/api/upload/route.ts`**
  - Parse `formData()`.
  - Validate MIME types (`image/jpeg`, `image/png`, `image/webp`, `image/gif`).
  - Max size validation (10MB).
  - If Drive configured, call Drive upload service; in demo mode, convert to data URL or demo URL.
- [ ] **Step 4: Update `src/app/api/records/route.ts` and `[id]/route.ts`**
  - Accept and pass `imageUrl` in request payloads.
- [ ] **Step 5: Run tests and verify passing**
  - Run `npx vitest run tests/api.test.ts` and confirm 100% pass.
- [ ] **Step 6: Commit changes**
  - `git commit -m "feat: add image upload API endpoint and update record routes"`

---

### Task 5: UI Integration in RecordModal & LogHistoryModal

**Files:**
- Modify: `src/components/RecordModal.tsx`
- Modify: `src/components/LogHistoryModal.tsx`
- Ensure: `src/components/RecordTable.tsx` stays clean (no image columns)
- Test: `tests/ui-helpers.test.ts`

- [ ] **Step 1: Update `src/components/RecordModal.tsx`**
  - Add photo management section to the modal:
    - Hidden camera input: `<input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" />`
    - Hidden gallery input: `<input ref={galleryInputRef} type="file" accept="image/*" className="hidden" />`
    - Two clear action buttons: 📷 **ถ่ายภาพ (Camera)** and 🖼️ **เลือกจากคลังภาพ (Gallery)**.
  - Add image preview card:
    - Display image preview (object URL or existing `imageUrl`).
    - Buttons to "เปลี่ยนรูปใหม่" (Retake/Re-select) and "ลบรูป" (Remove).
  - Client-side image resize helper to compress photos before upload (e.g. max 1600px, 80% JPEG quality) for fast mobile uploading.
  - Reactive lookup: When user inputs or autocompletes `assetCode`, if existing record has `imageUrl`, display it as current photo!
  - Upload image on submit via `POST /api/upload` if a new photo was selected.
- [ ] **Step 2: Update `src/components/LogHistoryModal.tsx`**
  - If a log entry has `log.imageUrl`, display an interactive image thumbnail card.
  - Clicking thumbnail opens an image viewer lightbox with full-size preview.
- [ ] **Step 3: Verify `src/components/RecordTable.tsx`**
  - Ensure main table remains clean and uncluttered.
- [ ] **Step 4: Run tests and verify passing**
  - Run `npx vitest run tests/ui-helpers.test.ts`.
- [ ] **Step 5: Commit changes**
  - `git commit -m "feat: add camera capture and gallery picker in RecordModal and photo display in LogHistoryModal"`

---

### Task 6: Google Drive Setup Documentation & Full Verification

**Files:**
- Create: `docs/google-drive-setup.md`
- Modify: `README.md`

- [ ] **Step 1: Write `docs/google-drive-setup.md`**
  - Detailed step-by-step instructions in Thai with screenshots/diagrams:
    1. Enabling Google Drive API in Google Cloud Console.
    2. Creating a dedicated Google Drive folder (e.g. "DLT Asset Photos").
    3. Sharing the folder with the Service Account email as Editor.
    4. Extracting the Folder ID from the Drive URL.
    5. Adding `GOOGLE_DRIVE_FOLDER_ID` to `.env.local`.
    6. Verifying upload and access.
- [ ] **Step 2: Update `README.md`**
  - Document photo capture capabilities, mobile camera support, and Google Drive configuration.
- [ ] **Step 3: Run full verification suite**
  - Run `npm test` across all test files.
  - Run `npm run build` to confirm production build succeeds.
- [ ] **Step 4: Commit and push**
  - `git commit -m "docs: add Google Drive setup guide and update README with photo integration"`
  - `git push origin feat/asset-tracking-crud`


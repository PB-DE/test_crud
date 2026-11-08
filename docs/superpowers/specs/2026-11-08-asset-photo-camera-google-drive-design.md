# Asset Photo Capture & Google Drive Integration Design Specification

## 1. Executive Summary

This document specifies the design for adding **photo capture and Google Drive storage** to the Google Sheets Asset Tracking system:
1. **Camera Capture & Gallery Selection:** When creating or updating an asset in `RecordModal`, users can either take a live photo using their device camera or select an existing photo from their gallery/file system.
2. **Reactive Image Lookup:** When an asset code is entered or scanned in `RecordModal`, if the asset already exists in the system, its latest photo (projected from the Append-Only Transaction Log) is displayed with an option to update/retake.
3. **Google Drive Cloud Storage:** Photos are uploaded to a designated Google Drive folder via Google Service Account authentication (`drive.files.create`), generating a permanent reference stored in the Append-Only Transaction Ledger (Column 11: `รูปภาพ`).
4. **History Timeline Image Display:** When viewing the change log history in `LogHistoryModal`, each transaction displays the photo captured at that point in time, enabling visual audit trails.
5. **Clean Dashboard:** As explicitly requested, the main dashboard table (`RecordTable`) does not display image previews to prevent visual clutter and maintain high performance.
6. **Comprehensive Documentation:** Full setup guide for Google Drive folder creation, permissions, and Service Account configuration documented in `docs/google-drive-setup.md`.

---

## 2. Architecture & Data Flow

```
[ User in RecordModal ]
      │
      ├── (A) Camera capture (<input capture="environment">) OR
      ├── (B) Gallery selection (<input type="file" accept="image/*">)
      ▼
[ Instant Local Preview (Blob URL) ]
      │
      ├── On Submit (POST /api/upload)
      │       ├── Validates MIME type & size (<10MB)
      │       ├── Uploads to Google Drive Folder (Service Account)
      │       └── Returns Drive File ID & View URL
      ▼
[ Transaction Ledger Append (Sheet1!A:K) ]
      │  Columns A:K: ID, Timestamp, Action, AssetCode, Name,
      │               Location, Status, Responsible, RecordedBy, Notes, ImageUrl
      ▼
[ State Projection (log-utils.ts) ]
      ├── RecordModal: Displays latest imageUrl for existing asset
      ├── LogHistoryModal: Displays historical photo at each transaction
      └── RecordTable: Dashboard displays clean tabular data (no clutter)
```

---

## 3. Data Model & Schema Updates

### 3.1. Google Sheets Ledger Schema (`Sheet1!A:K`)
The transaction ledger expands from 10 to 11 columns:

| Index | Column Header | Data Type | Example |
| :--- | :--- | :--- | :--- |
| 0 | ID | UUID string | `tx-1731056400000-a1b2c` |
| 1 | วันเวลาที่ทำรายการ | ISO 8601 string | `2026-11-08T08:30:00.000Z` |
| 2 | การกระทำ | Enum | `บันทึกรายการใหม่` \| `แก้ไข/ย้ายตำแหน่ง` \| `จำหน่าย/ตัดบัญชี` |
| 3 | รหัสครุภัณฑ์ | String (Trimmed) | `EQ-2026-001` |
| 4 | ชื่อครุภัณฑ์ | String | `คอมพิวเตอร์ตั้งโต๊ะ Dell` |
| 5 | ตำแหน่งที่ตั้ง | String | `ห้อง 301 อาคาร 1` |
| 6 | สถานะ | Enum | `พร้อมใช้งาน` \| `กำลังใช้งาน` \| `ส่งซ่อม` \| `จำหน่าย/ตัดบัญชี` |
| 7 | ผู้รับผิดชอบ | String | `สมชาย สายตรวจ` |
| 8 | ผู้บันทึก | String | `วิภาดา สารสนเทศ` |
| 9 | หมายเหตุ | String | `ตรวจเช็คประจำปี` |
| 10 | รูปภาพ | URL or Drive File ID | `https://drive.google.com/uc?id=...` or `/api/drive/image?fileId=...` |

**Backward Compatibility:** If existing rows only have 10 columns (A:J), missing column 11 is gracefully parsed as `""` (empty string).

### 3.2. TypeScript Types (`src/lib/types.ts`)
- `AssetTransaction`: Add `imageUrl?: string`
- `AssetRecord`: Add `imageUrl?: string`
- `AssetLogRecord`: Add `imageUrl?: string`
- `CreateAssetInput`: Add `imageUrl?: string`
- `UpdateAssetInput`: Add `imageUrl?: string`

### 3.3. Environment Configuration (`src/lib/env.ts`)
- Support `GOOGLE_DRIVE_FOLDER_ID`: Supports either raw ID (e.g. `1a2b3c4d5e...`) or full URL (e.g. `https://drive.google.com/drive/folders/1a2b3c4d5e...`).
- `isDriveConfigured`: Boolean indicating whether both Service Account credentials and `GOOGLE_DRIVE_FOLDER_ID` are set.
- Scopes: Updated to include `'https://www.googleapis.com/auth/drive.file'`.

---

## 4. Component & UI Design

### 4.1. `RecordModal.tsx`
- **Asset Code Lookup:** When user enters/selects an `assetCode` matching an existing record, the modal pre-fills existing fields AND displays the latest `imageUrl` with a badge "รูปภาพปัจจุบัน".
- **Dual Photo Inputs:**
  - 📷 **ถ่ายภาพ:** Button triggering native camera capture via `<input type="file" accept="image/*" capture="environment">` (launches hardware camera on iOS/Android and desktop webcams).
  - 🖼️ **เลือกจากคลังภาพ:** Button triggering gallery/file picker via `<input type="file" accept="image/*">`.
- **Photo Preview Card:**
  - Shows high-quality thumbnail preview.
  - "เปลี่ยนรูปใหม่" (Change photo) and "ลบรูป" (Remove photo) actions.
  - Image compression/resizing (client-side canvas resize to max 1600px width/height, ~80% JPEG quality) to ensure fast uploads on cellular networks while preserving sharpness.

### 4.2. `LogHistoryModal.tsx`
- Each transaction timeline card displays:
  - If `log.imageUrl` is present, renders an expandable thumbnail badge.
  - Clicking thumbnail opens an image preview lightbox/modal with high-resolution view.

### 4.3. `RecordTable.tsx`
- Unmodified visually: remains clean, fast, and free of image thumbnail clutter as requested.

---

## 5. API Endpoints

1. **`POST /api/upload`**:
   - Accepts `FormData` with `file: File`, `assetCode: string`.
   - Validates file type (`image/jpeg`, `image/png`, `image/webp`).
   - If Google Drive is configured:
     - Streams file to Google Drive folder using `googleapis.drive('v3').files.create`.
     - Sets permission to public reader (`anyone` / `reader`) so the file can be viewed directly.
     - Returns `{ success: true, fileId, url }`.
   - If demo mode (no credentials):
     - Converts to base64 data URL and stores in memory demo store.
     - Returns `{ success: true, fileId: 'demo-...', url: dataUrl }`.
2. **`GET /api/drive/image/[id]`** (Optional proxy/fallback):
   - Streams file from Google Drive using Service Account if direct public link is restricted.

---

## 6. Testing Strategy

1. **`tests/env.test.ts`**: Test parsing of `GOOGLE_DRIVE_FOLDER_ID` (raw id, full URL, empty/undefined).
2. **`tests/sheets.test.ts`**: Test 11-column header row, appending transactions with `imageUrl`, and backward-compatible reading of 10-column legacy rows.
3. **`tests/log-utils.test.ts`**: Test that `projectLatestAssets` preserves the latest `imageUrl` across sequential updates, and `computeTransactionDiffs` captures image changes in diffs.
4. **`tests/api.test.ts`**: Test `/api/upload` endpoint with valid images, invalid file types, and file size limits.
5. **Full Suite & Build Verification**: All tests pass and `npm run build` succeeds.


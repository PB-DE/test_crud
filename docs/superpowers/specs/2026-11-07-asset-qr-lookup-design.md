# Design Document: Unified Asset Tracking with QR Scanning, Lookup & Uniqueness

**Date:** 2026-11-07  
**Status:** Draft / Review  
**Target File:** `docs/superpowers/specs/2026-11-07-asset-qr-lookup-design.md`

---

## 1. Intent & Purpose

The organizational asset and equipment tracking system needs to provide a fast, seamless workflow for field officers and staff walking through facilities with smartphones or tablets to inspect, move, or register assets.

Key pain points addressed:
1. **Preventing duplicate records:** In organization inventory management, an `assetCode` (เลขพัสดุ / รหัสครุภัณฑ์) uniquely identifies an item. Entering an existing `assetCode` must update that specific item's location and custodian rather than creating duplicate rows in the database.
2. **Unified Action Entrypoint:** Staff do not need separate "Create" and "Edit" cognitive modes when inspecting items. A single "+ บันทึกหรือเปลี่ยนแปลงครุภัณฑ์" (Record or Update Asset) action handles both cases transparently.
3. **Smart Lookup & Autocomplete:** When entering or selecting an `assetCode`, the system automatically detects whether it is an existing asset or a new item. If existing, it pulls up the asset's name, previous location, and current custodian, and offers instant 1-click access to its movement history.
4. **Mobile QR Code Scanning:** Staff can tap a camera icon next to the asset code field to scan QR code labels attached to equipment using their phone camera, immediately populating the field and triggering lookup without manual typing.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **Asset Code Uniqueness:** An `assetCode` represents a single unique asset across the system. Submitting an existing `assetCode` performs an update with audit logging on the existing record.
- **Unified Action Button:** Update page action button from "+ บันทึกครุภัณฑ์ใหม่" to "+ บันทึกหรือเปลี่ยนแปลงครุภัณฑ์".
- **Autocomplete & Lookup:**
  - Dropdown / Datalist showing existing asset codes and equipment names.
  - Selecting/typing an existing code automatically fills and locks `name`, displays previous location & custodian, and shows a "📜 ดูประวัติการเปลี่ยนแปลง" button.
  - If a code does not exist, unlocks `name` and indicates new asset registration.
- **Mobile QR Code Scanner:**
  - Integrated QR scanner modal using device camera (`facingMode: "environment"`).
  - Fast scan detection that fills `assetCode` and closes the scanner cleanly.
  - Graceful fallback and error messaging when camera permissions are denied or unsupported.
- **Audit Logging Preservation:**
  - Updates continue to compute exact field diffs (`old ➔ new`) into Google Sheets `Logs` tab.
  - New assets continue to write `CREATE` logs into `Logs` tab.

### Non-Goals
- Modifying Google Sheets schema structure (the 10-column `Assets` and 11-column `Logs` schemas remain identical).
- Generating/printing QR code stickers (this feature is purely for scanning/reading existing QR codes).
- Barcode format conversions (QR code text is read as raw alphanumeric `assetCode`).

### Anti-Goals
- Never allow duplicate rows with the same `assetCode` in the `Assets` sheet.
- Never crash or lock up the UI if the user denies camera permissions or uses an unsupported device.
- Never lose previous change history when an asset's location is updated.

---

## 3. Architecture & User Flows

```
[ User clicks "+ บันทึกหรือเปลี่ยนแปลงครุภัณฑ์" ]
                    │
                    ▼
          [ Open Unified Modal ]
                    │
      ┌─────────────┴─────────────┐
      ▼                           ▼
[ Type / Select Code ]    [ Tap 📷 Scan QR ]
      │                           │
      │                     [ Camera Opens ]
      │                           │
      │                     [ Scan QR Code ]
      │                           │
      └─────────────┬─────────────┘
                    ▼
       [ Auto-detect assetCode ]
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
 [ Existing Asset? ]      [ New Asset? ]
        │                       │
 ┌──────┴────────────────┐ ┌────┴──────────────────────────┐
 │ • Badge: ครุภัณฑ์เดิม │ │ • Badge: ครุภัณฑ์ใหม่         │
 │ • Name: Locked/Lookup │ │ • Name: Editable Input        │
 │ • Show Prev Location  │ │ • Fill Initial Location       │
 │ • Button: ดูประวัติ   │ │ • Fill Initial Status/Custody │
 └──────┬────────────────┘ └────┬──────────────────────────┘
        │                       │
        ▼                       ▼
 [ Submit Update ]        [ Submit Create ]
        │                       │
        ▼                       ▼
  PUT /api/records/[id]    POST /api/records
        │                       │
        ▼                       ▼
[ Update row in Assets ]  [ Append row in Assets ]
[ Log diff in Logs ]      [ Log create in Logs ]
```

---

## 4. Technical Specifications

### 4.1 Frontend Component Changes

1. **`src/components/RecordModal.tsx`**:
   - Accepts `records: AssetRecord[]` prop (to enable local client-side instant lookup and autocomplete datalist).
   - State for `assetCode` triggers reactive lookup:
     ```ts
     const existingAsset = useMemo(() => {
       if (!formData.assetCode.trim()) return null;
       return records.find(r => r.assetCode.trim().toLowerCase() === formData.assetCode.trim().toLowerCase()) || null;
     }, [formData.assetCode, records]);
     ```
   - **Form Field Population Lifecycle (Builder Call):**
     - When `existingAsset` is found:
       - Sets mode to `isExistingAsset = true`.
       - Automatically sets and locks `name: existingAsset.name`.
       - Pre-fills `responsiblePerson` with `existingAsset.responsiblePerson` (editable if changed).
       - Pre-fills `status` with `existingAsset.status` (prevents unintended resets to default).
       - Displays callout banner showing:
         - Green badge: "✓ พบครุภัณฑ์เดิมในระบบ"
         - Previous location: `existingAsset.location`
         - Previous custodian: `existingAsset.responsiblePerson`
         - Button: "📜 ดูประวัติการเปลี่ยนแปลง" (triggers `onViewHistory(existingAsset.assetCode)`).
     - When `existingAsset` is not found:
       - Sets mode to `isExistingAsset = false`.
       - Orange badge: "✦ รหัสนี้ยังไม่มีในระบบ (ลงทะเบียนใหม่)"
       - `name` input is unlocked and required.
   - Integrated QR button:
     - Next to `assetCode` input: button with camera icon `"📷 สแกน QR"`.
     - Clicking opens `QrScannerModal`.

2. **`src/components/QrScannerModal.tsx` (New Component)**:
   - Dynamic client-side loading of `html5-qrcode` to ensure SSR safety.
   - **Payload Format (Confirmed with User):** QR codes encode direct raw alphanumeric asset codes (e.g., `EQ-2024-001`).
   - Configures camera:
     - `fps: 10`
     - `qrbox: { width: 250, height: 250 }`
     - `facingMode: { exact: "environment" }` with fallback to `"user"`.
   - On successful decode:
     - Stops camera stream cleanly.
     - Calls `onScan(decodedText.trim())`.
     - Closes modal.
   - On error or permission denial:
     - Displays friendly message in Thai: "ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการใช้งานกล้อง หรือพิมพ์รหัสด้วยตนเอง".

3. **`src/components/RecordTable.tsx` & `src/app/page.tsx`**:
   - Main header button updated to `"+ บันทึกหรือเปลี่ยนแปลงครุภัณฑ์"`.
   - Passes `records` and `onViewHistory` callback to `RecordModal`.
   - **Reconciliation Handler (Builder Call):**
     - Client reconciles updated records idempotently:
       ```ts
       setRecords((prev) => 
         prev.some(r => r.id === saved.id)
           ? prev.map(r => r.id === saved.id ? saved : r)
           : [saved, ...prev]
       );
       ```
     - Handles submit:
       - If `formData.id` or `existingAsset` exists, dispatches `PUT /api/records/${id}`.
       - If new asset, dispatches `POST /api/records`.

### 4.2 Backend & Service Layer Changes

1. **`src/app/api/records/route.ts`**:
   - In `POST` handler: Check if `assetCode` already exists in Google Sheets.
   - If an asset with the same `assetCode` already exists, automatically update that record using `updateRecord` (with diff logging) rather than creating a duplicate row, returning the updated record.
2. **`src/app/api/records/[id]/route.ts`**:
   - In `PUT` handler: Check if updated `assetCode` collides with another record's `assetCode` (with different `id`). If collision detected, return `409 Conflict`.
3. **`src/lib/sheets.ts`**:
   - In `createRecord(data)`:
     - Fetch current records.
     - If a record with `record.assetCode.trim().toLowerCase() === data.assetCode.trim().toLowerCase()` already exists:
       - Call `updateRecord(existingRecord.id, data)`.
     - Otherwise, append new row to `Assets` sheet and log creation in `Logs`.
   - In `updateRecord(id, data)`:
     - If `data.assetCode` is changed, ensure no other row in `Assets` shares that `assetCode`. If found, throw collision error.
4. **`src/lib/types.ts`**:
   - Ensure clean validation rules and type compatibility.

---

## 5. Error Handling & Edge Cases

| Scenario | Handling |
|---|---|
| Camera permission denied | Show alert in scanner modal with instructions to enable camera in browser settings, and provide a clear "ปิด" button to return to manual typing. |
| Mobile device has multiple cameras | Request `"environment"` (back camera); fallback to any available video input device if environment camera is unavailable. |
| User types uppercase/lowercase variations (e.g. `eq-001` vs `EQ-001`) | Comparison is normalized using `.trim().toLowerCase()` to prevent accidental duplicates. |
| Network offline or slow Google Sheets API during scan | UI shows loading spinner on save button; on failure, displays toast error without discarding user input. |
| QR Code contains extra whitespace or URL prefix | Clean and extract raw code from decoded string (strip trailing/leading whitespace). |

---

## 6. What's Left to the Builder

- Exact visual layout of the camera scanning viewfinder box and scan animation line.
- Selection of npm package: `html5-qrcode` (standard, zero external dependencies, robust mobile camera handling).
- Toast notification message upon successful QR code detection.


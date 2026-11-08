# ระบบติดตามตำแหน่งครุภัณฑ์ในองค์กร (Internal Asset & Equipment Tracking System)

> A production-ready, full-stack Asset & Equipment Location Tracking web application powered by **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Google Sheets** as a real-time serverless database.

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-3.2-6E9F18?logo=vitest)](https://vitest.dev/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com/)

---

## จุดเด่นและคุณสมบัติหลัก (Highlights & Features)

- **ถ่ายภาพสดจากกล้องและเลือกจากคลังภาพ (Camera & Gallery Photo Upload):** ถ่ายภาพครุภัณฑ์ได้ทันทีผ่านกล้องมือถือ/แท็บเล็ต/เว็บแคม หรือเลือกภาพที่มีอยู่ในเครื่อง พร้อมแสดงตัวอย่างรูปภาพแบบเรียลไทม์
- **จัดเก็บรูปภาพบน Google Drive (Google Drive Cloud Storage):** อัปโหลดไฟล์รูปภาพไปยังโฟลเดอร์ Google Drive ขององค์กรผ่าน Google Service Account อัตโนมัติ โดยระบุ `GOOGLE_DRIVE_FOLDER_ID`
- **พรีวิวภาพถ่ายในหน้าต่างประวัติ (History Photo Viewer & Lightbox):** ในหน้าต่างดูประวัติย้อนหลัง (`LogHistoryModal`) สามารถดูรูปถ่ายที่แนบมากับรายการทำรายการในแต่ละช่วงเวลา และคลิกเพื่อขยายดูรูปขนาดเต็มได้
- **แดชบอร์ดสะอาดตาไร้ความรก (Uncluttered Dashboard):** หน้าตารางแดชบอร์ดหลักถูกออกแบบให้กระชับ โหลดเร็ว และไม่แสดง thumbnail รูปภาพมารบกวนการทำงาน
- **ระบบโมดอลรวมศูนย์ (+ บันทึกหรือเปลี่ยนแปลงครุภัณฑ์):** ผสานการลงทะเบียนครุภัณฑ์ใหม่และการอัปเดตตำแหน่ง/สถานะครุภัณฑ์เดิมเข้าไว้ในหน้าต่างเดียว ใช้งานง่ายทั้งจากเดสก์ท็อปและสมาร์ตโฟน
- **สแกน QR Code ด้วยกล้องอุปกรณ์ (Mobile QR Scanner):** ปุ่มสแกนข้างช่องรหัสครุภัณฑ์ รองรับกล้องหลัง (Rear/Environment Camera) บนมือถือและแท็บเล็ต พร้อมระบบสลับกล้องสำรองอัตโนมัติด้วยเทคโนโลยี `html5-qrcode`
- **ระบบค้นหารหัสครุภัณฑ์แบบเรียลไทม์ (Reactive Asset Lookup & Auto-Fill):**
  - แสดงตัวเลือกรหัสครุภัณฑ์ที่มีในระบบอัตโนมัติผ่าน Autocomplete Dropdown (`<datalist>`)
  - เมื่อพิมพ์หรือสแกนเจอรหัสเดิม: แสดงแถบสีเขียว `✓ พบครุภัณฑ์เดิมในระบบ`, แสดงสถานที่เดิมและผู้รับผิดชอบเดิม พร้อมดึงชื่อครุภัณฑ์และข้อมูลล่าสุดมาเติมให้อัตโนมัติ
  - หากเป็นรหัสใหม่: แสดงแถบสีส้ม `✦ รหัสนี้ยังไม่มีในระบบ (ลงทะเบียนใหม่)` และเปิดช่องให้กรอกชื่อครุภัณฑ์ใหม่ได้ทันที
- **ดูประวัติการเปลี่ยนแปลงใน 1 คลิก (1-Click Historical Timeline):** เมื่อตรวจพบครุภัณฑ์เดิมในระบบ จะมีปุ่ม `📜 ดูประวัติการเปลี่ยนแปลง` ให้เปิดดูไทม์ไลน์ประวัติการย้ายสถานที่/เปลี่ยนสถานะของครุภัณฑ์ชิ้นนั้นได้ทันที
- **การคุ้มครองความไม่ซ้ำซ้อนของรหัสครุภัณฑ์ (Asset Code Uniqueness & Upsert):**
  - `POST /api/records`: หากรหัสครุภัณฑ์มีอยู่แล้ว ระบบจะทำการอัปเดตข้อมูลของชิ้นเดิม (Upsert) ป้องกันการเกิดแถวซ้ำซ้อน
  - `PUT /api/records/[id]`: ป้องกันการแก้ไขรหัสครุภัณฑ์ไปซ้ำกับครุภัณฑ์ชิ้นอื่นในระบบ (ตรวจจับ Collision พร้อมส่งคืน HTTP 409 Conflict)
- **ระบบจัดการข้อมูลครุภัณฑ์ครบวงจร (Full CRUD):** สร้าง, ค้นหา, ดูรายละเอียด, แก้ไข และลบข้อมูลตำแหน่งครุภัณฑ์ พร้อมบันทึกและซิงค์ข้อมูลกับ Google Sheets แบบเรียลไทม์
- **ระบบบันทึกประวัติการเปลี่ยนแปลงอัตโนมัติ (Dual-Sheet Audit Trail):** ทุกการสร้าง แก้ไข ย้ายสถานที่ เปลี่ยนสถานะ หรือลบ จะถูกคำนวณส่วนต่าง (Diff) และบันทึกลงแผ่นงาน `Logs` แยกต่างหากอย่างละเอียด
- **ไทม์ไลน์ประวัติการทำรายการ (Change Log Timeline Modal):** แสดงประวัติการทำรายการพร้อมเปรียบเทียบค่าเดิม ➔ ค่าใหม่ (เช่น ตำแหน่ง, ผู้รับผิดชอบ, สถานะ) สามารถดูประวัติรวมทั้งหมดหรือเจาะจงเฉพาะครุภัณฑ์แต่ละชิ้นได้ พร้อมระบบค้นหาแบบเรียลไทม์
- **โครงสร้างข้อมูลเฉพาะทางสำหรับครุภัณฑ์:** ติดตามรหัสครุภัณฑ์ (`assetCode`), ชื่อครุภัณฑ์ (`name`), ตำแหน่งที่ตั้ง (`location`), ผู้รับผิดชอบ (`responsiblePerson`), ผู้บันทึก (`recordedBy`), หมายเหตุ (`notes`), และสถานะการใช้งาน
- **สถานะครุภัณฑ์มาตรฐาน 4 ระดับ (Status Badges):**
  - 🟢 **พร้อมใช้งาน (Available / Ready)**
  - 🔵 **กำลังใช้งาน (In Use)**
  - 🟡 **ส่งซ่อม (Under Repair)**
  - 🔴 **จำหน่าย/ตัดบัญชี (Disposed / Written Off)**
- **การค้นหาและกรองข้อมูลแบบเรียลไทม์ (Real-Time Search & Filtering):** ค้นหาได้ทันทีข้ามทั้งรหัสครุภัณฑ์, ชื่อครุภัณฑ์, ตำแหน่งที่ตั้ง, ผู้รับผิดชอบ และผู้บันทึก พร้อมแท็บกรองตามสถานะ
- **การเรียงลำดับคอลัมน์ (Multi-Column Sorting):** คลิกหัวตารางเพื่อเรียงลำดับตามวันที่อัปเดต, รหัสครุภัณฑ์, ชื่อครุภัณฑ์ หรือตำแหน่งที่ตั้ง ทั้งขาขึ้น (asc) และขาลง (desc)
- **Modal Dialog และส่วนต่อประสานที่เข้าถึงได้ (Accessible UI):** รองรับคีย์บอร์ด (Esc เพื่อปิด, Enter เพื่อยืนยัน), ป้องกันการคลิกพื้นหลังหลุด, พร้อมการแจ้งเตือนแบบ Toast
- **รองรับโหมดจำลอง (Demo Mode Fallback):** ใช้งานได้ทันทีแม้ยังไม่ต่อ Google Credentials ด้วย In-Memory Store และข้อมูลตัวอย่างภาษาไทย ทั้งข้อมูลครุภัณฑ์และประวัติการเปลี่ยนแปลง
- **Auto-Initialization ของ Google Sheet:** เมื่อเชื่อมต่อ Sheet ว่าง ระบบจะเขียน Header คอลัมน์ภาษาไทยทั้งในแผ่นงานหลัก (`A:J`) และแผ่นงาน `Logs` (`A:K`) ให้อัตโนมัติในครั้งแรก
- **การจัดการแถวที่ทนทาน (Resilient UUID Indexing):** อ้างอิงแถวด้วยรหัส UUID ถาวร แม้จะมีการเรียงลำดับหรือแก้ไขแถวใน Google Sheets โดยตรงก็ไม่เกิดปัญหาข้อมูลเหลื่อมล้ำ
- **Type-Safe REST API:** สร้างด้วย Next.js App Router route handlers พร้อมการตรวจสอบความถูกต้องของข้อมูล (Validation) และ Error Handling อย่างรัดกุม

---

## สถาปัตยกรรมฐานข้อมูล Google Sheet แบบ Append-Only Transaction Log

ระบบเปลี่ยนผ่านสู่สถาปัตยกรรม **Append-Only Transaction Log Architecture** 100% โดย Google Sheet จะทำหน้าที่เป็นสมุดบัญชีรายการทำรายการ (Transaction Ledger) ที่บันทึกประวัติแบบไม่ลบหรือเขียนทับข้อมูลเดิม:

### 1. โครงสร้างคอลัมน์มาตรฐาน 11 คอลัมน์ (`A:K`)

ทุกการกระทำ (ลงทะเบียนครุภัณฑ์ใหม่, ย้ายสถานที่, เปลี่ยนผู้ดูแล, เปลี่ยนสถานะ หรือจำหน่าย/ตัดบัญชี) จะเขียนต่อท้ายแถวใหม่ (Append Row) ในรูปแบบเดียวกันเสมอ:

| คอลัมน์ | ชื่อคอลัมน์ (Header) | ฟิลด์ข้อมูล (JSON Key) | ชนิดข้อมูล | คำอธิบาย |
| :---: | :--- | :--- | :--- | :--- |
| **A** | `ID` | `id` | String (UUID) | รหัสประจำรายการทำรายการ (Transaction ID) สร้างอัตโนมัติ |
| **B** | `วันเวลาที่ทำรายการ` | `timestamp` | ISO 8601 String | วันและเวลาที่ทำรายการ (เช่น `2026-11-07T10:00:00.000Z`) ใช้เป็น **Indicator สถานะล่าสุด** |
| **C** | `การกระทำ` | `action` | Enum String | `บันทึกรายการใหม่`, `แก้ไข/ย้ายตำแหน่ง`, `จำหน่าย/ตัดบัญชี` |
| **D** | `รหัสครุภัณฑ์` | `assetCode` | String | รหัสครุภัณฑ์ (เช่น `EQ-2026-001`) ใช้รวมกลุ่มประวัติ |
| **E** | `ชื่อครุภัณฑ์` | `name` | String | ชื่อหรือรายการของครุภัณฑ์ |
| **F** | `ตำแหน่งที่ตั้ง` | `location` | String | สถานที่จัดวางล่าสุด ณ ขณะทำรายการ |
| **G** | `สถานะ` | `status` | Enum String | `พร้อมใช้งาน`, `กำลังใช้งาน`, `ส่งซ่อม`, `จำหน่าย/ตัดบัญชี` |
| **H** | `ผู้รับผิดชอบ` | `responsiblePerson` | String | ชื่อเจ้าหน้าที่หรือแผนกผู้ถือครอง/ดูแลครุภัณฑ์ |
| **I** | `ผู้บันทึก` | `recordedBy` | String | ชื่อเจ้าหน้าที่ผู้ลงข้อมูลหรือตรวจนับ |
| **J** | `หมายเหตุ` | `notes` | String | ข้อมูลเพิ่มเติม รายละเอียดอาการ หรือสเปก |
| **K** | `รูปภาพ` | `imageUrl` | String (URL) | ลิงก์รูปภาพครุภัณฑ์บน Google Drive |

---

### 2. หลักการทำงานของระบบคำนวณสถานะล่าสุด (Latest State Projection Engine)

- **`timestamp` เป็นตัวบ่งชี้สถานะล่าสุด (Timestamp Indicator):** ข้อมูลครุภัณฑ์ชิ้นเดียวกัน (`assetCode` เดียวกันแบบ Case-Insensitive) จะมีได้หลายแถวใน Google Sheet เพื่อบันทึกประวัติการย้ายสถานที่หรือเปลี่ยนสถานะ โดยแถวที่มี `timestamp` ใหม่ที่สุดจะถูกโปรเจกต์เป็น **สถานะปัจจุบัน (Current State)** บนแดชบอร์ด
- **ฟังก์ชัน `projectLatestAssets(transactions)`:**
  1. เรียงลำดับรายการทำรายการทั้งหมดตาม `timestamp` ขาขึ้น
  2. รวมกลุ่มข้อมูลตาม `normalizeAssetCode(assetCode)`
  3. บันทึก `createdAt` จาก timestamp แรกที่พบ, `updatedAt` จาก timestamp ล่าสุด และนับจำนวนรายการ (`transactionCount`)
  4. นำรายการที่มีสถานะล่าสุดไปแสดงผลในตารางแดชบอร์ด (โดยรวมถึงสถานะ `จำหน่าย/ตัดบัญชี` เพื่อให้กรองดูได้จากแท็บสถานะ)
- **ประวัติการเปลี่ยนแปลงแบบไร้รอยต่อ (Historical Timeline from Ledger):**
  - ฟังก์ชัน `computeTransactionDiffs` ดึงประวัติทุกแถวของครุภัณฑ์ชิ้นนั้นมาเปรียบเทียบค่าแบบ `เดิม ➔ ใหม่` (เช่น การย้ายห้อง, เปลี่ยนผู้รับผิดชอบ) และส่งต่อไปยังหน้าต่างแสดงประวัติ (History Modal) โดยไม่ต้องพึ่งพาชีตภายนอก
- **การจำหน่าย/ตัดบัญชีแบบปลอดภัย (Soft Decommissioning):**
  - เมื่อผู้ใช้ลบรายการ ระบบจะไม่ส่งคำสั่งลบแถว (`deleteDimension`) ใน Google Sheets แต่จะเขียนรายการทำรายการใหม่ที่มี `action: 'จำหน่าย/ตัดบัญชี'` และ `status: 'จำหน่าย/ตัดบัญชี'` เพื่อรักษาประวัติการตรวจสอบ (Audit Trail) ให้ครบถ้วนสมบูรณ์ตลอดไป
- **หมดปัญหาชนรหัส (Zero Collision Errors):**
  - การแก้ไขหรือย้ายตำแหน่งครุภัณฑ์คือการบันทึกสถานะถัดไปของครุภัณฑ์ชิ้นนั้นลงสมุดบันทึก จึงไม่มีข้อผิดพลาดรหัสชนกับตนเองอีกต่อไป

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Next.js 15.5](https://nextjs.org/) (App Router, Server & Client Components) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) (Strict Mode) |
| **UI & Styling** | [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) |
| **Database & SDK** | [Google Sheets API v4](https://developers.google.com/sheets/api), [`googleapis`](https://www.npmjs.com/package/googleapis), [`google-auth-library`](https://www.npmjs.com/package/google-auth-library) |
| **Testing** | [Vitest](https://vitest.dev/) (Unit & API Integration Tests) |
| **Deployment** | [Vercel](https://vercel.com/) (Serverless Next.js Hosting) |

---

## สถาปัตยกรรมระบบ (System Architecture)

```
┌─────────────────────────────────────────────────────────────┐
│                       Browser / Client                      │
│   - Next.js Client Dashboard (`src/app/page.tsx`)           │
│   - RecordTable, RecordModal, DeleteDialog, SetupBanner     │
│   - LogHistoryModal (Audit Trail Timeline & Diff Viewer)    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               │ Fetch HTTP / JSON
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Next.js API Route Handlers                  │
│   - `GET /api/records`        - List all asset records      │
│   - `POST /api/records`       - Create asset record         │
│   - `GET /api/records/[id]`   - Get single asset record     │
│   - `PUT /api/records/[id]`   - Update asset record         │
│   - `DELETE /api/records/[id]`- Delete asset record         │
│   - `GET /api/logs`           - Audit trail (?assetCode=..) │
│   - `GET /api/status`         - Health / credential status  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               Service Layer (`src/lib/sheets.ts`)           │
│   - Dual-Sheet Auto-Initialization (`Assets!A:J`, `Logs!A:K`)│
│   - Row Index Mapping via Persistent UUID                   │
│   - Diff Engine (`computeAssetDiff` in `log-utils.ts`)      │
│   - Input Validation & Asset Status Normalization           │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
     [If configured]                [If unconfigured]
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      Google Sheets API       │ │    In-Memory Demo Store    │
│  - Tab 1: Current Assets     │ │  - Demo Asset Records      │
│  - Tab 2: Logs (Audit Trail) │ │  - Demo Audit Logs Store   │
└──────────────────────────────┘ └────────────────────────────┘
```

---

## เวิร์กโฟลว์บันทึกและติดตามตำแหน่งครุภัณฑ์แบบรวมศูนย์ (Unified Asset Tracking Workflow)

ระบบได้รับการออกแบบให้เจ้าหน้าที่สามารถเดินตรวจนับ ย้ายตำแหน่ง หรือลงทะเบียนครุภัณฑ์ได้อย่างรวดเร็วและราบรื่นผ่านหน้าจอเดียว (**Single Unified Dialog**) โดยไม่ต้องสลับเมนูไปมาระหว่างหน้า "สร้างใหม่" และ "แก้ไข":

```
                  ┌──────────────────────────────────────────────┐
                  │    คลิก "+ บันทึกหรือเปลี่ยนแปลงครุภัณฑ์"    │
                  └──────────────────────┬───────────────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
       [สแกนด้วยกล้องมือถือ]                       [พิมพ์รหัส / เลือกจากลิสต์]
  คลิกปุ่มกล้อง ➔ เปิด QrScannerModal           พิมพ์รหัส หรือเลือกจาก `<datalist>`
  (Rear camera ➔ Fallback ➔ Auto-trim)          (ตรวจจับทันทีแบบ Case-Insensitive)
                   │                                           │
                   └─────────────────────┬─────────────────────┘
                                         ▼
                        ┌─────────────────────────────────┐
                        │   ตรวจพบรหัสในระบบหรือไม่ ?    │
                        └────────┬───────────────┬────────┘
                                 │               │
             [พบรหัสเดิมในระบบ]  │               │  [รหัสใหม่ ยังไม่มีในระบบ]
                                 ▼               ▼
          ┌──────────────────────────────┐ ┌──────────────────────────────┐
          │ แถบเขียว: ✓ พบครุภัณฑ์เดิม   │ │ แถบส้ม: ✦ รหัสนี้ยังไม่มี   │
          │ - ดึงชื่อและสเปกเดิมอัตโนมัติ│ │ - เปิดให้กรอกชื่อครุภัณฑ์    │
          │ - แสดงตำแหน่งและผู้ดูแลเดิม │ │ - ระบุสถานที่, ผู้รับผิดชอบ  │
          │ - ปุ่ม "📜 ดูประวัติการเปลี่ │ │   สถานะ และผู้บันทึก         │
          │   ยนแปลง" พรีวิวไทม์ไลน์ทันที│ └──────────────┬───────────────┘
          └──────────────┬───────────────┘                │
                         │                                │
                         ▼                                ▼
          ┌──────────────────────────────────────────────────────────────┐
          │             กดปุ่ม "บันทึกข้อมูล" (Unified Save)              │
          │  - พบรหัสเดิม: PUT /api/records/[id] (อัปเดตและบันทึก Diff)  │
          │  - รหัสใหม่:  POST /api/records (สร้างและลงทะเบียนในชีต)      │
          │  - Reconciliation อัปเดตแถวในตารางหน้าจอทันทีโดยไม่ต้องรีโหลด │
          └──────────────────────────────────────────────────────────────┘
```

### 1. การสแกน QR Code ด้วยกล้องอุปกรณ์ (Mobile QR Camera Scanner)
- รองรับกล้องมือถือ/แท็บเล็ตและเว็บแคมคอมพิวเตอร์ผ่านไลบรารี [`html5-qrcode`](https://www.npmjs.com/package/html5-qrcode)
- ทำงานด้วยกลยุทธ์ **Camera Cascading Fallback**:
  1. พยายามเปิดกล้องหลัง (`facingMode: 'environment'`) เพื่อความสะดวกในการส่องป้ายครุภัณฑ์
  2. หากเปิดไม่ได้ จะสลับไปยังกล้องหน้า (`facingMode: 'user'`)
  3. หากยังเปิดไม่ได้ จะดึงรายการวิดีโอดีไวซ์ทั้งหมด (`Html5Qrcode.getCameras()`) และเลือกตัวแรกที่พร้อมใช้งาน
  4. หากอุปกรณ์ไม่มีกล้องหรือปฏิเสธการเข้าถึง จะแสดงข้อความแจ้งเตือนภาษาไทยพร้อมปุ่ม "พิมพ์รหัสด้วยตนเอง"
- ตัวกรอง Payload (`cleanQrPayload`): ตัดช่องว่างและการขึ้นบรรทัดใหม่อัตโนมัติ ป้องกันปัญหารหัสคลาดเคลื่อน
- จัดการวงจรชีวิตการทำงานอย่างรัดกุม (`isMounted` Guard): ปิดกล้องและปลดทรัพยากรทันทีเมื่อปิดหน้าต่าง ป้องกันปัญหากล้องค้าง

### 2. วงจรการค้นหาและ Pre-Fill อัตโนมัติ (Reactive Lookup Lifecycle)
- **Autocomplete Suggestions**: ช่องกรอกรหัสครุภัณฑ์เชื่อมต่อกับ `<datalist id="asset-codes-list">` แสดงรหัสและชื่อครุภัณฑ์ที่มีอยู่แล้วในระบบ ช่วยลดความผิดพลาดในการพิมพ์
- **Real-Time Code Lookup (`findAssetByCode`)**: ตรวจสอบทันทีที่ผู้ใช้พิมพ์หรือสแกนเสร็จ โดยไม่แยกตัวพิมพ์เล็ก-ใหญ่ (Case-Insensitive) และตัดช่องว่างหน้า-หลัง
- **สถานะที่ 1: ตรวจพบครุภัณฑ์เดิม (Existing Asset Matched)**
  - แสดงแบนเนอร์สีเขียว `✓ พบครุภัณฑ์เดิมในระบบ`
  - แสดงตำแหน่งเดิมและผู้ดูแลเดิมให้เห็นชัดเจน
  - ล็อกช่องชื่อครุภัณฑ์ (`name`) เพื่อป้องกันการเปลี่ยนชื่อโดยไม่ตั้งใจ (ชื่อจะถูกดึงมาจากระบบอัตโนมัติ)
  - ผู้ใช้เพียงแค่แก้ไขตำแหน่งใหม่ (`location`), ผู้รับผิดชอบใหม่, สถานะใหม่ หรือหมายเหตุ แล้วกดบันทึก
- **สถานะที่ 2: รหัสใหม่ (New Asset Registration)**
  - แสดงแบนเนอร์สีส้ม `✦ รหัสนี้ยังไม่มีในระบบ (ลงทะเบียนใหม่)`
  - ปลดล็อกช่องชื่อครุภัณฑ์ (`name`) เพื่อให้เจ้าหน้าที่กรอกชื่ออุปกรณ์สำหรับลงทะเบียนใหม่

### 3. ดูประวัติไทม์ไลน์ในคลิกเดียว (1-Click Historical Timeline Preview)
- เมื่อรหัสครุภัณฑ์ตรงกับรายการเดิม จะมีปุ่ม **"📜 ดูประวัติการเปลี่ยนแปลง"** ปรากฏขึ้นในแบนเนอร์สีเขียวทันที
- คลิกแล้วระบบจะเปิดหน้าต่าง `LogHistoryModal` เจาะจงเฉพาะประวัติของครุภัณฑ์ชิ้นนั้น โดยไม่ต้องปิดหน้าต่างบันทึกหรือย้ายหน้าจอ
- ช่วยให้ผู้ตรวจนับสามารถตรวจสอบย้อนหลังได้ทันทีว่า "ครุภัณฑ์นี้ย้ายมาจากห้องไหน ใครเป็นผู้ย้ายครั้งก่อนหน้า" ก่อนตัดสินใจบันทึกตำแหน่งใหม่

### 4. การคุ้มครองความถูกต้องของข้อมูล (Uniqueness & Upsert Semantics)
- **Idempotent Create (`POST /api/records`)**:
  - เมื่อผู้ใช้ส่งข้อมูลสร้างใหม่ หากรหัสครุภัณฑ์ (`assetCode`) มีอยู่ในระบบอยู่แล้ว ระบบจะแปลงเป็นการอัปเดตข้อมูลของชิ้นเดิม (Upsert) และบันทึกประวัติการเปลี่ยนแปลงลง `Logs` แทนที่จะสร้างแถวซ้ำซ้อน
- **Collision Protection (`PUT /api/records/[id]`)**:
  - ป้องกันกรณีผู้ใช้แก้ไขรหัสครุภัณฑ์ของรายการหนึ่ง ไปตรงกับรหัสครุภัณฑ์ของอีกรายการหนึ่งในระบบ ระบบจะปฏิเสธการบันทึกพร้อมตอบกลับ `409 Conflict` เพื่อรักษาความสมบูรณ์ของข้อมูล
- **Optimistic Table Reconciliation (`reconcileAssetRecords`)**:
  - เมื่อบันทึกสำเร็จ ไม่ว่าจะสร้างใหม่หรืออัปเดต ระบบจะอัปเดต State ตารางบนหน้าจอทันทีโดยไม่ต้อง Fetch ข้อมูลทั้งหมดใหม่ (Replaces in-place หรือ Prepends ด้านบนสุด) ทำให้การตอบสนองรวดเร็วและราบรื่น

---

## เริ่มต้นใช้งาน (Quickstart Guide)

### 1. ความต้องการของระบบ (Prerequisites)
- **Node.js** >= 18.18.0
- **npm** >= 9.0.0

### 2. ติดตั้งโปรเจกต์ (Clone & Install)

```bash
git clone https://github.com/PB-DE/test_crud.git
cd test_crud
npm install
```

### 3. รันในโหมดสาธิต (Demo Mode)

ทดลองใช้งานระบบได้ทันทีโดยไม่ต้องตั้งค่า Google Credentials:

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) ในเบราว์เซอร์ของคุณ แอปพลิเคชันจะทำงานบน In-Memory Demo Store พร้อมข้อมูลตัวอย่างครุภัณฑ์ภาษาไทย

### 4. เชื่อมต่อกับ Google Sheets

เมื่อต้องการใช้งานจริงกับ Google Sheets:

1. ปฏิบัติตามขั้นตอนใน [Google Sheets Setup Guide](docs/GOOGLE_SHEETS_SETUP.md) เพื่อสร้าง Service Account ใน Google Cloud Console และแชร์สิทธิ์ชีต
2. สร้างไฟล์คอนฟิก `.env.local`:

```bash
cp .env.example .env.local
```

3. ระบุค่าใน `.env.local`:

```bash
GOOGLE_SHEET_ID="your_google_sheet_id_here"
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account@your-project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvg...=\n-----END PRIVATE KEY-----\n"
```

4. รีสตาร์ตเซิร์ฟเวอร์ (`npm run dev`) แบนเนอร์ Demo จะหายไป และข้อมูลทั้งหมดจะถูกบันทึกลง Google Sheets ทันที

---

## ตัวแปรสภาพแวดล้อม (Environment Variables)

| Variable | Description | Required | Example |
| :--- | :--- | :---: | :--- |
| `GOOGLE_SHEET_ID` | รหัส Spreadsheet ID ที่ได้จาก URL ของ Google Sheet | Yes | `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | อีเมลของ Service Account จาก Google Cloud Console | Yes | `sheets-worker@app.iam.gserviceaccount.com` |
| `GOOGLE_PRIVATE_KEY` | Private Key ของ Service Account ในรูปแบบ PEM (รองรับทั้ง `\n` หรือขึ้นบรรทัดจริง) | Yes | `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"` |
| `GOOGLE_DRIVE_FOLDER_ID` | รหัส Folder ID หรือ URL โฟลเดอร์บน Google Drive สำหรับเก็บรูปภาพ (ดูคู่มือ [Google Drive Setup](docs/google-drive-setup.md)) | Optional | `1A2b3C4d5E6f7G8h9I0jKlMnOpQrStUvW` |

> [!NOTE]
> ตัวแปรสภาพแวดล้อมทั้งหมดถูกเรียกใช้ผ่าน Server-Side API Routes เท่านั้น จะไม่ถูกเปิดเผยไปยัง Client Browser อย่างเด็ดขาด

---

## โครงสร้างโปรเจกต์ (Project Structure)

```
.
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── logs/
│   │   │   │   └── route.ts            # GET /api/logs (audit logs & ?assetCode filter)
│   │   │   ├── records/
│   │   │   │   ├── route.ts            # GET /api/records, POST /api/records
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts        # GET, PUT, DELETE /api/records/[id]
│   │   │   ├── status/
│   │   │   │   └── route.ts            # GET /api/status (connection health)
│   │   │   └── upload/
│   │   │       └── route.ts            # POST /api/upload (camera & gallery image upload to Google Drive)
│   │   ├── globals.css                 # Tailwind directives & styles
│   │   ├── layout.tsx                  # Root layout & HTML shell
│   │   └── page.tsx                    # Main interactive Asset Tracking dashboard
│   ├── components/
│   │   ├── DeleteDialog.tsx            # Confirmation modal for asset deletion
│   │   ├── LogHistoryModal.tsx         # Audit Trail timeline modal & diff viewer
│   │   ├── QrScannerModal.tsx          # Mobile camera QR scanner with fallback (html5-qrcode)
│   │   ├── RecordModal.tsx             # Unified Create & Update asset modal with reactive lookup
│   │   ├── RecordTable.tsx             # Responsive data table with search, tabs & history trigger
│   │   ├── SetupBanner.tsx             # Helper banner for Demo Mode / setup instructions
│   │   └── Toast.tsx                   # Toast notification alerts
│   └── lib/
│       ├── env.ts                      # Environment loader with newline normalization
│       ├── filter-utils.ts             # Search, status tab filter, log filtering & sorting
│       ├── log-utils.ts                # Diff computation engine (computeAssetDiff)
│       ├── sheets.ts                   # Google Sheets dual-sheet service layer & demo fallback
│       ├── types.ts                    # AssetRecord & AssetLogRecord models, validators
│       ├── ui-helpers.ts               # Unified UI utilities (findAssetByCode, reconcileAssetRecords, cleanQrPayload)
│       └── utils.ts                    # Tailwind CSS class merging utilities
├── docs/
│   ├── GOOGLE_SHEETS_SETUP.md          # Step-by-step Google Cloud & Sheets setup guide
│   └── VERCEL_DEPLOYMENT.md            # Step-by-step Vercel deployment walkthrough
├── tests/
│   ├── api.test.ts                     # API endpoint route tests (CRUD, logs & validation)
│   ├── env.test.ts                     # Environment loader tests
│   ├── log-utils.test.ts               # Change detection & diff engine tests
│   ├── qr-scanner.test.ts              # QR scanner component, camera fallbacks & payload tests
│   ├── sheets.test.ts                  # Google Sheets dual-sheet service layer tests
│   ├── types.test.ts                   # Type definition & status validation tests
│   └── ui-helpers.test.ts              # Filter, search, log filtering & UI helper tests
├── .env.example                        # Template for environment variables
├── .gitignore                          # Strict gitignore protecting keys and secrets
├── next.config.ts                      # Next.js configuration
├── package.json                        # Project dependencies and npm scripts
├── tailwind.config.ts                  # Tailwind CSS styling configuration
├── tsconfig.json                       # TypeScript compiler options (strict mode)
└── vitest.config.ts                    # Vitest test runner configuration
```

---

## ข้อมูลจำเพาะ API (API Reference)

ทุก Endpoint ส่งกลับข้อมูลในรูปแบบ JSON พร้อม HTTP Status Codes ตามมาตรฐาน

### รายการ Endpoints

| Method | Endpoint | Description | Query Parameters | Success Code |
| :--- | :--- | :--- | :--- | :---: |
| `GET` | `/api/status` | ตรวจสอบสถานะการเชื่อมต่อกับ Google Sheets | - | `200 OK` |
| `GET` | `/api/records` | เรียกดูรายการครุภัณฑ์ทั้งหมด | - | `200 OK` |
| `POST` | `/api/records` | สร้างรายการครุภัณฑ์ใหม่ (พร้อมบันทึกลง `Logs`) | - | `201 Created` |
| `GET` | `/api/records/[id]` | เรียกดูข้อมูลครุภัณฑ์รายชิ้นตาม ID | - | `200 OK` |
| `PUT` | `/api/records/[id]` | แก้ไขข้อมูลครุภัณฑ์ (คำนวณ diff บันทึกลง `Logs`) | - | `200 OK` |
| `DELETE` | `/api/records/[id]` | ลบรายการครุภัณฑ์ออกจากระบบ (พร้อมบันทึกลง `Logs`) | - | `200 OK` |
| `GET` | `/api/logs` | เรียกดูประวัติการเปลี่ยนแปลงทั้งหมด | `assetCode` (optional) | `200 OK` |

### ตัวอย่าง Request และ Response

#### 1. `POST /api/records` (สร้างรายการครุภัณฑ์)

**Request Body:**
```json
{
  "assetCode": "EQ-2026-001",
  "name": "คอมพิวเตอร์ All-in-One Dell OptiPlex 7400",
  "location": "ฝ่ายเทคโนโลยีสารสนเทศ ชั้น 4",
  "status": "พร้อมใช้งาน",
  "responsiblePerson": "นายสมเกียรติ ยั่งยืน",
  "recordedBy": "นางสาววิไลลักษณ์ มั่นคง",
  "notes": "ติดตั้งชุดโปรแกรมสำนักงานและระบบความปลอดภัยครบถ้วน"
}
```

**Response (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "id": "rec-550e8400-e29b-41d4-a716-446655440000",
    "assetCode": "EQ-2026-001",
    "name": "คอมพิวเตอร์ All-in-One Dell OptiPlex 7400",
    "location": "ฝ่ายเทคโนโลยีสารสนเทศ ชั้น 4",
    "status": "พร้อมใช้งาน",
    "responsiblePerson": "นายสมเกียรติ ยั่งยืน",
    "recordedBy": "นางสาววิไลลักษณ์ มั่นคง",
    "notes": "ติดตั้งชุดโปรแกรมสำนักงานและระบบความปลอดภัยครบถ้วน",
    "createdAt": "2026-11-07T08:30:00.000Z",
    "updatedAt": "2026-11-07T08:30:00.000Z"
  }
}
```

#### 2. `PUT /api/records/[id]` (อัปเดตรายการครุภัณฑ์)

**Request Body:**
```json
{
  "location": "กองบริหารงานทั่วไป ชั้น 2",
  "status": "กำลังใช้งาน",
  "responsiblePerson": "นางสาวพัชรี นวลจันทร์",
  "notes": "ย้ายสถานที่ใช้งานชั่วคราวสำหรับโครงการจัดซื้อจัดจ้าง"
}
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": "rec-550e8400-e29b-41d4-a716-446655440000",
    "assetCode": "EQ-2026-001",
    "name": "คอมพิวเตอร์ All-in-One Dell OptiPlex 7400",
    "location": "กองบริหารงานทั่วไป ชั้น 2",
    "status": "กำลังใช้งาน",
    "responsiblePerson": "นางสาวพัชรี นวลจันทร์",
    "recordedBy": "นางสาววิไลลักษณ์ มั่นคง",
    "notes": "ย้ายสถานที่ใช้งานชั่วคราวสำหรับโครงการจัดซื้อจัดจ้าง",
    "createdAt": "2026-11-07T08:30:00.000Z",
    "updatedAt": "2026-11-07T09:15:00.000Z"
  }
}
```

#### 3. `DELETE /api/records/[id]` (ลบรายการครุภัณฑ์)

**Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Record deleted successfully"
}
```

#### 4. `GET /api/logs` (เรียกดูประวัติการเปลี่ยนแปลงทั้งหมด หรือกรองตามรหัสครุภัณฑ์)

**Query Parameters:**
- `assetCode` *(optional)*: รหัสครุภัณฑ์ที่ต้องการดูประวัติ เช่น `/api/logs?assetCode=EQ-2026-001` หากไม่ระบุจะคืนประวัติทั้งหมด

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": [
    {
      "id": "log-67890abc-1234-5678-90ab-cdef12345678",
      "timestamp": "2026-11-07T09:15:00.000Z",
      "action": "แก้ไข/ย้ายตำแหน่ง",
      "assetId": "rec-550e8400-e29b-41d4-a716-446655440000",
      "assetCode": "EQ-2026-001",
      "name": "คอมพิวเตอร์ All-in-One Dell OptiPlex 7400",
      "locationChange": "ฝ่ายเทคโนโลยีสารสนเทศ ชั้น 4 ➔ กองบริหารงานทั่วไป ชั้น 2",
      "responsibleChange": "นายสมเกียรติ ยั่งยืน ➔ นางสาวพัชรี นวลจันทร์",
      "statusChange": "พร้อมใช้งาน ➔ กำลังใช้งาน",
      "changeSummary": "ย้ายสถานที่, เปลี่ยนผู้รับผิดชอบ, เปลี่ยนสถานะ",
      "recordedBy": "นางสาววิไลลักษณ์ มั่นคง",
      "notes": "ย้ายสถานที่ใช้งานชั่วคราวสำหรับโครงการจัดซื้อจัดจ้าง"
    }
  ]
}
```

---

## การทดสอบและตรวจสอบคุณภาพ (Testing & Verification)

โปรเจกต์มีชุดทดสอบครอบคลุมทั้ง Service Layer, Data Models, UI Helpers และ Next.js API Routes ด้วย Vitest:

```bash
# รันการทดสอบทั้งหมด
npm test

# รันการทดสอบพร้อมรายงาน Coverage
npx vitest run --coverage

# ตรวจสอบการคอมไพล์ Production Build
npm run build
```

---

## การ Deploy สู่ Vercel (Vercel Deployment)

สามารถ Deploy ขึ้น Vercel ได้อย่างง่ายดายด้วย Serverless Function:
1. Push โค้ดขึ้น GitHub
2. Import repository เข้าสู่ [Vercel](https://vercel.com)
3. กำหนด Environment Variables: `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, และ `GOOGLE_PRIVATE_KEY`
4. กด **Deploy**

ดูขั้นตอนอย่างละเอียดได้ที่ [Vercel Deployment Guide](docs/VERCEL_DEPLOYMENT.md)

---

## ความปลอดภัย (Security & Best Practices)

- **แยกการประมวลผลไว้ฝั่งเซิร์ฟเวอร์:** Google API Client และ Private Key จะถูกเรียกใช้งานใน Route Handlers ฝั่งเซิร์ฟเวอร์เท่านั้น ไม่รั่วไหลไปยังเบราว์เซอร์
- **ปกป้องรหัสผ่านและคีย์:** ไฟล์ `.env*.local` ถูกกำหนดไว้ใน `.gitignore` อย่างเข้มงวด
- **Sanitized Error Details:** ดักจับข้อผิดพลาดและซ่อนข้อมูล credentials ภายใน ไม่ส่ง stack trace ละเอียดกลับไปยังผู้ใช้งานทั่วไป
- **สิทธิ์การเข้าถึงแบบ Least Privilege:** Service Account ต้องการสิทธิ์ Editor เฉพาะกับชีตที่ระบุเท่านั้น ไม่จำเป็นต้องมีสิทธิ์อื่นใน Google Cloud

---

## เอกสารคู่มือเพิ่มเติม (Documentation)

- [Google Sheets Setup Guide](docs/GOOGLE_SHEETS_SETUP.md) — คู่มือการสร้าง Service Account และตั้งค่าสิทธิ์ใน Google Sheets
- [Vercel Deployment Guide](docs/VERCEL_DEPLOYMENT.md) — คู่มือการ Deploy ขึ้น Vercel และการตั้งค่า Environment Variables แบบ Multiline

---

## License

MIT License.

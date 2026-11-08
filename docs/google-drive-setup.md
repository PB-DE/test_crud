# คู่มือการตั้งค่า Google Drive สำหรับจัดเก็บรูปภาพครุภัณฑ์

# (Google Drive Storage Setup Guide for Asset Tracking)

เอกสารนี้อธิบายขั้นตอนการตั้งค่า **Google Drive** เพื่อใช้เป็นฐานข้อมูลจัดเก็บไฟล์รูปภาพครุภัณฑ์ที่ถ่ายจากกล้องหรืออัปโหลดจากคลังภาพ โดยเชื่อมต่อผ่าน Google Service Account ที่มีอยู่แล้วในระบบ

---

## สรุปข้อมูล Service Account ของโปรเจกต์นี้

* **อีเมล Service Account:**
  ```text
  test-crud@test-crud-513908.iam.gserviceaccount.com
  ```
* **Google Cloud Project ID:**
  ```text
  test-crud-513908
  ```
* **ตัวแปรใน `.env.local` ที่ต้องเพิ่ม:**
  ```bash
  GOOGLE_DRIVE_FOLDER_ID="ใส่_FOLDER_ID_หรือ_URL_ของโฟลเดอร์ที่นี่"
  ```

---

## ขั้นตอนที่ 1: เปิดใช้งาน Google Drive API (Enable API)

ก่อนที่ Service Account จะสามารถอัปโหลดไฟล์ไปยัง Google Drive ได้ จะต้องเปิดใช้งาน **Google Drive API** ใน Google Cloud Console:

1. เข้าไปที่ [Google Cloud Console - APIs &amp; Services](https://console.cloud.google.com/apis/library/drive.googleapis.com?project=test-crud-513908)
2. ตรวจสอบว่าโปรเจกต์ด้านบนถูกเลือกเป็น **`test-crud-513908`**
3. ค้นหา **"Google Drive API"**
4. คลิกปุ่ม **"Enable" (เปิดใช้งาน)**

> **หมายเหตุ:** หากเปิดใช้งานอยู่แล้ว หน้านั้นจะแสดงสถานะเป็น *API Enabled* หรือมีปุ่ม *Manage*

---

## ขั้นตอนที่ 2: สร้างโฟลเดอร์สำหรับเก็บรูปใน Google Drive

1. เปิด [Google Drive](https://drive.google.com/) ของคุณ (ด้วยบัญชี Google ส่วนตัวหรือองค์กร)
2. คลิกปุ่ม **"+ ใหม่" (+ New)** ➔ เลือก **"โฟลเดอร์ใหม่" (New folder)**
3. ตั้งชื่อโฟลเดอร์ตามต้องการ เช่น:
   ```text
   DLT-Asset-Photos
   ```
4. กด **"สร้าง" (Create)**

---

## ขั้นตอนที่ 3: แชร์โฟลเดอร์ให้ Service Account (สิทธิ์ผู้แก้ไข / Editor)

ขั้นตอนนี้สำคัญที่สุด เพราะ Service Account จะไม่สามารถอัปโหลดไฟล์เข้าโฟลเดอร์ของคุณได้หากไม่ได้รับสิทธิ์:

1. คลิกขวาที่โฟลเดอร์ที่เพิ่งสร้าง (เช่น `DLT-Asset-Photos`)
2. เลือก **"แชร์" (Share)** ➔ คลิก **"แชร์" (Share)**
3. ในช่อง "เพิ่มบุคคลและกลุ่ม" ให้ใส่อีเมล Service Account:
   ```text
   test-crud@test-crud-513908.iam.gserviceaccount.com
   ```
4. กำหนดบทบาทเป็น **"ผู้แก้ไข" (Editor)**
5. **ยกเลิกติ๊กถูก** ที่ช่อง "แจ้งเตือนบุคคลอื่น" (Notify people) — เนื่องจาก Service Account ไม่มีกล่องจดหมายจริง
6. กดปุ่ม **"แชร์" (Share)** หรือ **"ส่ง" (Send)**

```
┌────────────────────────────────────────────────────────────────────────┐
│  แชร์ "DLT-Asset-Photos"                                              │
│                                                                        │
│  เพิ่มบุคคลและกลุ่ม:                                                   │
│  [ test-crud@test-crud-513908.iam.gserviceaccount.com ]   [ ผู้แก้ไข ▼ ] │
│                                                                        │
│  [ ] แจ้งเตือนบุคคลอื่น                                                 │
│                                                                        │
│                                             [ ยกเลิก ]  [ แชร์ / ส่ง ] │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ขั้นตอนที่ 4: คัดลอก Folder ID หรือ Folder URL

1. ดับเบิลคลิกเปิดเข้าไปในโฟลเดอร์ `DLT-Asset-Photos`
2. ดูที่แถบที่อยู่ (URL Bar) ของเบราว์เซอร์ จะมีรูปแบบดังนี้:
   ```text
   https://drive.google.com/drive/folders/1A2b3C4d5E6f7G8h9I0jKlMnOpQrStUvW
   ```
3. รหัสตัวอักษรภาษาอังกฤษและตัวเลขหลัง `/folders/` คือ **Folder ID**:
   * ตัวอย่าง Folder ID: `1A2b3C4d5E6f7G8h9I0jKlMnOpQrStUvW`

> **ระบบรองรับทั้งสองแบบ:** คุณสามารถคัดลอก **URL เต็ม** หรือเฉพาะ **Folder ID** มาใส่ในระบบก็ได้ ระบบจะแปลงค่าให้อัตโนมัติ

---

## ขั้นตอนที่ 5: บันทึกค่าลงในไฟล์ `.env.local`

เปิดไฟล์ `.env.local` ในโปรเจกต์ แล้วเพิ่มบรรทัด `GOOGLE_DRIVE_FOLDER_ID` ดังตัวอย่าง:

```bash
# Google Sheets Database Configuration
GOOGLE_SHEET_ID="16iKFICKjxdpHAzcSZef1ZL8_eYFfMDljop-TiTotKlQ"
GOOGLE_SERVICE_ACCOUNT_EMAIL="test-crud@test-crud-513908.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Google Drive Storage Configuration (รูปภาพครุภัณฑ์)
GOOGLE_DRIVE_FOLDER_ID="1A2b3C4d5E6f7G8h9I0jKlMnOpQrStUvW"
```

---

## ขั้นตอนที่ 6: การทำงานของระบบเมื่อตั้งค่าเสร็จสิ้น

เมื่อมีการถ่ายภาพหรือเลือกรูปภาพครุภัณฑ์ในระบบ:

1. **การบันทึกภาพ:** ระบบจะส่งไฟล์รูปภาพขึ้นไปไว้ในโฟลเดอร์ Google Drive ดังกล่าว
2. **การตั้งชื่อไฟล์:** รูปจะถูกตั้งชื่ออย่างเป็นระบบ เช่น `EQ-2026-001_20261108_083500.jpg`
3. **การเข้าถึงรูปภาพ:** ระบบจะสร้าง Link อ้างอิง และบันทึกลง Google Sheets ในคอลัมน์ K (`รูปภาพ`)
4. **ความปลอดภัย:** หากไม่ได้ระบุ `GOOGLE_DRIVE_FOLDER_ID` ระบบจะสลับไปทำงานใน **Demo Mode** อัตโนมัติโดยไม่ทำให้ระบบล่ม

---

## คำถามที่พบบ่อยและข้อผิดพลาด (Troubleshooting)

| ปัญหา                                                            | สาเหตุ                                                                                                                        | วิธีแก้ไข                                                                                                                                        |
| :-------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Error: 404 File not found / Folder not found**                | ยังไม่ได้แชร์โฟลเดอร์ให้อีเมล Service Account หรือระบุ Folder ID ผิด                        | ตรวจสอบว่าแชร์โฟลเดอร์ให้ `test-crud@test-crud-513908.iam.gserviceaccount.com` เป็น Editor แล้วหรือยัง          |
| **Error: Google Drive API has not been used in project...**     | ยังไม่ได้กด Enable Google Drive API ใน Cloud Console                                                                   | เข้าไปกด Enable Google Drive API ใน [Cloud Console](https://console.cloud.google.com/apis/library/drive.googleapis.com?project=test-crud-513908) |
| **อัปโหลดรูปแล้วไม่ขึ้นใน Google Drive** | `.env.local` ยังไม่ได้ใส่ `GOOGLE_DRIVE_FOLDER_ID` หรือยังไม่ได้รีสตาร์ทเซิร์ฟเวอร์ | ใส่ตัวแปรใน `.env.local` แล้วรัน `npm run dev` ใหม่                                                                             |

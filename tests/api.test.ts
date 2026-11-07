import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GET as getRecords, POST as postRecord } from '../src/app/api/records/route';
import {
  GET as getRecordById,
  PUT as putRecord,
  DELETE as deleteRecord,
} from '../src/app/api/records/[id]/route';
import { GET as getLogs } from '../src/app/api/logs/route';
import { GET as getStatus } from '../src/app/api/status/route';
import { sheetsService } from '../src/lib/sheets';
import * as envModule from '../src/lib/env';

describe('API Route Handlers', () => {
  beforeEach(() => {
    sheetsService.resetDemoStore();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/records', () => {
    it('returns all records with status 200', async () => {
      const req = new Request('http://localhost:3000/api/records', {
        method: 'GET',
      });

      const res = await getRecords(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
      expect(json.data[0]).toHaveProperty('assetCode');
      expect(json.data[0]).toHaveProperty('responsiblePerson');
      expect(json.data[0]).toHaveProperty('recordedBy');
    });

    it('returns status 500 when fetching records fails', async () => {
      vi.spyOn(sheetsService, 'getRecords').mockRejectedValueOnce(
        new Error('Database error')
      );

      const req = new Request('http://localhost:3000/api/records', {
        method: 'GET',
      });

      const res = await getRecords(req);
      expect(res.status).toBe(500);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Failed to fetch records');
      expect(json.details).toBe('Database error');
    });
  });

  describe('POST /api/records', () => {
    it('rejects POST with missing name with status 400', async () => {
      const req = new Request('http://localhost:3000/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetCode: 'EQ-2026-005',
          name: '',
          location: 'ห้องประชุม 1',
          responsiblePerson: 'นายสมชาย',
          recordedBy: 'นางสมหญิง',
        }),
      });

      const res = await postRecord(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/name/i);
    });

    it('rejects POST with missing assetCode with status 400', async () => {
      const req = new Request('http://localhost:3000/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetCode: '   ',
          name: 'เครื่องสแกนบาร์โค้ด',
          location: 'ห้องพัสดุ',
          responsiblePerson: 'นายสมชาย',
          recordedBy: 'นางสมหญิง',
        }),
      });

      const res = await postRecord(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/asset code/i);
    });

    it('rejects POST with missing location with status 400', async () => {
      const req = new Request('http://localhost:3000/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetCode: 'EQ-2026-005',
          name: 'เครื่องสแกนบาร์โค้ด',
          location: '',
          responsiblePerson: 'นายสมชาย',
          recordedBy: 'นางสมหญิง',
        }),
      });

      const res = await postRecord(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/location/i);
    });

    it('rejects POST with missing responsiblePerson with status 400', async () => {
      const req = new Request('http://localhost:3000/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetCode: 'EQ-2026-005',
          name: 'เครื่องสแกนบาร์โค้ด',
          location: 'ห้องพัสดุ',
          responsiblePerson: '  ',
          recordedBy: 'นางสมหญิง',
        }),
      });

      const res = await postRecord(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/responsible person/i);
    });

    it('rejects POST with missing recordedBy with status 400', async () => {
      const req = new Request('http://localhost:3000/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetCode: 'EQ-2026-005',
          name: 'เครื่องสแกนบาร์โค้ด',
          location: 'ห้องพัสดุ',
          responsiblePerson: 'นายสมชาย',
          recordedBy: '',
        }),
      });

      const res = await postRecord(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/recorded by/i);
    });

    it('rejects POST with invalid status with status 400', async () => {
      const req = new Request('http://localhost:3000/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetCode: 'EQ-2026-005',
          name: 'เครื่องสแกนบาร์โค้ด',
          location: 'ห้องพัสดุ',
          responsiblePerson: 'นายสมชาย',
          recordedBy: 'นางสมหญิง',
          status: 'UnknownStatus',
        }),
      });

      const res = await postRecord(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/status/i);
    });

    it('rejects malformed JSON body with status 400', async () => {
      const req = new Request('http://localhost:3000/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json string{',
      });

      const res = await postRecord(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/invalid.*body/i);
    });

    it('creates and returns a new record with status 201', async () => {
      const req = new Request('http://localhost:3000/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetCode: 'EQ-2026-099',
          name: 'โปรเจคเตอร์ Epson EB-X51',
          location: 'ห้องประชุม 1 ชั้น 3',
          status: 'พร้อมใช้งาน',
          responsiblePerson: 'นายประสิทธิ์ สุขใจ',
          recordedBy: 'นางสาววิไลลักษณ์ มั่นคง',
          notes: 'ติดตั้งพร้อมรีโมตและสาย HDMI',
        }),
      });

      const res = await postRecord(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBeDefined();
      expect(json.data.assetCode).toBe('EQ-2026-099');
      expect(json.data.name).toBe('โปรเจคเตอร์ Epson EB-X51');
      expect(json.data.location).toBe('ห้องประชุม 1 ชั้น 3');
      expect(json.data.status).toBe('พร้อมใช้งาน');
      expect(json.data.responsiblePerson).toBe('นายประสิทธิ์ สุขใจ');
      expect(json.data.recordedBy).toBe('นางสาววิไลลักษณ์ มั่นคง');
      expect(json.data.notes).toBe('ติดตั้งพร้อมรีโมตและสาย HDMI');
    });

    it('defaults status to พร้อมใช้งาน when omitted in POST with status 201', async () => {
      const req = new Request('http://localhost:3000/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetCode: 'EQ-2026-100',
          name: 'ชุดเครื่องเสียงพกพา',
          location: 'ห้องโสตฯ ชั้น 1',
          responsiblePerson: 'นายกิตติศักดิ์ ชำนาญ',
          recordedBy: 'นายวีระ ศักดิ์ศรี',
        }),
      });

      const res = await postRecord(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe('พร้อมใช้งาน');
      expect(json.data.notes).toBe('');
    });

    it('returns status 500 when creation fails', async () => {
      vi.spyOn(sheetsService, 'createRecord').mockRejectedValueOnce(
        new Error('Google API Error')
      );

      const req = new Request('http://localhost:3000/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetCode: 'EQ-2026-101',
          name: 'โทรทัศน์ Smart TV 65 นิ้ว',
          location: 'ห้องประชุมใหญ่',
          responsiblePerson: 'นายอดิศักดิ์',
          recordedBy: 'นางกมลวรรณ',
        }),
      });

      const res = await postRecord(req);
      expect(res.status).toBe(500);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Failed to create record');
      expect(json.details).toBe('Google API Error');
    });

    it('updates existing record when assetCode matches case-insensitively via POST', async () => {
      const existing = await sheetsService.createRecord({
        assetCode: 'EQ-POST-UPSERT',
        name: 'Original Monitor',
        location: 'Room 101',
        status: 'พร้อมใช้งาน',
        responsiblePerson: 'User A',
        recordedBy: 'Admin',
      });

      const req = new Request('http://localhost:3000/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetCode: '  eq-post-upsert  ',
          name: 'Original Monitor',
          location: 'Room 202',
          status: 'กำลังใช้งาน',
          responsiblePerson: 'User B',
          recordedBy: 'Admin',
        }),
      });

      const res = await postRecord(req);
      expect([200, 201]).toContain(res.status);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe(existing.id);
      expect(json.data.location).toBe('Room 202');
      expect(json.data.responsiblePerson).toBe('User B');
    });
  });

  describe('GET /api/records/[id]', () => {
    it('returns a record by id with status 200', async () => {
      const req = new Request('http://localhost:3000/api/records/rec-demo-001', {
        method: 'GET',
      });

      const res = await getRecordById(req, {
        params: Promise.resolve({ id: 'rec-demo-001' }),
      });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe('rec-demo-001');
      expect(json.data.name).toBe('คอมพิวเตอร์ All-in-One Dell OptiPlex 7400');
      expect(json.data.assetCode).toBe('EQ-2026-001');
      expect(json.data.status).toBe('พร้อมใช้งาน');
    });

    it('returns 404 when record is not found', async () => {
      const req = new Request('http://localhost:3000/api/records/non-existent', {
        method: 'GET',
      });

      const res = await getRecordById(req, {
        params: Promise.resolve({ id: 'non-existent' }),
      });
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/not found/i);
    });

    it('returns status 500 when fetching single record fails', async () => {
      vi.spyOn(sheetsService, 'getRecordById').mockRejectedValueOnce(
        new Error('Network failure')
      );

      const req = new Request('http://localhost:3000/api/records/rec-demo-001', {
        method: 'GET',
      });

      const res = await getRecordById(req, {
        params: Promise.resolve({ id: 'rec-demo-001' }),
      });
      expect(res.status).toBe(500);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Failed to fetch record');
      expect(json.details).toBe('Network failure');
    });
  });

  describe('PUT /api/records/[id]', () => {
    it('updates record and returns updated item with status 200', async () => {
      const req = new Request('http://localhost:3000/api/records/rec-demo-001', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'ฝ่ายเทคโนโลยีสารสนเทศ ชั้น 5',
          status: 'กำลังใช้งาน',
          responsiblePerson: 'นายสมเกียรติ ยั่งยืน (หัวหน้าฝ่าย)',
          notes: 'ย้ายจุดติดตั้งไปยังโต๊ะทำงานใหม่',
        }),
      });

      const res = await putRecord(req, {
        params: Promise.resolve({ id: 'rec-demo-001' }),
      });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.location).toBe('ฝ่ายเทคโนโลยีสารสนเทศ ชั้น 5');
      expect(json.data.status).toBe('กำลังใช้งาน');
      expect(json.data.responsiblePerson).toBe('นายสมเกียรติ ยั่งยืน (หัวหน้าฝ่าย)');
      expect(json.data.notes).toBe('ย้ายจุดติดตั้งไปยังโต๊ะทำงานใหม่');
    });

    it('rejects PUT with invalid status with status 400', async () => {
      const req = new Request('http://localhost:3000/api/records/rec-demo-001', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'BadStatus',
        }),
      });

      const res = await putRecord(req, {
        params: Promise.resolve({ id: 'rec-demo-001' }),
      });
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/status/i);
    });

    it('rejects PUT with empty name with status 400', async () => {
      const req = new Request('http://localhost:3000/api/records/rec-demo-001', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '   ',
        }),
      });

      const res = await putRecord(req, {
        params: Promise.resolve({ id: 'rec-demo-001' }),
      });
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/name/i);
    });

    it('rejects PUT with empty assetCode with status 400', async () => {
      const req = new Request('http://localhost:3000/api/records/rec-demo-001', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetCode: '   ',
        }),
      });

      const res = await putRecord(req, {
        params: Promise.resolve({ id: 'rec-demo-001' }),
      });
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/asset code/i);
    });

    it('rejects PUT with empty location with status 400', async () => {
      const req = new Request('http://localhost:3000/api/records/rec-demo-001', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: '',
        }),
      });

      const res = await putRecord(req, {
        params: Promise.resolve({ id: 'rec-demo-001' }),
      });
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/location/i);
    });

    it('rejects PUT with empty responsiblePerson with status 400', async () => {
      const req = new Request('http://localhost:3000/api/records/rec-demo-001', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responsiblePerson: '  ',
        }),
      });

      const res = await putRecord(req, {
        params: Promise.resolve({ id: 'rec-demo-001' }),
      });
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/responsible person/i);
    });

    it('rejects PUT with empty recordedBy with status 400', async () => {
      const req = new Request('http://localhost:3000/api/records/rec-demo-001', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordedBy: '  ',
        }),
      });

      const res = await putRecord(req, {
        params: Promise.resolve({ id: 'rec-demo-001' }),
      });
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/recorded by/i);
    });

    it('rejects malformed JSON body on PUT with status 400', async () => {
      const req = new Request('http://localhost:3000/api/records/rec-demo-001', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: 'malformed json',
      });

      const res = await putRecord(req, {
        params: Promise.resolve({ id: 'rec-demo-001' }),
      });
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/invalid.*body/i);
    });

    it('returns 404 when updating non-existent record', async () => {
      const req = new Request('http://localhost:3000/api/records/non-existent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'พร้อมใช้งาน',
        }),
      });

      const res = await putRecord(req, {
        params: Promise.resolve({ id: 'non-existent' }),
      });
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/not found/i);
    });

    it('returns status 500 when update fails', async () => {
      vi.spyOn(sheetsService, 'updateRecord').mockRejectedValueOnce(
        new Error('Network error')
      );

      const req = new Request('http://localhost:3000/api/records/rec-demo-001', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'ห้องประชุม',
        }),
      });

      const res = await putRecord(req, {
        params: Promise.resolve({ id: 'rec-demo-001' }),
      });
      expect(res.status).toBe(500);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Failed to update record');
      expect(json.details).toBe('Network error');
    });

    it('returns 409 Conflict on assetCode collision during PUT', async () => {
      const item1 = await sheetsService.createRecord({
        assetCode: 'EQ-COLLIDE-A',
        name: 'Item A',
        location: 'Room A',
        status: 'พร้อมใช้งาน',
        responsiblePerson: 'Person A',
        recordedBy: 'Admin',
      });
      const item2 = await sheetsService.createRecord({
        assetCode: 'EQ-COLLIDE-B',
        name: 'Item B',
        location: 'Room B',
        status: 'พร้อมใช้งาน',
        responsiblePerson: 'Person B',
        recordedBy: 'Admin',
      });

      const req = new Request(`http://localhost:3000/api/records/${item2.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetCode: '  eq-collide-a  ',
          location: 'Room C',
        }),
      });

      const res = await putRecord(req, {
        params: Promise.resolve({ id: item2.id }),
      });

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/already exists/i);
    });

    it('allows updating record when assetCode is unchanged or differs only in case/whitespace', async () => {
      const item = await sheetsService.createRecord({
        assetCode: 'EQ-SAME-01',
        name: 'Same Item',
        location: 'Room 1',
        status: 'พร้อมใช้งาน',
        responsiblePerson: 'Person 1',
        recordedBy: 'Admin',
      });

      const req = new Request(`http://localhost:3000/api/records/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetCode: '  eq-same-01  ',
          location: 'Room 2',
        }),
      });

      const res = await putRecord(req, {
        params: Promise.resolve({ id: item.id }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe(item.id);
      expect(json.data.location).toBe('Room 2');
    });
  });

  describe('DELETE /api/records/[id]', () => {
    it('deletes record and returns status 200 with message', async () => {
      const req = new Request('http://localhost:3000/api/records/rec-demo-001', {
        method: 'DELETE',
      });

      const res = await deleteRecord(req, {
        params: Promise.resolve({ id: 'rec-demo-001' }),
      });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toMatch(/deleted successfully/i);

      // Verify deletion
      const check = await sheetsService.getRecordById('rec-demo-001');
      expect(check).toBeNull();
    });

    it('returns 404 when deleting non-existent record', async () => {
      const req = new Request('http://localhost:3000/api/records/non-existent', {
        method: 'DELETE',
      });

      const res = await deleteRecord(req, {
        params: Promise.resolve({ id: 'non-existent' }),
      });
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/not found/i);
    });

    it('returns status 500 when deletion fails', async () => {
      vi.spyOn(sheetsService, 'deleteRecord').mockRejectedValueOnce(
        new Error('Delete error')
      );

      const req = new Request('http://localhost:3000/api/records/rec-demo-001', {
        method: 'DELETE',
      });

      const res = await deleteRecord(req, {
        params: Promise.resolve({ id: 'rec-demo-001' }),
      });
      expect(res.status).toBe(500);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Failed to delete record');
      expect(json.details).toBe('Delete error');
    });
  });

  describe('GET /api/logs', () => {
    it('returns all logs with status 200', async () => {
      // Create records to generate audit logs
      const record1 = await sheetsService.createRecord({
        assetCode: 'EQ-LOG-TEST-1',
        name: 'ครุภัณฑ์ทดสอบ 1',
        location: 'ห้อง 101',
        status: 'พร้อมใช้งาน',
        responsiblePerson: 'ผู้รับผิดชอบ 1',
        recordedBy: 'ผู้บันทึก 1',
        notes: 'หมายเหตุ 1',
      });

      const record2 = await sheetsService.createRecord({
        assetCode: 'EQ-LOG-TEST-2',
        name: 'ครุภัณฑ์ทดสอบ 2',
        location: 'ห้อง 102',
        status: 'พร้อมใช้งาน',
        responsiblePerson: 'ผู้รับผิดชอบ 2',
        recordedBy: 'ผู้บันทึก 2',
        notes: 'หมายเหตุ 2',
      });

      const req = new Request('http://localhost:3000/api/logs', {
        method: 'GET',
      });

      const res = await getLogs(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(2);

      const codes = json.data.map((l: any) => l.assetCode);
      expect(codes).toContain('EQ-LOG-TEST-1');
      expect(codes).toContain('EQ-LOG-TEST-2');
    });

    it('filters logs by assetCode query parameter', async () => {
      await sheetsService.createRecord({
        assetCode: 'EQ-LOG-FILTER-CODE',
        name: 'ครุภัณฑ์กรองรหัส',
        location: 'ห้อง A',
        status: 'พร้อมใช้งาน',
        responsiblePerson: 'สมชาย',
        recordedBy: 'สมหญิง',
      });

      await sheetsService.createRecord({
        assetCode: 'EQ-LOG-OTHER-CODE',
        name: 'ครุภัณฑ์อื่น',
        location: 'ห้อง B',
        status: 'พร้อมใช้งาน',
        responsiblePerson: 'วิชัย',
        recordedBy: 'สมหญิง',
      });

      const req = new Request(
        'http://localhost:3000/api/logs?assetCode=EQ-LOG-FILTER-CODE',
        { method: 'GET' }
      );

      const res = await getLogs(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
      expect(json.data.every((l: any) => l.assetCode === 'EQ-LOG-FILTER-CODE')).toBe(true);
    });

    it('filters logs by assetId query parameter', async () => {
      const created = await sheetsService.createRecord({
        assetCode: 'EQ-LOG-FILTER-ID',
        name: 'ครุภัณฑ์กรองไอดี',
        location: 'ห้อง 501',
        status: 'พร้อมใช้งาน',
        responsiblePerson: 'สมชาย',
        recordedBy: 'สมหญิง',
      });

      await sheetsService.createRecord({
        assetCode: 'EQ-LOG-FILTER-ID-OTHER',
        name: 'ครุภัณฑ์ไอดีอื่น',
        location: 'ห้อง 502',
        status: 'พร้อมใช้งาน',
        responsiblePerson: 'วิชัย',
        recordedBy: 'สมหญิง',
      });

      const req = new Request(
        `http://localhost:3000/api/logs?assetId=${created.id}`,
        { method: 'GET' }
      );

      const res = await getLogs(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThan(0);
      expect(json.data.every((l: any) => l.assetId === created.id || l.assetCode === created.assetCode)).toBe(true);
    });

    it('treats whitespace-only or empty query parameters as undefined', async () => {
      await sheetsService.createRecord({
        assetCode: 'EQ-LOG-TRIM-1',
        name: 'ชิ้นที่ 1',
        location: 'ห้อง 1',
        status: 'พร้อมใช้งาน',
        responsiblePerson: 'สมชาย',
        recordedBy: 'สมหญิง',
      });

      const req = new Request(
        'http://localhost:3000/api/logs?assetId=%20%20&assetCode=',
        { method: 'GET' }
      );

      const res = await getLogs(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(1);
    });

    it('returns status 500 when fetching logs fails', async () => {
      vi.spyOn(sheetsService, 'getLogs').mockRejectedValueOnce(
        new Error('Google Sheets audit log error')
      );

      const req = new Request('http://localhost:3000/api/logs', {
        method: 'GET',
      });

      const res = await getLogs(req);
      expect(res.status).toBe(500);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Failed to fetch logs');
      expect(json.details).toBe('Google Sheets audit log error');
    });
  });

  describe('GET /api/status', () => {
    it('returns configured: false when credentials are not configured', async () => {
      vi.spyOn(envModule, 'getEnvConfig').mockReturnValueOnce({
        isConfigured: false,
      });

      const req = new Request('http://localhost:3000/api/status', {
        method: 'GET',
      });

      const res = await getStatus(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.configured).toBe(false);
      expect(json.sheetId).toBeUndefined();
    });

    it('returns configured: true and spreadsheetId when credentials are set', async () => {
      vi.spyOn(envModule, 'getEnvConfig').mockReturnValueOnce({
        spreadsheetId: 'sheet-xyz-123',
        clientEmail: 'svc@account.com',
        privateKey: 'key',
        isConfigured: true,
      });

      const req = new Request('http://localhost:3000/api/status', {
        method: 'GET',
      });

      const res = await getStatus(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.configured).toBe(true);
      expect(json.sheetId).toBe('sheet-xyz-123');
    });
  });
});

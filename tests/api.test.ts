import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GET as getRecords, POST as postRecord } from '../src/app/api/records/route';
import {
  GET as getRecordById,
  PUT as putRecord,
  DELETE as deleteRecord,
} from '../src/app/api/records/[id]/route';
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
    });
  });

  describe('POST /api/records', () => {
    it('rejects POST with missing required fields with status 400', async () => {
      const req = new Request('http://localhost:3000/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '' }),
      });

      const res = await postRecord(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBeDefined();
    });

    it('rejects POST with invalid email with status 400', async () => {
      const req = new Request('http://localhost:3000/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Jane Doe',
          email: 'invalid-email',
          role: 'Engineer',
        }),
      });

      const res = await postRecord(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/email/i);
    });

    it('rejects POST with invalid status with status 400', async () => {
      const req = new Request('http://localhost:3000/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Jane Doe',
          email: 'jane@example.com',
          role: 'Engineer',
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
          name: 'Sarah Connor',
          email: 'sarah@skynet.com',
          role: 'Security',
          status: 'Active',
          notes: 'Leader',
        }),
      });

      const res = await postRecord(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBeDefined();
      expect(json.data.name).toBe('Sarah Connor');
      expect(json.data.email).toBe('sarah@skynet.com');
      expect(json.data.role).toBe('Security');
      expect(json.data.status).toBe('Active');
      expect(json.data.notes).toBe('Leader');
    });

    it('defaults status to Pending when omitted in POST with status 201', async () => {
      const req = new Request('http://localhost:3000/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Kyle Reese',
          email: 'kyle@future.org',
          role: 'Soldier',
        }),
      });

      const res = await postRecord(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe('Pending');
    });

    it('returns status 500 when creation fails', async () => {
      vi.spyOn(sheetsService, 'createRecord').mockRejectedValueOnce(
        new Error('Google API Error')
      );

      const req = new Request('http://localhost:3000/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Sarah Connor',
          email: 'sarah@skynet.com',
          role: 'Security',
        }),
      });

      const res = await postRecord(req);
      expect(res.status).toBe(500);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Failed to create record');
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
      expect(json.data.name).toBe('Sarah Connor');
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
    });
  });

  describe('PUT /api/records/[id]', () => {
    it('updates record and returns updated item with status 200', async () => {
      const req = new Request('http://localhost:3000/api/records/rec-demo-001', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'Chief Security Officer',
          status: 'Active',
        }),
      });

      const res = await putRecord(req, {
        params: Promise.resolve({ id: 'rec-demo-001' }),
      });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.role).toBe('Chief Security Officer');
      expect(json.data.status).toBe('Active');
    });

    it('rejects PUT with invalid email with status 400', async () => {
      const req = new Request('http://localhost:3000/api/records/rec-demo-001', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email',
        }),
      });

      const res = await putRecord(req, {
        params: Promise.resolve({ id: 'rec-demo-001' }),
      });
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/email/i);
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
          status: 'Active',
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
          role: 'New Role',
        }),
      });

      const res = await putRecord(req, {
        params: Promise.resolve({ id: 'rec-demo-001' }),
      });
      expect(res.status).toBe(500);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Failed to update record');
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

import { describe, it, expect, beforeEach } from 'vitest';
import { GET, POST, PUT, DELETE } from '@/app/api/options/route';
import { sheetsService } from '@/lib/sheets';
import { DEFAULT_FIELD_SETTINGS } from '@/lib/types';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/session';

async function createRequest(url: string, method: string, body?: any) {
  const token = await createSessionToken({
    id: 'user-admin-default',
    username: 'admin',
    displayName: 'ผู้ดูแลระบบ (Admin)',
    role: 'admin',
  });
  const headers: Record<string, string> = {
    cookie: `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
  };
  if (body) headers['Content-Type'] = 'application/json';

  return new Request(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('/api/options API Route', () => {
  beforeEach(() => {
    sheetsService.resetDemoStore();
  });

  it('GET returns default options and fieldSettings', async () => {
    const res = await GET(await createRequest('http://localhost/api/options', 'GET'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data.options)).toBe(true);
    expect(json.data.options.length).toBeGreaterThan(0);
    expect(json.data.fieldSettings).toHaveLength(DEFAULT_FIELD_SETTINGS.length);
  });

  it('POST creates a new mainCategory option and linked subCategory option', async () => {
    const mainRes = await POST(
      await createRequest('http://localhost/api/options', 'POST', {
        fieldKey: 'mainCategory',
        value: 'ครุภัณฑ์วิทยาศาสตร์',
      })
    );
    const mainJson = await mainRes.json();
    expect(mainRes.status).toBe(201);
    expect(mainJson.success).toBe(true);
    expect(mainJson.data.fieldKey).toBe('mainCategory');
    expect(mainJson.data.value).toBe('ครุภัณฑ์วิทยาศาสตร์');

    const subRes = await POST(
      await createRequest('http://localhost/api/options', 'POST', {
        fieldKey: 'subCategory',
        value: 'กล้องจุลทรรศน์',
        parentValue: 'ครุภัณฑ์วิทยาศาสตร์',
      })
    );
    const subJson = await subRes.json();
    expect(subRes.status).toBe(201);
    expect(subJson.data.parentValue).toBe('ครุภัณฑ์วิทยาศาสตร์');
  });

  it('POST rejects subCategory without parentValue', async () => {
    const res = await POST(
      await createRequest('http://localhost/api/options', 'POST', {
        fieldKey: 'subCategory',
        value: 'รายการไร้สังกัด',
      })
    );
    expect(res.status).toBe(400);
  });

  it('PUT updates an existing mainCategory and cascades rename to linked subCategories', async () => {
    const opts = await sheetsService.getDropdownOptions();
    const targetMain = opts.find((o) => o.fieldKey === 'mainCategory' && o.value === 'ครุภัณฑ์สำนักงาน');
    expect(targetMain).toBeDefined();

    const res = await PUT(
      await createRequest('http://localhost/api/options', 'PUT', {
        id: targetMain!.id,
        value: 'ครุภัณฑ์สำนักงานทั่วไป',
      })
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.value).toBe('ครุภัณฑ์สำนักงานทั่วไป');

    const updatedOpts = await sheetsService.getDropdownOptions();
    const linkedSubs = updatedOpts.filter(
      (o) => o.fieldKey === 'subCategory' && o.parentValue === 'ครุภัณฑ์สำนักงานทั่วไป'
    );
    expect(linkedSubs.length).toBeGreaterThan(0);
  });

  it('PUT saves updated fieldSettings (required and useDropdown flags)', async () => {
    const customSettings = DEFAULT_FIELD_SETTINGS.map((s) =>
      s.fieldKey === 'budgetSource'
        ? { ...s, required: true, useDropdown: true }
        : s
    );

    const res = await PUT(
      await createRequest('http://localhost/api/options', 'PUT', {
        fieldSettings: customSettings,
      })
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    const updatedBudget = json.data.find((s: any) => s.fieldKey === 'budgetSource');
    expect(updatedBudget.required).toBe(true);
    expect(updatedBudget.useDropdown).toBe(true);
  });

  it('DELETE removes a dropdown option by id', async () => {
    const created = await sheetsService.createDropdownOption({
      fieldKey: 'location',
      value: 'ห้องทดสอบชั่วคราว',
    });

    const res = await DELETE(
      await createRequest(`http://localhost/api/options?id=${created.id}`, 'DELETE')
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    const remaining = await sheetsService.getDropdownOptions();
    expect(remaining.some((o) => o.id === created.id)).toBe(false);
  });
});


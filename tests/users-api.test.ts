import { describe, it, expect, beforeEach } from 'vitest';
import { POST as loginPost } from '@/app/api/auth/login/route';
import { POST as logoutPost } from '@/app/api/auth/logout/route';
import { GET as meGet } from '@/app/api/auth/me/route';
import { GET as usersGet, POST as usersPost } from '@/app/api/users/route';
import { PUT as userPut, DELETE as userDelete } from '@/app/api/users/[id]/route';
import { GET as recordsGet, POST as recordsPost } from '@/app/api/records/route';
import { PUT as recordPut, DELETE as recordDelete } from '@/app/api/records/[id]/route';
import { GET as logsGet } from '@/app/api/logs/route';
import { sheetsService } from '@/lib/sheets';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/session';

async function authCookie(role: 'admin' | 'staff', displayName: string, id = `user-${role}`) {
  const token = await createSessionToken({
    id,
    username: role,
    displayName,
    role,
  });
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`;
}

describe('Auth, Users & Role-Based Access Control API', () => {
  beforeEach(() => {
    sheetsService.resetDemoStore();
  });

  it('logs in default admin (admin / admin1234), verifies /me, and logs out', async () => {
    const loginReq = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin1234' }),
    });
    const loginRes = await loginPost(loginReq);
    expect(loginRes.status).toBe(200);
    const loginJson = await loginRes.json();
    expect(loginJson.success).toBe(true);
    expect(loginJson.user.role).toBe('admin');

    const setCookie = loginRes.headers.get('set-cookie') || '';
    expect(setCookie).toContain(SESSION_COOKIE_NAME);

    const tokenValue = setCookie.split(';')[0];
    const meRes = await meGet(
      new Request('http://localhost/api/auth/me', {
        headers: { cookie: tokenValue },
      })
    );
    expect(meRes.status).toBe(200);
    const meJson = await meRes.json();
    expect(meJson.user.username).toBe('admin');

    const logoutRes = await logoutPost();
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.headers.get('set-cookie')).toContain('Max-Age=0');
  });

  it('rejects wrong password with 401 and unauthenticated API access with 401', async () => {
    const badLogin = await loginPost(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'wrong' }),
      })
    );
    expect(badLogin.status).toBe(401);

    const noAuthRecords = await recordsGet(new Request('http://localhost/api/records'));
    expect(noAuthRecords.status).toBe(401);
  });

  it('allows admin to create, update, reset password, and delete staff user while blocking staff from /api/users', async () => {
    const adminCookie = await authCookie('admin', 'ผู้ดูแลระบบ', 'user-admin-default');

    // Create staff
    const createRes = await usersPost(
      new Request('http://localhost/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: adminCookie },
        body: JSON.stringify({
          username: 'somchai',
          password: 'pass1234',
          displayName: 'นายสมชาย ตรวจเช็ก',
          role: 'staff',
        }),
      })
    );
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()).data;
    expect(created.username).toBe('somchai');
    expect(created.passwordHash).toBeUndefined();

    // Duplicate username -> 409
    const dupRes = await usersPost(
      new Request('http://localhost/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: adminCookie },
        body: JSON.stringify({
          username: 'somchai',
          password: 'pass1234',
          displayName: 'Duplicate',
          role: 'staff',
        }),
      })
    );
    expect(dupRes.status).toBe(409);

    // List users
    const listRes = await usersGet(
      new Request('http://localhost/api/users', { headers: { cookie: adminCookie } })
    );
    expect(listRes.status).toBe(200);
    const listJson = await listRes.json();
    expect(listJson.data.length).toBe(2);

    // Staff cannot access /api/users -> 403
    const staffCookie = await authCookie('staff', 'นายสมชาย ตรวจเช็ก', created.id);
    const staffUsersRes = await usersGet(
      new Request('http://localhost/api/users', { headers: { cookie: staffCookie } })
    );
    expect(staffUsersRes.status).toBe(403);

    // Admin prevents self-delete -> 400
    const selfDelRes = await userDelete(
      new Request('http://localhost/api/users/user-admin-default', {
        method: 'DELETE',
        headers: { cookie: adminCookie },
      }),
      { params: Promise.resolve({ id: 'user-admin-default' }) }
    );
    expect(selfDelRes.status).toBe(400);

    // Admin updates & resets staff password, then staff logs in with new password
    const updRes = await userPut(
      new Request(`http://localhost/api/users/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', cookie: adminCookie },
        body: JSON.stringify({
          displayName: 'สมชาย อัปเดต',
          password: 'newpass99',
        }),
      }),
      { params: Promise.resolve({ id: created.id }) }
    );
    expect(updRes.status).toBe(200);

    const newLoginRes = await loginPost(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'somchai', password: 'newpass99' }),
      })
    );
    expect(newLoginRes.status).toBe(200);

    // Admin deletes staff user
    const delRes = await userDelete(
      new Request(`http://localhost/api/users/${created.id}`, {
        method: 'DELETE',
        headers: { cookie: adminCookie },
      }),
      { params: Promise.resolve({ id: created.id }) }
    );
    expect(delRes.status).toBe(200);
  });

  it('enforces staff restrictions, server-side recordedBy override, and no-change inspection logging', async () => {
    const adminCookie = await authCookie('admin', 'แอดมิน สมศรี', 'user-admin-default');
    const staffCookie = await authCookie('staff', 'พนักงาน ตรวจทรัพย์', 'user-staff-1');

    // Admin creates asset; spoofed recordedBy in body must be overridden by session displayName
    const postRes = await recordsPost(
      new Request('http://localhost/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: adminCookie },
        body: JSON.stringify({
          assetCode: 'EQ-ROLE-01',
          name: 'เครื่องสแกน',
          location: 'ห้อง 101',
          status: 'พร้อมใช้งาน',
          responsiblePerson: 'นาย ก',
          recordedBy: 'Spoofed Person',
          notes: 'สภาพดี',
        }),
      })
    );
    expect(postRes.status).toBe(201);
    const created = (await postRes.json()).data;
    expect(created.recordedBy).toBe('แอดมิน สมศรี');

    // Staff cannot create new asset -> 403
    const staffCreateRes = await recordsPost(
      new Request('http://localhost/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie: staffCookie },
        body: JSON.stringify({
          assetCode: 'EQ-STAFF-NEW',
          name: 'Blocked',
          location: 'Room',
          responsiblePerson: 'X',
        }),
      })
    );
    expect(staffCreateRes.status).toBe(403);

    // Staff cannot delete asset -> 403
    const staffDelRes = await recordDelete(
      new Request(`http://localhost/api/records/${created.id}`, {
        method: 'DELETE',
        headers: { cookie: staffCookie },
      }),
      { params: Promise.resolve({ id: created.id }) }
    );
    expect(staffDelRes.status).toBe(403);

    // Staff cannot edit master fields like location or name -> 403
    const staffEditMasterRes = await recordPut(
      new Request(`http://localhost/api/records/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', cookie: staffCookie },
        body: JSON.stringify({
          location: 'ห้อง 999',
          status: 'กำลังใช้งาน',
        }),
      }),
      { params: Promise.resolve({ id: created.id }) }
    );
    expect(staffEditMasterRes.status).toBe(403);

    // Staff inspects item WITHOUT changing any fields -> succeeds AND logs last seen date + staff name!
    const staffInspectRes = await recordPut(
      new Request(`http://localhost/api/records/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', cookie: staffCookie },
        body: JSON.stringify({
          status: 'พร้อมใช้งาน',
          notes: 'สภาพดี',
          recordedBy: 'Someone Else',
          isInspection: true,
        }),
      }),
      { params: Promise.resolve({ id: created.id }) }
    );
    expect(staffInspectRes.status).toBe(200);
    const inspected = (await staffInspectRes.json()).data;
    expect(inspected.recordedBy).toBe('พนักงาน ตรวจทรัพย์');
    expect(inspected.action).toBe('ตรวจเช็กครุภัณฑ์');

    const logsRes = await logsGet(
      new Request(`http://localhost/api/logs?assetCode=EQ-ROLE-01`, {
        headers: { cookie: staffCookie },
      })
    );
    const logs = (await logsRes.json()).data;
    expect(logs[0].action).toBe('ตรวจเช็กครุภัณฑ์');
    expect(logs[0].changeSummary).toContain('ไม่พบการเปลี่ยนแปลง');
    expect(logs[0].recordedBy).toBe('พนักงาน ตรวจทรัพย์');
  });
});

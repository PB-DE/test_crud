import { NextResponse } from 'next/server';
import { getSessionFromRequest } from './session';
import { SessionUser } from './types';

export type AuthCheckResult =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse };

export async function requireAuth(request: Request): Promise<AuthCheckResult> {
  const user = await getSessionFromRequest(request);
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน (Unauthorized)' },
        { status: 401 }
      ),
    };
  }
  return { ok: true, user };
}

export async function requireAdmin(request: Request): Promise<AuthCheckResult> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth;

  if (auth.user.role !== 'admin') {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'ไม่มีสิทธิ์ดำเนินการ (เฉพาะผู้ดูแลระบบ Admin เท่านั้น)',
        },
        { status: 403 }
      ),
    };
  }
  return auth;
}

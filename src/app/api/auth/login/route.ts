import { NextResponse } from 'next/server';
import { sheetsService } from '@/lib/sheets';
import { verifyPassword } from '@/lib/password';
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
} from '@/lib/session';
import { SessionUser } from '@/lib/types';

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const username = typeof body?.username === 'string' ? body.username.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!username || !password) {
    return NextResponse.json(
      { success: false, error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' },
      { status: 400 }
    );
  }

  try {
    const userRecord = await sheetsService.findUserForAuth(username);
    if (!userRecord || !verifyPassword(password, userRecord.passwordHash)) {
      return NextResponse.json(
        { success: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    if (!userRecord.active) {
      return NextResponse.json(
        { success: false, error: 'บัญชีผู้ใช้งานนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ' },
        { status: 403 }
      );
    }

    const sessionUser: SessionUser = {
      id: userRecord.id,
      username: userRecord.username,
      displayName: userRecord.displayName,
      role: userRecord.role,
    };

    const token = await createSessionToken(sessionUser);
    const response = NextResponse.json({
      success: true,
      user: sessionUser,
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_TTL_SECONDS,
    });

    return response;
  } catch (error: any) {
    console.error('Login failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ',
        details: error?.message,
      },
      { status: 500 }
    );
  }
}

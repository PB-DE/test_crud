import { NextResponse } from 'next/server';
import { getSessionFromRequest, SESSION_COOKIE_NAME } from '@/lib/session';
import { sheetsService } from '@/lib/sheets';

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const liveUser = await sheetsService.getUserById(session.id);
    if (!liveUser || !liveUser.active) {
      const res = NextResponse.json(
        { success: false, error: 'บัญชีผู้ใช้ถูกระงับหรือไม่มีอยู่ในระบบแล้ว' },
        { status: 401 }
      );
      res.cookies.set(SESSION_COOKIE_NAME, '', { path: '/', maxAge: 0 });
      return res;
    }

    return NextResponse.json({
      success: true,
      user: {
        id: liveUser.id,
        username: liveUser.username,
        displayName: liveUser.displayName,
        role: liveUser.role,
      },
    });
  } catch (error: any) {
    console.error('Failed to verify session user:', error);
    return NextResponse.json(
      { success: true, user: session },
      { status: 200 }
    );
  }
}

import { NextResponse } from 'next/server';
import { sheetsService } from '@/lib/sheets';
import { requireAdmin } from '@/lib/api-auth';
import { isValidUserRole } from '@/lib/types';

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const users = await sheetsService.getUsers();
    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    console.error('Failed to list users:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'ไม่สามารถโหลดรายชื่อผู้ใช้งานได้',
        details: error?.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

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
  const displayName = typeof body?.displayName === 'string' ? body.displayName.trim() : '';
  const role = body?.role;
  const active = body?.active !== undefined ? Boolean(body.active) : true;

  if (username.length < 2 || /\s/.test(username)) {
    return NextResponse.json(
      { success: false, error: 'ชื่อผู้ใช้ต้องมีอย่างน้อย 2 ตัวอักษรและห้ามมีเว้นวรรค' },
      { status: 400 }
    );
  }

  if (password.length < 4) {
    return NextResponse.json(
      { success: false, error: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร' },
      { status: 400 }
    );
  }

  if (!displayName) {
    return NextResponse.json(
      { success: false, error: 'กรุณาระบุชื่อ-นามสกุลผู้ใช้งาน' },
      { status: 400 }
    );
  }

  if (!isValidUserRole(role)) {
    return NextResponse.json(
      { success: false, error: 'บทบาทต้องเป็น admin หรือ staff เท่านั้น' },
      { status: 400 }
    );
  }

  try {
    const created = await sheetsService.createUser({
      username,
      password,
      displayName,
      role,
      active,
    });
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'DUPLICATE_USERNAME') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 }
      );
    }
    console.error('Failed to create user:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'ไม่สามารถสร้างผู้ใช้งานได้',
        details: error?.message,
      },
      { status: 500 }
    );
  }
}

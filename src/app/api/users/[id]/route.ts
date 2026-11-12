import { NextResponse } from 'next/server';
import { sheetsService } from '@/lib/sheets';
import { requireAdmin } from '@/lib/api-auth';
import { isValidUserRole } from '@/lib/types';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json(
      { success: false, error: 'User ID is required' },
      { status: 400 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const updateInput: {
    displayName?: string;
    role?: 'admin' | 'staff';
    active?: boolean;
    password?: string;
  } = {};

  if (body?.displayName !== undefined) {
    const dn = typeof body.displayName === 'string' ? body.displayName.trim() : '';
    if (!dn) {
      return NextResponse.json(
        { success: false, error: 'ชื่อ-นามสกุลห้ามว่าง' },
        { status: 400 }
      );
    }
    updateInput.displayName = dn;
  }

  if (body?.role !== undefined) {
    if (!isValidUserRole(body.role)) {
      return NextResponse.json(
        { success: false, error: 'บทบาทต้องเป็น admin หรือ staff' },
        { status: 400 }
      );
    }
    if (id === auth.user.id && body.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'ไม่สามารถลดสิทธิ์บัญชีที่กำลังใช้งานอยู่ของตนเองได้' },
        { status: 400 }
      );
    }
    updateInput.role = body.role;
  }

  if (body?.active !== undefined) {
    const nextActive = Boolean(body.active);
    if (id === auth.user.id && !nextActive) {
      return NextResponse.json(
        { success: false, error: 'ไม่สามารถระงับบัญชีที่กำลังใช้งานอยู่ของตนเองได้' },
        { status: 400 }
      );
    }
    updateInput.active = nextActive;
  }

  if (body?.password !== undefined && String(body.password).length > 0) {
    const pwd = String(body.password);
    if (pwd.length < 4) {
      return NextResponse.json(
        { success: false, error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร' },
        { status: 400 }
      );
    }
    updateInput.password = pwd;
  }

  try {
    const updated = await sheetsService.updateUser(id, updateInput);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบบัญชีผู้ใช้งาน' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Failed to update user:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'ไม่สามารถอัปเดตผู้ใช้งานได้',
        details: error?.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json(
      { success: false, error: 'User ID is required' },
      { status: 400 }
    );
  }

  if (id === auth.user.id) {
    return NextResponse.json(
      { success: false, error: 'ไม่สามารถลบบัญชีที่กำลังใช้งานอยู่ของตนเองได้' },
      { status: 400 }
    );
  }

  try {
    const deleted = await sheetsService.deleteUser(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบบัญชีผู้ใช้งาน' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete user:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'ไม่สามารถลบผู้ใช้งานได้',
        details: error?.message,
      },
      { status: 500 }
    );
  }
}

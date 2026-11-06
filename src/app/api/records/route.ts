import { NextResponse } from 'next/server';
import { sheetsService } from '@/lib/sheets';
import { isValidStatus } from '@/lib/types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(_request: Request) {
  try {
    const records = await sheetsService.getRecords();
    return NextResponse.json({
      success: true,
      data: records,
    });
  } catch (error: any) {
    console.error('Failed to fetch records:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch records',
        details: error?.message,
      },
      { status: 500 }
    );
  }
}

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

  const { name, email, role, status, notes } = body || {};

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'Name is required' },
      { status: 400 }
    );
  }

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
    return NextResponse.json(
      { success: false, error: 'Valid email is required' },
      { status: 400 }
    );
  }

  if (!role || typeof role !== 'string' || role.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'Role is required' },
      { status: 400 }
    );
  }

  const recordStatus = status ? status : 'Pending';
  if (!isValidStatus(recordStatus)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid status. Must be Active, Pending, or Inactive',
      },
      { status: 400 }
    );
  }

  try {
    const newRecord = await sheetsService.createRecord({
      name: name.trim(),
      email: email.trim(),
      role: role.trim(),
      status: recordStatus,
      notes: typeof notes === 'string' ? notes.trim() : '',
    });

    return NextResponse.json(
      { success: true, data: newRecord },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Failed to create record:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create record',
        details: error?.message,
      },
      { status: 500 }
    );
  }
}

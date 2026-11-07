import { NextResponse } from 'next/server';
import { sheetsService } from '@/lib/sheets';
import { isValidAssetStatus } from '@/lib/types';

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

  const { assetCode, name, location, status, responsiblePerson, recordedBy, notes } =
    body || {};

  if (!assetCode || typeof assetCode !== 'string' || assetCode.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'Asset code is required' },
      { status: 400 }
    );
  }

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'Name is required' },
      { status: 400 }
    );
  }

  if (!location || typeof location !== 'string' || location.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'Location is required' },
      { status: 400 }
    );
  }

  if (
    !responsiblePerson ||
    typeof responsiblePerson !== 'string' ||
    responsiblePerson.trim().length === 0
  ) {
    return NextResponse.json(
      { success: false, error: 'Responsible person is required' },
      { status: 400 }
    );
  }

  if (!recordedBy || typeof recordedBy !== 'string' || recordedBy.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'Recorded by is required' },
      { status: 400 }
    );
  }

  const recordStatus = status ? status : 'พร้อมใช้งาน';
  if (!isValidAssetStatus(recordStatus)) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Invalid status. Must be one of: พร้อมใช้งาน, กำลังใช้งาน, ส่งซ่อม, จำหน่าย/ตัดบัญชี',
      },
      { status: 400 }
    );
  }

  try {
    const newRecord = await sheetsService.createRecord({
      assetCode: assetCode.trim(),
      name: name.trim(),
      location: location.trim(),
      status: recordStatus,
      responsiblePerson: responsiblePerson.trim(),
      recordedBy: recordedBy.trim(),
      notes: typeof notes === 'string' ? notes.trim() : '',
    });

    return NextResponse.json(
      { success: true, data: newRecord },
      { status: 201 }
    );
  } catch (error: any) {
    if (
      error?.code === 'COLLISION' ||
      error?.name === 'AssetCollisionError' ||
      /already exists/i.test(error?.message)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Asset code already exists on another item',
          details: error?.message,
        },
        { status: 409 }
      );
    }

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

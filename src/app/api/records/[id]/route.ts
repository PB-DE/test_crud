import { NextResponse } from 'next/server';
import { sheetsService } from '@/lib/sheets';
import { isValidAssetStatus, UpdateAssetInput } from '@/lib/types';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Record ID is required' },
        { status: 400 }
      );
    }

    const record = await sheetsService.getRecordById(id);
    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: record,
    });
  } catch (error: any) {
    console.error('Failed to fetch record:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch record',
        details: error?.message,
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: RouteContext
) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const {
    assetCode,
    name,
    location,
    status,
    responsiblePerson,
    recordedBy,
    notes,
    imageUrl,
  } = body || {};
  const updateData: UpdateAssetInput = {};

  if (assetCode !== undefined) {
    if (typeof assetCode !== 'string' || assetCode.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Asset code cannot be empty' },
        { status: 400 }
      );
    }
    updateData.assetCode = assetCode.trim();
  }

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Name cannot be empty' },
        { status: 400 }
      );
    }
    updateData.name = name.trim();
  }

  if (location !== undefined) {
    if (typeof location !== 'string' || location.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Location cannot be empty' },
        { status: 400 }
      );
    }
    updateData.location = location.trim();
  }

  if (status !== undefined) {
    if (!isValidAssetStatus(status)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid status. Must be one of: พร้อมใช้งาน, กำลังใช้งาน, ส่งซ่อม, จำหน่าย/ตัดบัญชี',
        },
        { status: 400 }
      );
    }
    updateData.status = status;
  }

  if (responsiblePerson !== undefined) {
    if (
      typeof responsiblePerson !== 'string' ||
      responsiblePerson.trim().length === 0
    ) {
      return NextResponse.json(
        { success: false, error: 'Responsible person cannot be empty' },
        { status: 400 }
      );
    }
    updateData.responsiblePerson = responsiblePerson.trim();
  }

  if (recordedBy !== undefined) {
    if (typeof recordedBy !== 'string' || recordedBy.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Recorded by cannot be empty' },
        { status: 400 }
      );
    }
    updateData.recordedBy = recordedBy.trim();
  }

  if (notes !== undefined) {
    updateData.notes = typeof notes === 'string' ? notes.trim() : '';
  }

  if (imageUrl !== undefined) {
    updateData.imageUrl = typeof imageUrl === 'string' ? imageUrl.trim() : undefined;
  }

  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Record ID is required' },
        { status: 400 }
      );
    }

    const updated = await sheetsService.updateRecord(id, updateData);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
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

    console.error('Failed to update record:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update record',
        details: error?.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Record ID is required' },
        { status: 400 }
      );
    }

    let recordedBy: string | undefined;
    let notes: string | undefined;
    try {
      const url = new URL(request.url);
      recordedBy = url.searchParams.get('recordedBy') || undefined;
      notes = url.searchParams.get('notes') || undefined;
    } catch {
      // ignore
    }

    try {
      const body = await request.json();
      if (body?.recordedBy) recordedBy = body.recordedBy;
      if (body?.notes) notes = body.notes;
    } catch {
      // Body is optional
    }

    const success = await sheetsService.deleteRecord(id, recordedBy, notes);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Record decommissioned successfully',
    });
  } catch (error: any) {
    console.error('Failed to delete record:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete record',
        details: error?.message,
      },
      { status: 500 }
    );
  }
}

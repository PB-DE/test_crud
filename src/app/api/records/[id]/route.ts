import { NextResponse } from 'next/server';
import { sheetsService, parseUnitPrice } from '@/lib/sheets';
import { requireAuth, requireAdmin } from '@/lib/api-auth';
import {
  isValidAssetStatus,
  UpdateAssetInput,
  ConfigurableFieldKey,
  DEFAULT_FIELD_SETTINGS,
  FieldSetting,
} from '@/lib/types';

async function loadSafeFieldSettings(): Promise<FieldSetting[]> {
  try {
    return await sheetsService.getFieldSettings();
  } catch {
    return DEFAULT_FIELD_SETTINGS;
  }
}

function isRequired(settings: FieldSetting[], key: ConfigurableFieldKey): boolean {
  return settings.find((s) => s.fieldKey === key)?.required ?? false;
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: Request,
  context: RouteContext
) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

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
  const auth = await requireAuth(request);
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

  const {
    assetCode,
    name,
    location,
    status,
    responsiblePerson,
    notes,
    imageUrl,
    mainCategory,
    subCategory,
    acquisitionDate,
    unitPrice,
    budgetSource,
    isInspection,
  } = body || {};

  // Staff role can only update status, notes, and imageUrl (and trigger inspection log)
  if (auth.user.role === 'staff') {
    const forbiddenFields = [
      assetCode,
      name,
      location,
      responsiblePerson,
      mainCategory,
      subCategory,
      acquisitionDate,
      unitPrice,
      budgetSource,
    ];
    if (forbiddenFields.some((val) => val !== undefined)) {
      return NextResponse.json(
        {
          success: false,
          error: 'สิทธิ์ Staff สามารถอัปเดตได้เฉพาะ สถานะ, หมายเหตุ และรูปภาพเท่านั้น',
        },
        { status: 403 }
      );
    }
  }

  const fieldSettings = await loadSafeFieldSettings();
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
    if (isRequired(fieldSettings, 'name') && (typeof name !== 'string' || name.trim().length === 0)) {
      return NextResponse.json(
        { success: false, error: 'Name cannot be empty' },
        { status: 400 }
      );
    }
    updateData.name = typeof name === 'string' ? name.trim() : '';
  }

  if (location !== undefined) {
    if (isRequired(fieldSettings, 'location') && (typeof location !== 'string' || location.trim().length === 0)) {
      return NextResponse.json(
        { success: false, error: 'Location cannot be empty' },
        { status: 400 }
      );
    }
    updateData.location = typeof location === 'string' ? location.trim() : '';
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
      isRequired(fieldSettings, 'responsiblePerson') &&
      (typeof responsiblePerson !== 'string' || responsiblePerson.trim().length === 0)
    ) {
      return NextResponse.json(
        { success: false, error: 'Responsible person cannot be empty' },
        { status: 400 }
      );
    }
    updateData.responsiblePerson = typeof responsiblePerson === 'string' ? responsiblePerson.trim() : '';
  }

  // recordedBy is always enforced from the authenticated user's session
  updateData.recordedBy = auth.user.displayName || auth.user.username;

  if (auth.user.role === 'staff' || isInspection === true) {
    updateData.isInspection = true;
  }

  if (notes !== undefined) {
    const trimmedNotes = typeof notes === 'string' ? notes.trim() : '';
    if (isRequired(fieldSettings, 'notes') && trimmedNotes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุหมายเหตุ' },
        { status: 400 }
      );
    }
    updateData.notes = trimmedNotes;
  }

  if (imageUrl !== undefined) {
    updateData.imageUrl = typeof imageUrl === 'string' ? imageUrl.trim() : undefined;
  }

  if (mainCategory !== undefined) {
    const trimmed = typeof mainCategory === 'string' ? mainCategory.trim() : '';
    if (isRequired(fieldSettings, 'mainCategory') && trimmed.length === 0) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุประเภทหลัก' },
        { status: 400 }
      );
    }
    updateData.mainCategory = trimmed;
  }

  if (subCategory !== undefined) {
    const trimmed = typeof subCategory === 'string' ? subCategory.trim() : '';
    if (isRequired(fieldSettings, 'subCategory') && trimmed.length === 0) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุประเภทย่อย' },
        { status: 400 }
      );
    }
    updateData.subCategory = trimmed;
  }

  if (acquisitionDate !== undefined) {
    const trimmed = typeof acquisitionDate === 'string' ? acquisitionDate.trim() : '';
    if (isRequired(fieldSettings, 'acquisitionDate') && trimmed.length === 0) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุวันที่ได้มา' },
        { status: 400 }
      );
    }
    updateData.acquisitionDate = trimmed;
  }

  if (unitPrice !== undefined) {
    if (unitPrice === null || String(unitPrice).trim() === '') {
      if (isRequired(fieldSettings, 'unitPrice')) {
        return NextResponse.json(
          { success: false, error: 'กรุณาระบุราคา/หน่วย' },
          { status: 400 }
        );
      }
      updateData.unitPrice = null as any;
    } else {
      const parsed = parseUnitPrice(unitPrice);
      if (parsed === undefined) {
        return NextResponse.json(
          { success: false, error: 'ราคา/หน่วย ต้องเป็นตัวเลขที่ไม่ติดลบ' },
          { status: 400 }
        );
      }
      updateData.unitPrice = parsed;
    }
  }

  if (budgetSource !== undefined) {
    const trimmed = typeof budgetSource === 'string' ? budgetSource.trim() : '';
    if (isRequired(fieldSettings, 'budgetSource') && trimmed.length === 0) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุงบที่ซื้อ' },
        { status: 400 }
      );
    }
    updateData.budgetSource = trimmed;
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
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Record ID is required' },
        { status: 400 }
      );
    }

    let notes: string | undefined;
    try {
      const url = new URL(request.url);
      notes = url.searchParams.get('notes') || undefined;
    } catch {
      // ignore
    }

    try {
      const body = await request.json();
      if (body?.notes) notes = body.notes;
    } catch {
      // Body is optional
    }

    const recordedBy = auth.user.displayName || auth.user.username;
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

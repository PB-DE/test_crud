import { NextResponse } from 'next/server';
import { sheetsService, parseUnitPrice } from '@/lib/sheets';
import { requireAuth, requireAdmin } from '@/lib/api-auth';
import {
  isValidAssetStatus,
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

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

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

  const {
    assetCode,
    name,
    location,
    status,
    responsiblePerson,
    recordedBy,
    notes,
    imageUrl,
    mainCategory,
    subCategory,
    acquisitionDate,
    unitPrice,
    budgetSource,
  } = body || {};

  if (!assetCode || typeof assetCode !== 'string' || assetCode.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'Asset code is required' },
      { status: 400 }
    );
  }

  const fieldSettings = await loadSafeFieldSettings();
  const hasStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

  if (isRequired(fieldSettings, 'name') && !hasStr(name)) {
    return NextResponse.json(
      { success: false, error: 'Name is required' },
      { status: 400 }
    );
  }

  if (isRequired(fieldSettings, 'location') && !hasStr(location)) {
    return NextResponse.json(
      { success: false, error: 'Location is required' },
      { status: 400 }
    );
  }

  if (isRequired(fieldSettings, 'responsiblePerson') && !hasStr(responsiblePerson)) {
    return NextResponse.json(
      { success: false, error: 'Responsible person is required' },
      { status: 400 }
    );
  }

  // recordedBy is always enforced from the authenticated user's login name
  const effectiveRecordedBy = auth.user.displayName || auth.user.username;

  if (isRequired(fieldSettings, 'mainCategory') && !hasStr(mainCategory)) {
    return NextResponse.json(
      { success: false, error: 'กรุณาระบุประเภทหลัก' },
      { status: 400 }
    );
  }

  if (isRequired(fieldSettings, 'subCategory') && !hasStr(subCategory)) {
    return NextResponse.json(
      { success: false, error: 'กรุณาระบุประเภทย่อย' },
      { status: 400 }
    );
  }

  if (isRequired(fieldSettings, 'acquisitionDate') && !hasStr(acquisitionDate)) {
    return NextResponse.json(
      { success: false, error: 'กรุณาระบุวันที่ได้มา' },
      { status: 400 }
    );
  }

  const hasUnitPriceValue =
    unitPrice !== undefined && unitPrice !== null && String(unitPrice).trim() !== '';
  let parsedUnitPrice: number | undefined = undefined;
  if (hasUnitPriceValue) {
    parsedUnitPrice = parseUnitPrice(unitPrice);
    if (parsedUnitPrice === undefined) {
      return NextResponse.json(
        { success: false, error: 'ราคา/หน่วย ต้องเป็นตัวเลขที่ไม่ติดลบ' },
        { status: 400 }
      );
    }
  } else if (isRequired(fieldSettings, 'unitPrice')) {
    return NextResponse.json(
      { success: false, error: 'กรุณาระบุราคา/หน่วย' },
      { status: 400 }
    );
  }

  if (isRequired(fieldSettings, 'budgetSource') && !hasStr(budgetSource)) {
    return NextResponse.json(
      { success: false, error: 'กรุณาระบุงบที่ซื้อ' },
      { status: 400 }
    );
  }

  if (isRequired(fieldSettings, 'notes') && !hasStr(notes)) {
    return NextResponse.json(
      { success: false, error: 'กรุณาระบุหมายเหตุ' },
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
      name: typeof name === 'string' ? name.trim() : '',
      location: typeof location === 'string' ? location.trim() : '',
      status: recordStatus,
      responsiblePerson: typeof responsiblePerson === 'string' ? responsiblePerson.trim() : '',
      recordedBy: effectiveRecordedBy,
      notes: typeof notes === 'string' ? notes.trim() : '',
      imageUrl: typeof imageUrl === 'string' && imageUrl.trim().length > 0 ? imageUrl.trim() : undefined,
      mainCategory: typeof mainCategory === 'string' && mainCategory.trim().length > 0 ? mainCategory.trim() : undefined,
      subCategory: typeof subCategory === 'string' && subCategory.trim().length > 0 ? subCategory.trim() : undefined,
      acquisitionDate: typeof acquisitionDate === 'string' && acquisitionDate.trim().length > 0 ? acquisitionDate.trim() : undefined,
      unitPrice: parsedUnitPrice,
      budgetSource: typeof budgetSource === 'string' && budgetSource.trim().length > 0 ? budgetSource.trim() : undefined,
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

import { NextResponse } from 'next/server';
import { sheetsService } from '@/lib/sheets';
import { DropdownFieldKey, FieldSetting } from '@/lib/types';

const VALID_DROPDOWN_FIELD_KEYS: readonly DropdownFieldKey[] = [
  'name',
  'location',
  'responsiblePerson',
  'recordedBy',
  'mainCategory',
  'subCategory',
  'budgetSource',
];

function isValidDropdownFieldKey(val: unknown): val is DropdownFieldKey {
  return (
    typeof val === 'string' &&
    (VALID_DROPDOWN_FIELD_KEYS as readonly string[]).includes(val)
  );
}

export async function GET() {
  try {
    const data = await sheetsService.getOptionsAndSettings();
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Failed to fetch options and field settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load options and field settings',
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

  const { fieldKey, value, parentValue } = body || {};

  if (!isValidDropdownFieldKey(fieldKey)) {
    return NextResponse.json(
      { success: false, error: 'Invalid fieldKey for dropdown option' },
      { status: 400 }
    );
  }

  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'Option value is required' },
      { status: 400 }
    );
  }

  if (
    fieldKey === 'subCategory' &&
    (!parentValue || typeof parentValue !== 'string' || parentValue.trim().length === 0)
  ) {
    return NextResponse.json(
      { success: false, error: 'กรุณาเลือกประเภทหลักที่สังกัดสำหรับประเภทย่อย' },
      { status: 400 }
    );
  }

  try {
    const created = await sheetsService.createDropdownOption({
      fieldKey,
      value: value.trim(),
      parentValue:
        typeof parentValue === 'string' && parentValue.trim().length > 0
          ? parentValue.trim()
          : undefined,
    });

    return NextResponse.json(
      { success: true, data: created },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Failed to create dropdown option:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create dropdown option',
        details: error?.message,
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  // Case 1: Update fieldSettings array
  if (Array.isArray(body?.fieldSettings)) {
    try {
      const saved = await sheetsService.saveFieldSettings(
        body.fieldSettings as FieldSetting[]
      );
      return NextResponse.json({
        success: true,
        data: saved,
      });
    } catch (error: any) {
      console.error('Failed to save field settings:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to save field settings',
          details: error?.message,
        },
        { status: 500 }
      );
    }
  }

  // Case 2: Update existing dropdown option
  const { id, value, parentValue } = body || {};
  if (!id || typeof id !== 'string') {
    return NextResponse.json(
      { success: false, error: 'Option id is required' },
      { status: 400 }
    );
  }

  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: 'Option value is required' },
      { status: 400 }
    );
  }

  try {
    const updated = await sheetsService.updateDropdownOption(id, {
      value: value.trim(),
      parentValue: typeof parentValue === 'string' ? parentValue.trim() : undefined,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Dropdown option not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Failed to update dropdown option:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update dropdown option',
        details: error?.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  let id = searchParams.get('id');

  if (!id) {
    try {
      const body = await request.json();
      id = body?.id;
    } catch {
      // ignore empty body
    }
  }

  if (!id || typeof id !== 'string') {
    return NextResponse.json(
      { success: false, error: 'Option id is required' },
      { status: 400 }
    );
  }

  try {
    const deleted = await sheetsService.deleteDropdownOption(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Dropdown option not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete dropdown option:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete dropdown option',
        details: error?.message,
      },
      { status: 500 }
    );
  }
}

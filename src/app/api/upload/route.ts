import { NextResponse } from 'next/server';
import { uploadImageToDrive } from '@/lib/sheets';
import { requireAuth } from '@/lib/api-auth';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const assetCode = (formData.get('assetCode') as string) || 'asset';

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { success: false, error: 'No image file provided' },
        { status: 400 }
      );
    }

    const uploadedFile = file as File;

    if (!ALLOWED_MIME_TYPES.includes(uploadedFile.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed',
        },
        { status: 400 }
      );
    }

    if (uploadedFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    const arrayBuffer = await uploadedFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = uploadedFile.name ? uploadedFile.name.split('.').pop() : 'jpg';
    const safeCode = assetCode.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${safeCode}_${Date.now()}.${ext}`;

    const result = await uploadImageToDrive(buffer, fileName, uploadedFile.type);

    return NextResponse.json({
      success: true,
      fileId: result.fileId,
      url: result.url,
    });
  } catch (error: any) {
    console.error('Upload failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to upload image',
        details: error?.message,
      },
      { status: 500 }
    );
  }
}


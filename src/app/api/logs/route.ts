import { NextResponse } from 'next/server';
import { sheetsService } from '@/lib/sheets';
import { requireAuth } from '@/lib/api-auth';

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const rawAssetId = searchParams.get('assetId');
    const rawAssetCode = searchParams.get('assetCode');

    const assetId = rawAssetId?.trim() ? rawAssetId.trim() : undefined;
    const assetCode = rawAssetCode?.trim() ? rawAssetCode.trim() : undefined;

    const logs = await sheetsService.getLogs({ assetId, assetCode });
    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error: any) {
    console.error('Failed to fetch logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch logs',
        details: error?.message,
      },
      { status: 500 }
    );
  }
}

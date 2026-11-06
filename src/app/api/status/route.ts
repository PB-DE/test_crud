import { NextResponse } from 'next/server';
import { getEnvConfig } from '@/lib/env';

export async function GET(_request: Request) {
  try {
    const config = getEnvConfig();
    return NextResponse.json({
      configured: config.isConfigured,
      ...(config.spreadsheetId ? { sheetId: config.spreadsheetId } : {}),
    });
  } catch (error) {
    console.error('Failed to check status:', error);
    return NextResponse.json(
      { configured: false, error: 'Failed to check status' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getEnvConfig } from '@/lib/env';

export async function GET(_request: Request) {
  try {
    const config = getEnvConfig();
    return NextResponse.json({
      configured: config.isConfigured,
      ...(config.spreadsheetId ? { sheetId: config.spreadsheetId } : {}),
      driveConfigured: Boolean(config.driveUploadUrl || (config.driveFolderId && config.clientEmail)),
      driveMode: config.driveUploadUrl
        ? 'apps-script'
        : config.driveFolderId && config.clientEmail
        ? 'service-account'
        : 'none',
      hasUploadUrl: Boolean(config.driveUploadUrl),
      hasDriveFolderId: Boolean(config.driveFolderId),
    });
  } catch (error) {
    console.error('Failed to check status:', error);
    return NextResponse.json(
      { configured: false, error: 'Failed to check status' },
      { status: 500 }
    );
  }
}

export interface EnvConfig {
  spreadsheetId?: string;
  clientEmail?: string;
  privateKey?: string;
  isConfigured: boolean;
}

export function getEnvConfig(): EnvConfig {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID || process.env.GOOGLE_SPREADSHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;

  let privateKey: string | undefined;
  if (rawKey) {
    // Normalize escaped newlines from environment strings (especially on Vercel)
    privateKey = rawKey.replace(/\\n/g, '\n');
  }

  const isConfigured = Boolean(
    spreadsheetId &&
    spreadsheetId.trim().length > 0 &&
    clientEmail &&
    clientEmail.trim().length > 0 &&
    privateKey &&
    privateKey.trim().length > 0
  );

  return {
    spreadsheetId: spreadsheetId ? spreadsheetId.trim() : undefined,
    clientEmail: clientEmail ? clientEmail.trim() : undefined,
    privateKey: privateKey ? privateKey.trim() : undefined,
    isConfigured,
  };
}

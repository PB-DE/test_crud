export interface EnvConfig {
  spreadsheetId?: string;
  clientEmail?: string;
  privateKey?: string;
  isConfigured: boolean;
}

function stripSurroundingQuotes(val: string): string {
  let trimmed = val.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function parseSpreadsheetId(val: string | undefined): string | undefined {
  if (!val) return undefined;
  let clean = stripSurroundingQuotes(val);
  if (!clean) return undefined;

  // If user pasted a full Google Sheets URL: https://docs.google.com/spreadsheets/d/<SHEET_ID>/...
  const match = clean.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }

  return clean;
}

function parseClientEmail(val: string | undefined): string | undefined {
  if (!val) return undefined;
  const clean = stripSurroundingQuotes(val);
  return clean || undefined;
}

function parsePrivateKey(val: string | undefined): string | undefined {
  if (!val) return undefined;
  let clean = stripSurroundingQuotes(val);
  if (!clean) return undefined;

  // Normalize escaped newlines from environment strings (especially on Vercel)
  clean = clean
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n');

  // If after newline conversion it still has outer quotes, strip them again
  clean = stripSurroundingQuotes(clean);

  return clean || undefined;
}

export function getEnvConfig(): EnvConfig {
  const rawSheetId = process.env.GOOGLE_SHEET_ID || process.env.GOOGLE_SPREADSHEET_ID;
  const rawEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;

  const spreadsheetId = parseSpreadsheetId(rawSheetId);
  const clientEmail = parseClientEmail(rawEmail);
  const privateKey = parsePrivateKey(rawKey);

  const isConfigured = Boolean(
    spreadsheetId &&
    spreadsheetId.length > 0 &&
    clientEmail &&
    clientEmail.length > 0 &&
    privateKey &&
    privateKey.length > 0
  );

  return {
    spreadsheetId,
    clientEmail,
    privateKey,
    isConfigured,
  };
}

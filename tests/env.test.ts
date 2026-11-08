import { describe, it, expect, beforeEach } from 'vitest';
import { getEnvConfig } from '../src/lib/env';

describe('getEnvConfig', () => {
  beforeEach(() => {
    delete process.env.GOOGLE_SHEET_ID;
    delete process.env.GOOGLE_SPREADSHEET_ID;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_PRIVATE_KEY;
    delete process.env.GOOGLE_DRIVE_FOLDER_ID;
    delete process.env.GOOGLE_DRIVE_UPLOAD_URL;
  });

  it('reports isConfigured as false when variables are missing', () => {
    const config = getEnvConfig();
    expect(config.isConfigured).toBe(false);
    expect(config.spreadsheetId).toBeUndefined();
    expect(config.clientEmail).toBeUndefined();
    expect(config.privateKey).toBeUndefined();
  });

  it('reports isConfigured as false when only some variables are set', () => {
    process.env.GOOGLE_SHEET_ID = 'sheet_123';
    expect(getEnvConfig().isConfigured).toBe(false);

    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'sa@test.iam.gserviceaccount.com';
    expect(getEnvConfig().isConfigured).toBe(false);
  });

  it('reports isConfigured as false when variables contain only whitespace', () => {
    process.env.GOOGLE_SHEET_ID = '   ';
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'sa@test.iam.gserviceaccount.com';
    process.env.GOOGLE_PRIVATE_KEY = 'key';

    expect(getEnvConfig().isConfigured).toBe(false);
  });

  it('normalizes escaped newlines in GOOGLE_PRIVATE_KEY', () => {
    process.env.GOOGLE_SHEET_ID = 'sheet_123';
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'sa@test.iam.gserviceaccount.com';
    process.env.GOOGLE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgk\\n-----END PRIVATE KEY-----';

    const config = getEnvConfig();
    expect(config.isConfigured).toBe(true);
    expect(config.spreadsheetId).toBe('sheet_123');
    expect(config.clientEmail).toBe('sa@test.iam.gserviceaccount.com');
    expect(config.privateKey).toContain('\n');
    expect(config.privateKey).not.toContain('\\n');
  });

  it('supports GOOGLE_SPREADSHEET_ID as fallback for sheet ID', () => {
    process.env.GOOGLE_SPREADSHEET_ID = 'fallback_sheet_456';
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'sa@test.iam.gserviceaccount.com';
    process.env.GOOGLE_PRIVATE_KEY = 'some-key';

    const config = getEnvConfig();
    expect(config.isConfigured).toBe(true);
    expect(config.spreadsheetId).toBe('fallback_sheet_456');
  });

  it('strips surrounding quotes and normalizes private key pasted from JSON or Vercel UI', () => {
    process.env.GOOGLE_SHEET_ID = '"sheet_quotes"';
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = "'sa_quotes@test.iam.gserviceaccount.com'";
    process.env.GOOGLE_PRIVATE_KEY = '"-----BEGIN PRIVATE KEY-----\\nMIIEvgIB\\n-----END PRIVATE KEY-----\\n"';

    const config = getEnvConfig();
    expect(config.isConfigured).toBe(true);
    expect(config.spreadsheetId).toBe('sheet_quotes');
    expect(config.clientEmail).toBe('sa_quotes@test.iam.gserviceaccount.com');
    expect(config.privateKey).toBe('-----BEGIN PRIVATE KEY-----\nMIIEvgIB\n-----END PRIVATE KEY-----');
    expect(config.privateKey?.startsWith('"')).toBe(false);
  });

  it('extracts spreadsheet ID automatically if full Google Sheets URL is pasted', () => {
    process.env.GOOGLE_SHEET_ID = 'https://docs.google.com/spreadsheets/d/16iKFICKjxdpHAzcSZef1ZL8_eYFfMDljop-TiTotKlQ/edit#gid=0';
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'sa@test.iam.gserviceaccount.com';
    process.env.GOOGLE_PRIVATE_KEY = 'some-key';

    const config = getEnvConfig();
    expect(config.spreadsheetId).toBe('16iKFICKjxdpHAzcSZef1ZL8_eYFfMDljop-TiTotKlQ');
  });

  it('parses raw GOOGLE_DRIVE_FOLDER_ID and reports isDriveConfigured accurately', () => {
    process.env.GOOGLE_SHEET_ID = 'sheet_123';
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'sa@test.iam.gserviceaccount.com';
    process.env.GOOGLE_PRIVATE_KEY = 'key';
    process.env.GOOGLE_DRIVE_FOLDER_ID = '1A2b3C4d5E6f7G8h9I0jKlMnOpQrStUvW';

    const config = getEnvConfig();
    expect(config.isConfigured).toBe(true);
    expect(config.isDriveConfigured).toBe(true);
    expect(config.driveFolderId).toBe('1A2b3C4d5E6f7G8h9I0jKlMnOpQrStUvW');
  });

  it('extracts driveFolderId from full Google Drive folder URL', () => {
    process.env.GOOGLE_SHEET_ID = 'sheet_123';
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'sa@test.iam.gserviceaccount.com';
    process.env.GOOGLE_PRIVATE_KEY = 'key';
    process.env.GOOGLE_DRIVE_FOLDER_ID = 'https://drive.google.com/drive/folders/1A2b3C4d5E6f7G8h9I0jKlMnOpQrStUvW?usp=sharing';

    const config = getEnvConfig();
    expect(config.isDriveConfigured).toBe(true);
    expect(config.driveFolderId).toBe('1A2b3C4d5E6f7G8h9I0jKlMnOpQrStUvW');
  });

  it('reports isDriveConfigured as false when folder ID is missing or service account is missing', () => {
    process.env.GOOGLE_SHEET_ID = 'sheet_123';
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'sa@test.iam.gserviceaccount.com';
    process.env.GOOGLE_PRIVATE_KEY = 'key';
    // No GOOGLE_DRIVE_FOLDER_ID
    expect(getEnvConfig().isDriveConfigured).toBe(false);

    // Folder ID exists but no credentials
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    process.env.GOOGLE_DRIVE_FOLDER_ID = 'folder_123';
    expect(getEnvConfig().isDriveConfigured).toBe(false);
  });

  it('reports isDriveConfigured as true when GOOGLE_DRIVE_UPLOAD_URL is provided', () => {
    process.env.GOOGLE_SHEET_ID = 'sheet_123';
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'sa@test.iam.gserviceaccount.com';
    process.env.GOOGLE_PRIVATE_KEY = 'key';
    process.env.GOOGLE_DRIVE_UPLOAD_URL = 'https://script.google.com/macros/s/AKfycby.../exec';

    const config = getEnvConfig();
    expect(config.isDriveConfigured).toBe(true);
    expect(config.driveUploadUrl).toBe('https://script.google.com/macros/s/AKfycby.../exec');
  });

  it('strips quotes from GOOGLE_DRIVE_UPLOAD_URL', () => {
    process.env.GOOGLE_SHEET_ID = 'sheet_123';
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = 'sa@test.iam.gserviceaccount.com';
    process.env.GOOGLE_PRIVATE_KEY = 'key';
    process.env.GOOGLE_DRIVE_UPLOAD_URL = '"https://script.google.com/macros/s/test/exec"';

    const config = getEnvConfig();
    expect(config.driveUploadUrl).toBe('https://script.google.com/macros/s/test/exec');
  });
});

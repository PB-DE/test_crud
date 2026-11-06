import { describe, it, expect, beforeEach } from 'vitest';
import { getEnvConfig } from '../src/lib/env';

describe('getEnvConfig', () => {
  beforeEach(() => {
    delete process.env.GOOGLE_SHEET_ID;
    delete process.env.GOOGLE_SPREADSHEET_ID;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_PRIVATE_KEY;
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
});

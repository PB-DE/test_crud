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
});

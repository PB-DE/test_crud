import { describe, it, expect } from 'vitest';
import { cleanQrPayload } from '@/lib/ui-helpers';
import {
  QrScannerModal,
  CAMERA_ERROR_MESSAGE,
  QR_VIEWPORT_ID,
} from '@/components/QrScannerModal';

describe('QR Scanner Payload Sanitization', () => {
  it('trims whitespace and returns clean assetCode', () => {
    expect(cleanQrPayload('  EQ-2024-888 \n ')).toBe('EQ-2024-888');
    expect(cleanQrPayload('IT-ASSET-01')).toBe('IT-ASSET-01');
    expect(cleanQrPayload('\t\r\n EQ-999 \t ')).toBe('EQ-999');
  });

  it('handles empty string gracefully', () => {
    expect(cleanQrPayload('')).toBe('');
    expect(cleanQrPayload('   ')).toBe('');
    expect(cleanQrPayload('\n\t  \r')).toBe('');
  });

  it('handles null, undefined or non-string gracefully', () => {
    expect(cleanQrPayload(null as any)).toBe('');
    expect(cleanQrPayload(undefined as any)).toBe('');
  });
});

describe('QrScannerModal Component Contract & SSR Safety', () => {
  it('exports QrScannerModal as a valid React component function', () => {
    expect(typeof QrScannerModal).toBe('function');
  });

  it('exports the specified Thai camera error message', () => {
    expect(CAMERA_ERROR_MESSAGE).toBe(
      'ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการเข้าถึงกล้องบนอุปกรณ์ หรือพิมพ์รหัสด้วยตนเอง'
    );
  });

  it('exports a stable QR viewport element ID', () => {
    expect(QR_VIEWPORT_ID).toBe('qr-reader-viewport');
  });

  it('can be imported safely in a Node/SSR environment without throwing', async () => {
    const mod = await import('@/components/QrScannerModal');
    expect(mod.QrScannerModal).toBeDefined();
  });
});

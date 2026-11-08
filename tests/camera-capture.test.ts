import { describe, it, expect } from 'vitest';
import {
  CameraCaptureModal,
  CAMERA_PERMISSION_ERROR,
  CAMERA_NOT_FOUND_ERROR,
  CAMERA_GENERAL_ERROR,
  CAMERA_UNSUPPORTED_ERROR,
  dataUrlToFile,
} from '@/components/CameraCaptureModal';

describe('CameraCaptureModal Component Contract & SSR Safety', () => {
  it('exports CameraCaptureModal as a valid React component function', () => {
    expect(typeof CameraCaptureModal).toBe('function');
  });

  it('exports standard Thai camera error messages', () => {
    expect(CAMERA_PERMISSION_ERROR).toBe(
      'ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการเข้าถึงกล้องในเบราว์เซอร์ของคุณ หรือเลือกรูปจากคลังภาพแทน'
    );
    expect(CAMERA_NOT_FOUND_ERROR).toBe(
      'ไม่พบอุปกรณ์กล้องบนอุปกรณ์นี้ กรุณาเลือกรูปภาพจากคลังภาพแทน'
    );
    expect(CAMERA_GENERAL_ERROR).toBe(
      'เกิดข้อผิดพลาดในการเปิดกล้อง กรุณาลองใหม่อีกครั้ง หรือเลือกรูปจากคลังภาพแทน'
    );
    expect(CAMERA_UNSUPPORTED_ERROR).toBe(
      'เบราว์เซอร์นี้ไม่รองรับการเปิดกล้องผ่านเว็บ กรุณาเลือกรูปภาพจากคลังภาพแทน'
    );
  });

  it('can be imported safely in a Node/SSR environment without throwing', async () => {
    const mod = await import('@/components/CameraCaptureModal');
    expect(mod.CameraCaptureModal).toBeDefined();
    expect(mod.dataUrlToFile).toBeDefined();
  });
});

describe('dataUrlToFile Helper', () => {
  it('converts a base64 JPEG data URL into a valid File object', () => {
    // 1x1 transparent/black jpeg base64
    const sampleDataUrl =
      'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
    const filename = 'captured-test.jpg';
    const file = dataUrlToFile(sampleDataUrl, filename);

    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe(filename);
    expect(file.type).toBe('image/jpeg');
    expect(file.size).toBeGreaterThan(0);
  });

  it('converts a PNG data URL and preserves correct mime type', () => {
    const samplePng =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const file = dataUrlToFile(samplePng, 'sample.png');

    expect(file.name).toBe('sample.png');
    expect(file.type).toBe('image/png');
    expect(file.size).toBeGreaterThan(0);
  });
});


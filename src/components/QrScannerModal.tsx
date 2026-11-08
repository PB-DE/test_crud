'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  CameraOff,
  Loader2,
  RefreshCw,
  Image as ImageIcon,
  Lock,
} from 'lucide-react';
import { cleanQrPayload } from '@/lib/ui-helpers';

export interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (cleanCode: string) => void;
}

export const CAMERA_ERROR_MESSAGE =
  'ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการเข้าถึงกล้องบนอุปกรณ์ หรือพิมพ์รหัสด้วยตนเอง';

export const QR_VIEWPORT_ID = 'qr-reader-viewport';

export function QrScannerModal({ isOpen, onClose, onScan }: QrScannerModalProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const scannerRef = useRef<any>(null);
  const isScannedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null);
      setIsStarting(true);
      isScannedRef.current = false;
      return;
    }

    let isMounted = true;
    isScannedRef.current = false;
    setIsStarting(true);
    setErrorMessage(null);

    const startScanning = async () => {
      try {
        const { Html5Qrcode, Html5QrcodeScannerState } = await import('html5-qrcode');
        if (!isMounted) return;

        const container = document.getElementById(QR_VIEWPORT_ID);
        if (!container) {
          if (isMounted) {
            setIsStarting(false);
            setErrorMessage(CAMERA_ERROR_MESSAGE);
          }
          return;
        }

        const scanner = new Html5Qrcode(QR_VIEWPORT_ID);
        scannerRef.current = scanner;

        const qrConfig = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        const handleScanSuccess = async (decodedText: string) => {
          if (isScannedRef.current) return;
          const cleaned = cleanQrPayload(decodedText);
          if (!cleaned) return;

          isScannedRef.current = true;
          try {
            if (scanner.getState() === Html5QrcodeScannerState.SCANNING) {
              await scanner.stop();
            }
          } catch (stopErr) {
            console.warn('Error stopping scanner on success:', stopErr);
          }

          if (isMounted) {
            onScan(cleaned);
            onClose();
          }
        };

        // Step 1: Detect available cameras via Html5Qrcode.getCameras()
        // This prompts for browser permission cleanly with { video: true } and returns real device IDs
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (!isMounted) return;

          if (cameras && cameras.length > 0) {
            // Pick rear camera on mobile if available, otherwise pick the first camera (e.g. FaceTime HD Camera on Mac)
            const rearCamera = cameras.find((c) =>
              /back|rear|environment|หลัง/i.test(c.label)
            );
            const cameraId = rearCamera ? rearCamera.id : cameras[0].id;

            await scanner.start(
              cameraId,
              qrConfig,
              handleScanSuccess,
              () => {}
            );
            if (isMounted) setIsStarting(false);
            return;
          }
        } catch (camErr) {
          console.warn('getCameras failed, falling back to facingMode constraints...', camErr);
        }

        if (!isMounted) return;

        // Step 2: Fallback to facingMode if getCameras had no devices
        try {
          await scanner.start(
            { facingMode: 'environment' },
            qrConfig,
            handleScanSuccess,
            () => {}
          );
        } catch (envErr) {
          if (!isMounted) return;
          try {
            await scanner.start(
              { facingMode: 'user' },
              qrConfig,
              handleScanSuccess,
              () => {}
            );
          } catch (finalErr) {
            console.error('All camera start attempts failed:', finalErr);
            if (isMounted) {
              setErrorMessage(CAMERA_ERROR_MESSAGE);
              setIsStarting(false);
            }
            return;
          }
        }

        if (isMounted) setIsStarting(false);
      } catch (err) {
        console.error('QR scanner start error:', err);
        if (isMounted) {
          setErrorMessage(CAMERA_ERROR_MESSAGE);
          setIsStarting(false);
        }
      }
    };

    startScanning();

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        const scanner = scannerRef.current;
        scannerRef.current = null;
        const cleanup = async () => {
          try {
            const { Html5QrcodeScannerState } = await import('html5-qrcode');
            if (
              typeof scanner.getState === 'function' &&
              scanner.getState() === Html5QrcodeScannerState.SCANNING
            ) {
              await scanner.stop();
            } else if (typeof scanner.stop === 'function') {
              await scanner.stop();
            }
          } catch (stopErr) {
            console.warn('Error stopping scanner on unmount:', stopErr);
          } finally {
            try {
              scanner.clear();
            } catch {
              // Ignore clear error on unmounted DOM
            }
          }
        };
        cleanup();
      }
    };
  }, [isOpen, retryCount, onClose, onScan]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Decode QR from static image file fallback
  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const html5QrCode = scannerRef.current || new Html5Qrcode(QR_VIEWPORT_ID);
      const decodedText = await html5QrCode.scanFile(file, true);
      const cleaned = cleanQrPayload(decodedText);
      if (cleaned) {
        onScan(cleaned);
        onClose();
      }
    } catch (err) {
      console.warn('QR file scan error:', err);
      alert('ไม่สามารถอ่าน QR Code จากรูปภาพนี้ได้ กรุณาลองใช้รูปอื่น');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-scanner-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
    >
      {/* Hidden File Picker Fallback for QR Code Image */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileScan}
      />

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 z-10 overflow-hidden flex flex-col transform transition-all animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 id="qr-scanner-title" className="text-base font-semibold text-slate-900">
                สแกน QR Code ครุภัณฑ์
              </h3>
              <p className="text-xs text-slate-500">
                ส่องกล้องไปที่ QR Code บนตัวครุภัณฑ์
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="ปิด"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport / Error Body */}
        <div className="p-5 flex flex-col items-center">
          <div className="relative w-full aspect-square max-h-[300px] bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner">
            {/* Viewport for Html5Qrcode */}
            <div
              id={QR_VIEWPORT_ID}
              className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
            />

            {/* Starting Spinner */}
            {isStarting && !errorMessage && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 text-white z-10 gap-2.5">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                <span className="text-xs font-medium text-slate-300">กำลังเปิดกล้อง...</span>
              </div>
            )}

            {/* Error Message & Troubleshooting Guide */}
            {errorMessage && (
              <div
                data-testid="camera-error-banner"
                className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-white p-4 text-center z-20 gap-2.5 overflow-y-auto"
              >
                <div className="p-2.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                  <CameraOff className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-200 leading-relaxed max-w-[240px]">
                  {errorMessage}
                </p>

                {/* Troubleshooting instructions */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-left text-[10px] text-slate-300 w-full max-w-[260px] space-y-1">
                  <div className="font-semibold text-amber-300 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    วิธีเปิดสิทธิ์กล้องในเบราว์เซอร์:
                  </div>
                  <div>1. คลิกไอคอน 🔒 / 📷 ที่แถบ URL ด้านบนซ้าย</div>
                  <div>2. เปลี่ยนกล้องเป็น &quot;อนุญาต&quot; (Allow)</div>
                  <div>3. บน Mac: ตรวจสอบ System Settings &gt; Privacy &gt; Camera</div>
                </div>

                <div className="flex flex-col gap-1.5 w-full max-w-[260px] mt-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setIsStarting(true);
                        setRetryCount((prev) => prev + 1);
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg border border-slate-700 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      ลองใหม่
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                    >
                      <ImageIcon className="w-3 h-3" />
                      เลือกรูปภาพ
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-[11px] font-medium rounded-lg border border-slate-800 transition-colors cursor-pointer"
                  >
                    พิมพ์รหัสด้วยตนเอง
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 text-center">
            <p className="text-[11px] text-slate-400">
              💡 แนะนำ: จัดให้ QR Code อยู่กึ่งกลางกรอบ หรือกด &quot;เลือกรูปภาพ&quot; หากกล้องไม่เปิด
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}

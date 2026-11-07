'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, CameraOff, Loader2 } from 'lucide-react';
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
  const scannerRef = useRef<any>(null);
  const isScannedRef = useRef(false);

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

        // Attempt 1: Rear camera (environment)
        try {
          await scanner.start(
            { facingMode: 'environment' },
            qrConfig,
            handleScanSuccess,
            () => {}
          );
        } catch (envErr) {
          console.warn('FacingMode environment failed, trying user camera fallback...', envErr);
          if (!isMounted) return;

          // Attempt 2: User camera
          try {
            await scanner.start(
              { facingMode: 'user' },
              qrConfig,
              handleScanSuccess,
              () => {}
            );
          } catch (userErr) {
            console.warn('FacingMode user failed, trying available cameras list...', userErr);
            if (!isMounted) return;

            // Attempt 3: Any available video device
            try {
              const cameras = await Html5Qrcode.getCameras();
              if (cameras && cameras.length > 0) {
                await scanner.start(
                  cameras[0].id,
                  qrConfig,
                  handleScanSuccess,
                  () => {}
                );
              } else {
                throw new Error('No cameras found');
              }
            } catch (finalErr) {
              console.error('All camera attempts failed:', finalErr);
              if (isMounted) {
                setErrorMessage(CAMERA_ERROR_MESSAGE);
                setIsStarting(false);
              }
              return;
            }
          }
        }

        if (!isMounted) {
          try {
            if (
              typeof scanner.getState === 'function' &&
              scanner.getState() === Html5QrcodeScannerState.SCANNING
            ) {
              await scanner.stop();
            } else if (typeof scanner.stop === 'function') {
              await scanner.stop();
            }
          } catch (stopErr) {
            console.warn('Error stopping scanner after unmounted start:', stopErr);
          } finally {
            try {
              scanner.clear();
            } catch {
              // Ignore clear error on unmounted DOM
            }
          }
          return;
        }

        setIsStarting(false);
      } catch (err) {
        console.error('Failed to initialize QR scanner:', err);
        if (isMounted) {
          setErrorMessage(CAMERA_ERROR_MESSAGE);
          setIsStarting(false);
        }
      }
    };

    const timer = setTimeout(() => {
      startScanning();
    }, 50);

    return () => {
      clearTimeout(timer);
      isMounted = false;
      const scanner = scannerRef.current;
      if (scanner) {
        const cleanup = async () => {
          try {
            if (typeof scanner.getState === 'function' && scanner.getState() === 2) {
              await scanner.stop();
            }
          } catch (stopErr) {
            console.warn('Error stopping camera during cleanup:', stopErr);
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
  }, [isOpen, onClose, onScan]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-scanner-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
    >
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
          <div className="relative w-full aspect-square max-h-[280px] bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner">
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

            {/* Error Message */}
            {errorMessage && (
              <div
                data-testid="camera-error-banner"
                className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-white p-6 text-center z-20 gap-3"
              >
                <div className="p-3 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <CameraOff className="w-8 h-8" />
                </div>
                <p className="text-xs text-slate-200 leading-relaxed max-w-[240px]">
                  {errorMessage}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-xl border border-slate-700 transition-colors cursor-pointer shadow-xs"
                >
                  พิมพ์รหัสด้วยตนเอง
                </button>
              </div>
            )}
          </div>

          <div className="mt-3 text-center">
            <p className="text-[11px] text-slate-400">
              💡 แนะนำ: จัดให้ QR Code อยู่กึ่งกลางกรอบ และมีแสงสว่างเพียงพอ
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

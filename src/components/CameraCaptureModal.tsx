'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Camera,
  RefreshCw,
  Check,
  RotateCcw,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';

export const CAMERA_PERMISSION_ERROR =
  'ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการเข้าถึงกล้องในเบราว์เซอร์ของคุณ หรือเลือกรูปจากคลังภาพแทน';
export const CAMERA_NOT_FOUND_ERROR =
  'ไม่พบอุปกรณ์กล้องบนอุปกรณ์นี้ กรุณาเลือกรูปภาพจากคลังภาพแทน';
export const CAMERA_GENERAL_ERROR =
  'เกิดข้อผิดพลาดในการเปิดกล้อง กรุณาลองใหม่อีกครั้ง หรือเลือกรูปจากคลังภาพแทน';
export const CAMERA_UNSUPPORTED_ERROR =
  'เบราว์เซอร์นี้ไม่รองรับการเปิดกล้องผ่านเว็บ กรุณาเลือกรูปภาพจากคลังภาพแทน';

/**
 * Helper to convert a Base64 data URL into a standard HTML File object.
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0]?.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binaryString = typeof atob === 'function' ? atob(parts[1]) : Buffer.from(parts[1], 'base64').toString('binary');
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mime });
}

export interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export function CameraCaptureModal({
  isOpen,
  onClose,
  onCapture,
}: CameraCaptureModalProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop media tracks helper
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Check if multiple camera devices exist
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoInputs = devices.filter((d) => d.kind === 'videoinput');
          if (videoInputs.length > 1) {
            setHasMultipleCameras(true);
          }
        })
        .catch(() => {
          // Ignore enumeration errors
        });
    }
  }, [isOpen]);

  // Start video stream when modal is open and in capture mode
  useEffect(() => {
    if (!isOpen) {
      stopStream();
      setCapturedDataUrl(null);
      setErrorMessage(null);
      setIsInitializing(true);
      return;
    }

    if (capturedDataUrl) {
      // If user is currently reviewing captured snapshot, stop camera stream to save battery
      stopStream();
      return;
    }

    let isCancelled = false;
    setIsInitializing(true);
    setErrorMessage(null);

    const startCamera = async () => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        if (!isCancelled) {
          setIsInitializing(false);
          setErrorMessage(CAMERA_UNSUPPORTED_ERROR);
        }
        return;
      }

      // Stop previous stream if any
      stopStream();

      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        };

        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (firstErr: any) {
          // If environment failed, try without facingMode constraints
          if (facingMode === 'environment') {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: 'user' },
              audio: false,
            });
          } else {
            throw firstErr;
          }
        }

        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch {
            // Handled if play was interrupted
          }
        }
        setIsInitializing(false);
      } catch (err: any) {
        if (isCancelled) return;
        setIsInitializing(false);
        console.error('Camera access error:', err);

        const errorName = err?.name || '';
        if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
          setErrorMessage(CAMERA_PERMISSION_ERROR);
        } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
          setErrorMessage(CAMERA_NOT_FOUND_ERROR);
        } else {
          setErrorMessage(CAMERA_GENERAL_ERROR);
        }
      }
    };

    startCamera();

    return () => {
      isCancelled = true;
      stopStream();
    };
  }, [isOpen, facingMode, capturedDataUrl, stopStream]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Capture snapshot from current video frame
  const handleShutter = () => {
    const video = videoRef.current;
    if (!video) return;

    // Trigger visual flash
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 150);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedDataUrl(dataUrl);
  };

  // Discard snapshot and retake
  const handleRetake = () => {
    setCapturedDataUrl(null);
  };

  // Confirm snapshot and send to parent
  const handleConfirm = () => {
    if (!capturedDataUrl) return;
    const filename = `asset-capture-${Date.now()}.jpg`;
    const file = dataUrlToFile(capturedDataUrl, filename);
    stopStream();
    onCapture(file);
    onClose();
  };

  // Switch camera between front and back
  const handleToggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-800 z-10 overflow-hidden flex flex-col transform transition-all animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 id="camera-modal-title" className="text-sm font-semibold tracking-wide text-white">
                {capturedDataUrl ? 'ตรวจสอบภาพถ่าย' : 'ถ่ายภาพครุภัณฑ์'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {capturedDataUrl
                  ? 'ตรวจสอบความชัดเจนของภาพก่อนบันทึก'
                  : 'จัดตำแหน่งครุภัณฑ์ให้อยู่ตรงกลางกรอบภาพ'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            aria-label="ปิดกล้อง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Preview Body */}
        <div className="relative bg-black aspect-[4/3] sm:aspect-[4/3] flex items-center justify-center overflow-hidden select-none">
          {/* Flash Effect Overlay */}
          {isFlashing && (
            <div className="absolute inset-0 bg-white z-30 pointer-events-none animate-out fade-out duration-150" />
          )}

          {/* Review Captured Snapshot */}
          {capturedDataUrl ? (
            <img
              src={capturedDataUrl}
              alt="ภาพถ่ายครุภัณฑ์"
              className="w-full h-full object-contain bg-black"
            />
          ) : (
            <>
              {/* Live Video Feed */}
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className={`w-full h-full object-cover ${
                  facingMode === 'user' ? 'scale-x-[-1]' : ''
                }`}
              />

              {/* Viewfinder Target Framing Brackets */}
              {!isInitializing && !errorMessage && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6 sm:p-10">
                  <div className="relative w-full h-full border-2 border-white/25 rounded-2xl">
                    {/* Top-Left Corner */}
                    <div className="absolute -top-0.5 -left-0.5 w-7 h-7 border-t-3 border-l-3 border-blue-400 rounded-tl-xl" />
                    {/* Top-Right Corner */}
                    <div className="absolute -top-0.5 -right-0.5 w-7 h-7 border-t-3 border-r-3 border-blue-400 rounded-tr-xl" />
                    {/* Bottom-Left Corner */}
                    <div className="absolute -bottom-0.5 -left-0.5 w-7 h-7 border-b-3 border-l-3 border-blue-400 rounded-bl-xl" />
                    {/* Bottom-Right Corner */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-7 h-7 border-b-3 border-r-3 border-blue-400 rounded-br-xl" />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Loading Indicator */}
          {isInitializing && !errorMessage && !capturedDataUrl && (
            <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center gap-3 p-6 text-center z-10">
              <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              <p className="text-xs sm:text-sm text-slate-300 font-medium">
                กำลังเปิดกล้องและขอสิทธิ์การเข้าถึง...
              </p>
              <p className="text-[11px] text-slate-500 max-w-xs">
                หากเบราว์เซอร์แจ้งเตือน กรุณากด &quot;อนุญาต&quot; (Allow) เพื่อใช้งานกล้อง
              </p>
            </div>
          )}

          {/* Error Message Box */}
          {errorMessage && !capturedDataUrl && (
            <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center gap-3 p-6 text-center z-20">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-white">ไม่สามารถเปิดกล้องได้</h3>
              <p className="text-xs text-slate-300 max-w-sm leading-relaxed">
                {errorMessage}
              </p>
              <div className="flex items-center gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setIsInitializing(true);
                    setFacingMode((prev) => prev);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  ลองใหม่อีกครั้ง
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  เลือกจากคลังภาพแทน
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between shrink-0">
          {capturedDataUrl ? (
            /* Review Controls */
            <div className="w-full flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleRetake}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs sm:text-sm font-medium text-slate-300 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                ถ่ายใหม่
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                ใช้ภาพนี้
              </button>
            </div>
          ) : (
            /* Live Capture Controls */
            <div className="w-full grid grid-cols-3 items-center">
              {/* Left: Switch camera if available */}
              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={handleToggleFacingMode}
                  disabled={isInitializing || Boolean(errorMessage)}
                  title={facingMode === 'environment' ? 'สลับเป็นกล้องหน้า' : 'สลับเป็นกล้องหลัง'}
                  className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* Center: Large Shutter Button */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleShutter}
                  disabled={isInitializing || Boolean(errorMessage)}
                  aria-label="กดถ่ายภาพ"
                  className="w-16 h-16 rounded-full border-4 border-white p-1 flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group shadow-lg shadow-black/50"
                >
                  <span className="w-full h-full rounded-full bg-white group-hover:bg-slate-100 transition-colors" />
                </button>
              </div>

              {/* Right: Cancel button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


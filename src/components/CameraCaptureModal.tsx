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
  Lock,
  Settings,
  Smartphone,
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
  const binaryString =
    typeof atob === 'function'
      ? atob(parts[1])
      : Buffer.from(parts[1], 'base64').toString('binary');
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
  const [errorType, setErrorType] = useState<'permission' | 'notFound' | 'general' | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isFlashing, setIsFlashing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);

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

  // Progressive camera initialization with 3 fallback levels
  useEffect(() => {
    if (!isOpen) {
      stopStream();
      setCapturedDataUrl(null);
      setErrorMessage(null);
      setErrorType(null);
      setIsInitializing(true);
      return;
    }

    if (capturedDataUrl) {
      // Free camera hardware when reviewing snapshot
      stopStream();
      return;
    }

    let isCancelled = false;
    setIsInitializing(true);
    setErrorMessage(null);
    setErrorType(null);

    const startCamera = async () => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        if (!isCancelled) {
          setIsInitializing(false);
          setErrorType('general');
          setErrorMessage(CAMERA_UNSUPPORTED_ERROR);
        }
        return;
      }

      // Stop any existing stream
      stopStream();

      let stream: MediaStream | null = null;

      // Attempt 1: Target facing mode with high resolution
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch (firstErr: any) {
        console.warn('Attempt 1 failed, trying alternative camera...', firstErr);

        // Attempt 2: Alternative facing mode with standard constraints
        try {
          const altFacing = facingMode === 'environment' ? 'user' : 'environment';
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: altFacing },
            audio: false,
          });
        } catch (secondErr: any) {
          console.warn('Attempt 2 failed, trying bare video constraints...', secondErr);

          // Attempt 3: Bare video constraint (accepts any webcam or camera)
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          } catch (thirdErr: any) {
            if (isCancelled) return;
            setIsInitializing(false);
            console.error('All camera attempts failed:', thirdErr);

            const errName = thirdErr?.name || firstErr?.name || '';
            if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
              setErrorType('permission');
              setErrorMessage(CAMERA_PERMISSION_ERROR);
            } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
              setErrorType('notFound');
              setErrorMessage(CAMERA_NOT_FOUND_ERROR);
            } else {
              setErrorType('general');
              setErrorMessage(CAMERA_GENERAL_ERROR);
            }
            return;
          }
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
          // Playback might be queued
        }
      }
      setIsInitializing(false);
    };

    startCamera();

    return () => {
      isCancelled = true;
      stopStream();
    };
  }, [isOpen, facingMode, capturedDataUrl, retryCount, stopStream]);

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

  // Native camera fallback (device camera / file input)
  const handleNativeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopStream();
    onCapture(file);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
    >
      {/* Hidden Native Camera Fallback Input */}
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleNativeFileChange}
      />

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
                onLoadedMetadata={() => videoRef.current?.play()}
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
                หากเบราว์เซอร์แจ้งเตือน กรุณากด &quot;อนุญาต&quot; (Allow) เพื่อเปิดใช้งานกล้อง
              </p>
            </div>
          )}

          {/* Detailed Error & Troubleshooting View */}
          {errorMessage && !capturedDataUrl && (
            <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-5 text-center z-20 overflow-y-auto">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mb-2 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">
                {errorType === 'permission'
                  ? 'เบราว์เซอร์ยังไม่ได้รับอนุญาตให้ใช้กล้อง'
                  : 'ไม่สามารถเปิดกล้องได้'}
              </h3>
              <p className="text-xs text-slate-300 max-w-xs mb-3 leading-relaxed">
                {errorMessage}
              </p>

              {/* Troubleshooting Instructions for Permission */}
              {errorType === 'permission' && (
                <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3 text-left text-[11px] text-slate-300 w-full max-w-sm mb-3 space-y-1.5">
                  <div className="font-semibold text-amber-300 flex items-center gap-1.5 mb-1">
                    <Lock className="w-3.5 h-3.5" />
                    วิธีเปิดอนุญาตสิทธิ์กล้องในเบราว์เซอร์:
                  </div>
                  <div className="flex items-start gap-1.5 text-slate-300">
                    <span className="text-blue-400 font-bold shrink-0">1.</span>
                    <span>คลิกไอคอน <strong>🔒 กุญแจ</strong> หรือ <strong>📷 กล้อง</strong> ที่แถบ URL ด้านบนซ้าย</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-slate-300">
                    <span className="text-blue-400 font-bold shrink-0">2.</span>
                    <span>เปลี่ยนหัวข้อ <strong>กล้อง (Camera)</strong> เป็น <strong>&quot;อนุญาต&quot; (Allow)</strong></span>
                  </div>
                  <div className="flex items-start gap-1.5 text-slate-300">
                    <span className="text-blue-400 font-bold shrink-0">3.</span>
                    <span>บน Mac: ตรวจสอบที่ <em>System Settings &gt; Privacy &gt; Camera</em> ว่าเปิดให้เบราว์เซอร์แล้ว</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full max-w-sm">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setErrorType(null);
                    setIsInitializing(true);
                    setRetryCount((prev) => prev + 1);
                  }}
                  className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer border border-slate-700"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  ลองใหม่อีกครั้ง
                </button>

                <button
                  type="button"
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer shadow-md shadow-blue-600/30"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  ถ่ายผ่านกล้องมือถือ/เลือกไฟล์
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

              {/* Right: Quick Native Camera / File fallback */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  title="เปิดกล้องอุปกรณ์หรือเลือกรูปจากเครื่องโดยตรง"
                >
                  <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">กล้องมือถือ/ไฟล์</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

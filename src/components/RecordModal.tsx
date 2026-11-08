'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Loader2,
  PackagePlus,
  PencilLine,
  Tag,
  History,
  QrCode,
  Camera,
  Image as ImageIcon,
  Trash2,
  Check,
} from 'lucide-react';
import { AssetRecord, AssetStatus, ASSET_STATUSES } from '@/lib/types';
import { findAssetByCode } from '@/lib/ui-helpers';
import { QrScannerModal } from './QrScannerModal';
import { CameraCaptureModal } from './CameraCaptureModal';

export interface RecordModalFormData {
  assetCode: string;
  name: string;
  location: string;
  status: AssetStatus;
  responsiblePerson: string;
  recordedBy: string;
  notes: string;
  imageUrl?: string;
}

export type AssetInput = RecordModalFormData;

export interface RecordModalProps {
  isOpen: boolean;
  initialData?: AssetRecord | null;
  record?: AssetRecord | null;
  records?: AssetRecord[];
  isSubmitting?: boolean;
  onSubmit?: (data: RecordModalFormData, id?: string) => Promise<void> | void;
  onSave?: (data: RecordModalFormData, id?: string) => Promise<void> | void;
  onClose: () => void;
  onViewHistory?: (assetCode: string) => void;
}

export function RecordModal({
  isOpen,
  initialData,
  record,
  records = [],
  isSubmitting = false,
  onSubmit,
  onSave,
  onClose,
  onViewHistory,
}: RecordModalProps) {
  const activeRecord = record ?? initialData ?? null;
  const isEditing = Boolean(activeRecord);

  const [formData, setFormData] = useState<RecordModalFormData>({
    assetCode: '',
    name: '',
    location: '',
    status: 'พร้อมใช้งาน',
    responsiblePerson: '',
    recordedBy: '',
    notes: '',
    imageUrl: '',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [isStatusModified, setIsStatusModified] = useState(false);
  const [isResponsibleModified, setIsResponsibleModified] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Unique options for datalist memoized to avoid recomputing on every render (must be before early return)
  const datalistOptions = useMemo(
    () =>
      Array.from(
        new Map(
          records
            .filter((r) => r.assetCode && r.assetCode.trim())
            .map((r) => [r.assetCode.trim().toLowerCase(), r])
        ).values()
      ),
    [records]
  );

  // Derive existing asset matching current assetCode from records or initial record
  const existingAsset =
    findAssetByCode(formData.assetCode, records) ||
    (activeRecord &&
    (activeRecord.assetCode || '').trim().toLowerCase() ===
      formData.assetCode.trim().toLowerCase()
      ? activeRecord
      : null);

  useEffect(() => {
    if (isOpen) {
      if (activeRecord) {
        setFormData({
          assetCode: activeRecord.assetCode || '',
          name: activeRecord.name || '',
          location: activeRecord.location || '',
          status: activeRecord.status || 'พร้อมใช้งาน',
          responsiblePerson: activeRecord.responsiblePerson || '',
          recordedBy: activeRecord.recordedBy || '',
          notes: activeRecord.notes || '',
          imageUrl: activeRecord.imageUrl || '',
        });
        setPreviewUrl(activeRecord.imageUrl || null);
        setSelectedFile(null);
      } else {
        setFormData({
          assetCode: '',
          name: '',
          location: '',
          status: 'พร้อมใช้งาน',
          responsiblePerson: '',
          recordedBy: '',
          notes: '',
          imageUrl: '',
        });
        setPreviewUrl(null);
        setSelectedFile(null);
      }
      setIsStatusModified(false);
      setIsResponsibleModified(false);
      setErrors({});

      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => {
        firstInputRef.current?.focus();
      }, 50);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, activeRecord]);

  // Synchronize name, photo, and prefilled fields when assetCode changes
  useEffect(() => {
    if (isEditing) return;
    const existing = findAssetByCode(formData.assetCode, records);
    if (existing) {
      if (!selectedFile && existing.imageUrl) {
        setPreviewUrl(existing.imageUrl);
        setFormData((prev) => ({ ...prev, imageUrl: existing.imageUrl }));
      }
      setFormData((prev) => {
        const needsName = prev.name !== existing.name;
        const needsStatus =
          !isStatusModified && existing.status && prev.status !== existing.status;
        const needsResp =
          !isResponsibleModified &&
          existing.responsiblePerson &&
          prev.responsiblePerson !== existing.responsiblePerson;

        if (!needsName && !needsStatus && !needsResp) return prev;

        return {
          ...prev,
          name: existing.name,
          status: !isStatusModified && existing.status ? existing.status : prev.status,
          responsiblePerson:
            !isResponsibleModified && existing.responsiblePerson
              ? existing.responsiblePerson
              : prev.responsiblePerson,
        };
      });
    } else if (!selectedFile && !activeRecord) {
      setPreviewUrl(null);
      setFormData((prev) => ({ ...prev, imageUrl: '' }));
    }
  }, [formData.assetCode, records, isEditing, isStatusModified, isResponsibleModified, selectedFile, activeRecord]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleAssetCodeChange = (newCode: string) => {
    const existing = findAssetByCode(newCode, records);
    setFormData((prev) => {
      const updated = { ...prev, assetCode: newCode };
      if (existing) {
        updated.name = existing.name;
        if (!isStatusModified && existing.status) {
          updated.status = existing.status;
        }
        if (!isResponsibleModified && existing.responsiblePerson) {
          updated.responsiblePerson = existing.responsiblePerson;
        }
      }
      return updated;
    });

    if (errors.assetCode) setErrors((prev) => ({ ...prev, assetCode: '' }));
    if (existing && errors.name) setErrors((prev) => ({ ...prev, name: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.assetCode.trim()) {
      newErrors.assetCode = 'กรุณากรอกรหัสครุภัณฑ์';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'กรุณากรอกชื่อรายการครุภัณฑ์';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'กรุณากรอกตำแหน่งที่ตั้งล่าสุด';
    }

    if (!formData.responsiblePerson.trim()) {
      newErrors.responsiblePerson = 'กรุณากรอกชื่อผู้รับผิดชอบ';
    }

    if (!formData.recordedBy.trim()) {
      newErrors.recordedBy = 'กรุณากรอกชื่อผู้บันทึก';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setFormData((prev) => ({ ...prev, imageUrl: objectUrl }));
  };

  const handlePhotoCaptured = (file: File) => {
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setFormData((prev) => ({ ...prev, imageUrl: objectUrl }));
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setFormData((prev) => ({ ...prev, imageUrl: '' }));
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const targetId = existingAsset?.id || activeRecord?.id;

    let finalImageUrl = formData.imageUrl;
    if (selectedFile) {
      setIsUploading(true);
      try {
        const uploadData = new FormData();
        uploadData.append('file', selectedFile);
        uploadData.append('assetCode', formData.assetCode.trim() || 'asset');
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: uploadData,
        });
        const uploadJson = await uploadRes.json();
        if (uploadRes.ok && uploadJson.success && uploadJson.url) {
          finalImageUrl = uploadJson.url;
          setUploadError(null);
        } else {
          const errMsg = uploadJson.details || uploadJson.error || 'ไม่สามารถอัปโหลดรูปภาพขึ้น Google Drive ได้';
          setUploadError(`อัปโหลดรูปภาพไม่สำเร็จ: ${errMsg}`);
          setIsUploading(false);
          return;
        }
      } catch (uploadErr: any) {
        console.error('Failed to upload image before saving:', uploadErr);
        setUploadError(`เกิดข้อผิดพลาดในการเชื่อมต่ออัปโหลดรูปภาพ: ${uploadErr?.message || uploadErr}`);
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    // Never submit local blob: URL or oversized base64 to Google Sheets (Sheets max is 50,000 chars)
    let sanitizedImageUrl = finalImageUrl;
    if (sanitizedImageUrl && (sanitizedImageUrl.startsWith('blob:') || sanitizedImageUrl.length > 2000)) {
      sanitizedImageUrl = '';
    }

    const submissionData: RecordModalFormData = {
      ...formData,
      imageUrl: sanitizedImageUrl || '',
    };

    if (onSave) {
      await onSave(submissionData, targetId);
    } else if (onSubmit) {
      await onSubmit(submissionData, targetId);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop with dirty protection to prevent accidental data loss */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (isSubmitting) return;
          const isDirty = Boolean(
            formData.assetCode.trim() ||
            formData.name.trim() ||
            formData.location.trim() ||
            formData.notes?.trim() ||
            selectedFile
          );
          if (isDirty) {
            if (window.confirm('คุณต้องการยกเลิกและปิดหน้าต่างโดยไม่บันทึกข้อมูลใช่หรือไม่?')) {
              onClose();
            }
          } else {
            onClose();
          }
        }}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 z-10 overflow-hidden max-h-[90vh] flex flex-col transform transition-all animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              {isEditing ? (
                <PencilLine className="w-5 h-5" />
              ) : (
                <PackagePlus className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 id="modal-title" className="text-lg font-semibold text-slate-900">
                {isEditing
                  ? 'แก้ไขข้อมูลครุภัณฑ์'
                  : existingAsset
                  ? 'บันทึกการเปลี่ยนแปลงครุภัณฑ์'
                  : 'บันทึกครุภัณฑ์ใหม่'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? 'แก้ไขรายละเอียดครุภัณฑ์'
                  : existingAsset
                  ? 'อัปเดตตำแหน่งหรือสถานะครุภัณฑ์'
                  : 'ระบุข้อมูลครุภัณฑ์เพื่อบันทึกลงระบบ'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="ปิดหน้าต่าง"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body (Scrollable if needed) */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {uploadError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start justify-between gap-2 animate-in fade-in">
              <span>{uploadError}</span>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                aria-label="ปิดการแจ้งเตือน"
                className="text-rose-400 hover:text-rose-600 font-bold p-1 cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>
          )}
          {/* Row 1: Asset Code & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Asset Code */}
            <div>
              <label
                htmlFor="field-assetCode"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
              >
                รหัสครุภัณฑ์ <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  ref={firstInputRef}
                  id="field-assetCode"
                  list="asset-codes-list"
                  type="text"
                  disabled={isEditing}
                  placeholder="เช่น EQ-2026-001"
                  value={formData.assetCode}
                  onChange={(e) => handleAssetCodeChange(e.target.value)}
                  className={`flex-1 min-w-0 px-3.5 py-2 text-sm rounded-xl border ${
                    isEditing
                      ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                      : errors.assetCode
                      ? 'border-rose-400 focus:ring-rose-500/20'
                      : 'border-slate-300 focus:ring-blue-500/20 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 transition-all font-mono tabular-nums`}
                />
                <button
                  type="button"
                  disabled={isEditing}
                  onClick={() => setIsScannerOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-300 rounded-xl transition-colors shrink-0 shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  title="สแกน QR Code จากกล้อง"
                >
                  <QrCode className="w-3.5 h-3.5 text-slate-600" />
                  <span>สแกน QR</span>
                </button>
              </div>
              <datalist id="asset-codes-list">
                {datalistOptions.map((r) => (
                  <option key={r.id || r.assetCode} value={r.assetCode}>
                    {r.name}
                  </option>
                ))}
              </datalist>
              {errors.assetCode && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.assetCode}</p>
              )}
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="field-status"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
              >
                สถานะ
              </label>
              <select
                id="field-status"
                value={formData.status}
                onChange={(e) => {
                  setIsStatusModified(true);
                  setFormData({
                    ...formData,
                    status: e.target.value as AssetStatus,
                  });
                }}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
              >
                {ASSET_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Banner: Green if asset found in records, Orange if not found and typed */}
          {existingAsset ? (
            <div
              data-testid="existing-asset-banner"
              className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3.5 text-xs text-emerald-900 space-y-2 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>พบข้อมูลครุภัณฑ์เดิมในระบบ</span>
                </div>
                <button
                  type="button"
                  onClick={() => onViewHistory?.(existingAsset.assetCode)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg transition-colors border border-emerald-300/60 shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <History className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>ดูประวัติ</span>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-emerald-850 text-xs pt-1.5 border-t border-emerald-200/60">
                <div>
                  <span className="text-emerald-700 font-medium">ตำแหน่งเดิม:</span>{' '}
                  <span className="font-semibold text-emerald-950">
                    {existingAsset.location || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-emerald-700 font-medium">ผู้รับผิดชอบเดิม:</span>{' '}
                  <span className="font-semibold text-emerald-950">
                    {existingAsset.responsiblePerson || '—'}
                  </span>
                </div>
              </div>
            </div>
          ) : formData.assetCode.trim() !== '' ? (
            <div
              data-testid="new-asset-banner"
              className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 flex items-center gap-2 animate-in fade-in duration-150"
            >
              <Tag className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="font-semibold text-amber-800">
                รหัสใหม่ (พร้อมลงทะเบียน)
              </span>
            </div>
          ) : null}

          {/* Asset Name */}
          <div>
            <label
              htmlFor="field-name"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
            >
              ชื่อรายการครุภัณฑ์ <span className="text-rose-500">*</span>
            </label>
            <input
              id="field-name"
              type="text"
              disabled={Boolean(existingAsset)}
              placeholder="เช่น คอมพิวเตอร์ All-in-One Dell OptiPlex"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              className={`w-full px-3.5 py-2 text-sm rounded-xl border ${
                existingAsset
                  ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                  : errors.name
                  ? 'border-rose-400 focus:ring-rose-500/20'
                  : 'border-slate-300 focus:ring-blue-500/20 focus:border-blue-500'
              } focus:outline-none focus:ring-2 transition-all`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-rose-600 font-medium">{errors.name}</p>
            )}
          </div>

          {/* Location */}
          <div>
            <label
              htmlFor="field-location"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
            >
              ตำแหน่งที่ตั้งล่าสุด <span className="text-rose-500">*</span>
            </label>
            <input
              id="field-location"
              type="text"
              placeholder="เช่น อาคาร 1 ชั้น 3 ห้อง 301"
              value={formData.location}
              onChange={(e) => {
                setFormData({ ...formData, location: e.target.value });
                if (errors.location) setErrors({ ...errors, location: '' });
              }}
              className={`w-full px-3.5 py-2 text-sm rounded-xl border ${
                errors.location
                  ? 'border-rose-400 focus:ring-rose-500/20'
                  : 'border-slate-300 focus:ring-blue-500/20 focus:border-blue-500'
              } focus:outline-none focus:ring-2 transition-all`}
            />
            {errors.location && (
              <p className="mt-1 text-xs text-rose-600 font-medium">{errors.location}</p>
            )}
          </div>

          {/* Responsible Person & Recorded By Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="field-responsiblePerson"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
              >
                ผู้รับผิดชอบ <span className="text-rose-500">*</span>
              </label>
              <input
                id="field-responsiblePerson"
                type="text"
                placeholder="เช่น สมชาย ใจดี (ฝ่ายไอที)"
                value={formData.responsiblePerson}
                onChange={(e) => {
                  setIsResponsibleModified(true);
                  setFormData({ ...formData, responsiblePerson: e.target.value });
                  if (errors.responsiblePerson) setErrors({ ...errors, responsiblePerson: '' });
                }}
                className={`w-full px-3.5 py-2 text-sm rounded-xl border ${
                  errors.responsiblePerson
                    ? 'border-rose-400 focus:ring-rose-500/20'
                    : 'border-slate-300 focus:ring-blue-500/20 focus:border-blue-500'
                } focus:outline-none focus:ring-2 transition-all`}
              />
              {errors.responsiblePerson && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.responsiblePerson}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="field-recordedBy"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
              >
                ผู้บันทึก <span className="text-rose-500">*</span>
              </label>
              <input
                id="field-recordedBy"
                type="text"
                placeholder="เช่น เจ้าหน้าที่พัสดุ A"
                value={formData.recordedBy}
                onChange={(e) => {
                  setFormData({ ...formData, recordedBy: e.target.value });
                  if (errors.recordedBy) setErrors({ ...errors, recordedBy: '' });
                }}
                className={`w-full px-3.5 py-2 text-sm rounded-xl border ${
                  errors.recordedBy
                    ? 'border-rose-400 focus:ring-rose-500/20'
                    : 'border-slate-300 focus:ring-blue-500/20 focus:border-blue-500'
                } focus:outline-none focus:ring-2 transition-all`}
              />
              {errors.recordedBy && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.recordedBy}</p>
              )}
            </div>
          </div>

          {/* Asset Photo Section */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              รูปภาพครุภัณฑ์
            </label>

            {/* Hidden native input for gallery/file picker */}
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {previewUrl ? (
              <div className="relative border border-slate-200 rounded-xl p-3 bg-slate-50/70 flex items-center gap-3.5">
                <img
                  src={previewUrl}
                  alt="พรีวิวรูปภาพครุภัณฑ์"
                  className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border border-slate-200 shrink-0 bg-white shadow-2xs"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-800 truncate">
                    {selectedFile
                      ? selectedFile.name
                      : existingAsset
                      ? `รูปล่าสุดของ ${existingAsset.assetCode}`
                      : 'รูปภาพครุภัณฑ์'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {selectedFile
                      ? `${(selectedFile.size / 1024).toFixed(0)} KB • พร้อมอัปโหลดขึ้น Google Drive`
                      : 'บันทึกอยู่ในฐานข้อมูล Google Drive แล้ว'}
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      type="button"
                      onClick={() => setIsCameraModalOpen(true)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      ถ่ายใหม่
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      เลือกรูปอื่น
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-800 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      ลบรูป
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setIsCameraModalOpen(true)}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 hover:bg-blue-50/60 hover:border-blue-300 hover:text-blue-700 transition-all text-xs sm:text-sm font-medium text-slate-700 cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-blue-500" />
                  <span>ถ่ายภาพสด</span>
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 hover:bg-emerald-50/60 hover:border-emerald-300 hover:text-emerald-700 transition-all text-xs sm:text-sm font-medium text-slate-700 cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-emerald-500" />
                  <span>เลือกจากคลังภาพ</span>
                </button>
              </div>
            )}
          </div>

          {/* Notes Field */}
          <div>
            <label
              htmlFor="field-notes"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
            >
              หมายเหตุ
            </label>
            <textarea
              id="field-notes"
              rows={3}
              placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี)..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none cursor-pointer"
            >
              {isSubmitting || isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isUploading ? 'กำลังอัปโหลดรูปภาพ...' : isEditing || existingAsset ? 'กำลังบันทึก...' : 'กำลังสร้าง...'}</span>
                </>
              ) : (
                <span>{isEditing || existingAsset ? 'บันทึกการเปลี่ยนแปลง' : 'บันทึกข้อมูล'}</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* QR Code Mobile Scanner Modal */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(cleanCode) => {
          handleAssetCodeChange(cleanCode);
        }}
      />

      {/* Live Camera Viewfinder Modal */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handlePhotoCaptured}
      />
    </div>
  );
}

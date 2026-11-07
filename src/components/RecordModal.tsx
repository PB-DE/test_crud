'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, PackagePlus, PencilLine } from 'lucide-react';
import { AssetRecord, AssetStatus, ASSET_STATUSES } from '@/lib/types';

export interface RecordModalFormData {
  assetCode: string;
  name: string;
  location: string;
  status: AssetStatus;
  responsiblePerson: string;
  recordedBy: string;
  notes: string;
}

export interface RecordModalProps {
  isOpen: boolean;
  initialData?: AssetRecord | null;
  isSubmitting: boolean;
  onSubmit: (data: RecordModalFormData) => Promise<void> | void;
  onClose: () => void;
}

export function RecordModal({
  isOpen,
  initialData,
  isSubmitting,
  onSubmit,
  onClose,
}: RecordModalProps) {
  const [formData, setFormData] = useState<RecordModalFormData>({
    assetCode: '',
    name: '',
    location: '',
    status: 'พร้อมใช้งาน',
    responsiblePerson: '',
    recordedBy: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const firstInputRef = useRef<HTMLInputElement>(null);

  const isEditing = Boolean(initialData);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          assetCode: initialData.assetCode || '',
          name: initialData.name || '',
          location: initialData.location || '',
          status: initialData.status || 'พร้อมใช้งาน',
          responsiblePerson: initialData.responsiblePerson || '',
          recordedBy: initialData.recordedBy || '',
          notes: initialData.notes || '',
        });
      } else {
        setFormData({
          assetCode: '',
          name: '',
          location: '',
          status: 'พร้อมใช้งาน',
          responsiblePerson: '',
          recordedBy: '',
          notes: '',
        });
      }
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
  }, [isOpen, initialData]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(formData);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={() => !isSubmitting && onClose()}
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
                {isEditing ? 'แก้ไขข้อมูลครุภัณฑ์' : 'บันทึกครุภัณฑ์ใหม่'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? 'อัปเดตข้อมูลรายละเอียดครุภัณฑ์ในระบบ'
                  : 'กรอกรายละเอียดครุภัณฑ์เพื่อบันทึกลงระบบ Google Sheets'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="ปิดหน้าต่าง"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body (Scrollable if needed) */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
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
              <input
                ref={firstInputRef}
                id="field-assetCode"
                type="text"
                placeholder="เช่น EQ-2026-001"
                value={formData.assetCode}
                onChange={(e) => {
                  setFormData({ ...formData, assetCode: e.target.value });
                  if (errors.assetCode) setErrors({ ...errors, assetCode: '' });
                }}
                className={`w-full px-3.5 py-2 text-sm rounded-xl border ${
                  errors.assetCode
                    ? 'border-rose-400 focus:ring-rose-500/20'
                    : 'border-slate-300 focus:ring-blue-500/20 focus:border-blue-500'
                } focus:outline-none focus:ring-2 transition-all font-mono`}
              />
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
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as AssetStatus,
                  })
                }
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                {ASSET_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

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
              placeholder="เช่น คอมพิวเตอร์ All-in-One Dell OptiPlex"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              className={`w-full px-3.5 py-2 text-sm rounded-xl border ${
                errors.name
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

          {/* Notes Field */}
          <div>
            <label
              htmlFor="field-notes"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
            >
              หมายเหตุ <span className="text-slate-400 font-normal lowercase">(ไม่บังคับ)</span>
            </label>
            <textarea
              id="field-notes"
              rows={3}
              placeholder="เพิ่มรายละเอียดหรือหมายเหตุเพิ่มเติม เช่น สภาพอุปกรณ์ วันที่ตรวจนับ..."
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
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isEditing ? 'กำลังบันทึก...' : 'กำลังสร้าง...'}</span>
                </>
              ) : (
                <span>{isEditing ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

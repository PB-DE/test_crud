'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, UserPlus, PencilLine } from 'lucide-react';
import { RecordItem, RecordStatus, RECORD_STATUSES } from '@/lib/types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface RecordModalFormData {
  name: string;
  email: string;
  role: string;
  status: RecordStatus;
  notes: string;
}

export interface RecordModalProps {
  isOpen: boolean;
  initialData?: RecordItem | null;
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
    name: '',
    email: '',
    role: '',
    status: 'Active',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const firstInputRef = useRef<HTMLInputElement>(null);

  const isEditing = Boolean(initialData);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          name: initialData.name,
          email: initialData.email,
          role: initialData.role,
          status: initialData.status,
          notes: initialData.notes || '',
        });
      } else {
        setFormData({
          name: '',
          email: '',
          role: '',
          status: 'Active',
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

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!EMAIL_REGEX.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.role.trim()) {
      newErrors.role = 'Role or job title is required';
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
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 z-10 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              {isEditing ? (
                <PencilLine className="w-5 h-5" />
              ) : (
                <UserPlus className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 id="modal-title" className="text-lg font-semibold text-slate-900">
                {isEditing ? 'Edit Record' : 'Add New Record'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? 'Update information for this member'
                  : 'Fill in the details to add a new record to the sheet'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name Field */}
          <div>
            <label
              htmlFor="field-name"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
            >
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              ref={firstInputRef}
              id="field-name"
              type="text"
              placeholder="e.g. Alexandra Vance"
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

          {/* Email Field */}
          <div>
            <label
              htmlFor="field-email"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
            >
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              id="field-email"
              type="email"
              placeholder="e.g. alexandra@example.com"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
              className={`w-full px-3.5 py-2 text-sm rounded-xl border ${
                errors.email
                  ? 'border-rose-400 focus:ring-rose-500/20'
                  : 'border-slate-300 focus:ring-blue-500/20 focus:border-blue-500'
              } focus:outline-none focus:ring-2 transition-all`}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-rose-600 font-medium">{errors.email}</p>
            )}
          </div>

          {/* Role and Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="field-role"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
              >
                Role / Title <span className="text-rose-500">*</span>
              </label>
              <input
                id="field-role"
                type="text"
                placeholder="e.g. Software Engineer"
                value={formData.role}
                onChange={(e) => {
                  setFormData({ ...formData, role: e.target.value });
                  if (errors.role) setErrors({ ...errors, role: '' });
                }}
                className={`w-full px-3.5 py-2 text-sm rounded-xl border ${
                  errors.role
                    ? 'border-rose-400 focus:ring-rose-500/20'
                    : 'border-slate-300 focus:ring-blue-500/20 focus:border-blue-500'
                } focus:outline-none focus:ring-2 transition-all`}
              />
              {errors.role && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.role}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="field-status"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
              >
                Status
              </label>
              <select
                id="field-status"
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as RecordStatus,
                  })
                }
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                {RECORD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes Field */}
          <div>
            <label
              htmlFor="field-notes"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1"
            >
              Notes <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <textarea
              id="field-notes"
              rows={3}
              placeholder="Add any additional details or background notes..."
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isEditing ? 'Saving...' : 'Creating...'}</span>
                </>
              ) : (
                <span>{isEditing ? 'Save Changes' : 'Create Record'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

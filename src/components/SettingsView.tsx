'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Settings2,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
  ListFilter,
  SlidersHorizontal,
  GitBranch,
  AlertCircle,
} from 'lucide-react';
import {
  DropdownOption,
  DropdownFieldKey,
  FieldSetting,
  ConfigurableFieldKey,
  DEFAULT_FIELD_SETTINGS,
} from '@/lib/types';
import { Toast, ToastProps } from '@/components/Toast';

export function SettingsView() {
  const [options, setOptions] = useState<DropdownOption[]>([]);
  const [fieldSettings, setFieldSettings] = useState<FieldSetting[]>(DEFAULT_FIELD_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Active dropdown field tab
  const [activeFieldTab, setActiveFieldTab] = useState<DropdownFieldKey>('mainCategory');

  // Add new option state
  const [newValue, setNewValue] = useState('');
  const [newParentValue, setNewParentValue] = useState('');
  const [isAddingOption, setIsAddingOption] = useState(false);

  // Filter for subCategory view
  const [subCategoryParentFilter, setSubCategoryParentFilter] = useState<string>('ALL');

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [editingParentValue, setEditingParentValue] = useState('');
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<Omit<ToastProps, 'onDismiss'> | null>(null);

  const showToast = useCallback(
    (type: ToastProps['type'], message: string, title?: string) => {
      setToast({
        id: Math.random().toString(36).substring(2, 9),
        type,
        message,
        title,
      });
    },
    []
  );

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/options');
      const json = await res.json();
      if (res.ok && json.success) {
        setOptions(json.data.options || []);
        setFieldSettings(json.data.fieldSettings || DEFAULT_FIELD_SETTINGS);
      } else {
        showToast('error', json.error || 'ไม่สามารถโหลดการตั้งค่าได้');
      }
    } catch {
      showToast('error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อโหลดการตั้งค่าได้');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Fields that currently have dropdown enabled (available as tabs in Section 2)
  const dropdownEnabledFields = useMemo(() => {
    return fieldSettings.filter((f) => f.supportsDropdown && f.useDropdown);
  }, [fieldSettings]);

  // Ensure active tab stays valid when toggles change
  useEffect(() => {
    if (
      dropdownEnabledFields.length > 0 &&
      !dropdownEnabledFields.some((f) => f.fieldKey === activeFieldTab)
    ) {
      setActiveFieldTab(dropdownEnabledFields[0].fieldKey as DropdownFieldKey);
    }
  }, [dropdownEnabledFields, activeFieldTab]);

  // Main categories list for linking subCategories
  const mainCategoryOptions = useMemo(
    () => options.filter((o) => o.fieldKey === 'mainCategory'),
    [options]
  );

  // Auto-select first mainCategory when switching to subCategory tab
  useEffect(() => {
    if (activeFieldTab === 'subCategory' && !newParentValue && mainCategoryOptions.length > 0) {
      setNewParentValue(mainCategoryOptions[0].value);
    }
  }, [activeFieldTab, newParentValue, mainCategoryOptions]);

  const handleToggleSetting = async (
    fieldKey: ConfigurableFieldKey,
    prop: 'required' | 'useDropdown'
  ) => {
    const previous = fieldSettings;
    const next = fieldSettings.map((s) =>
      s.fieldKey === fieldKey ? { ...s, [prop]: !s[prop] } : s
    );
    setFieldSettings(next);
    setIsSavingSettings(true);

    try {
      const res = await fetch('/api/options', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldSettings: next }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFieldSettings(previous);
        showToast('error', json.error || 'บันทึกการตั้งค่าฟิลด์ไม่สำเร็จ');
      } else {
        setFieldSettings(json.data);
        showToast('success', 'อัปเดตการตั้งค่าฟิลด์เรียบร้อยแล้ว');
      }
    } catch {
      setFieldSettings(previous);
      showToast('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newValue.trim();
    if (!trimmed) return;

    if (activeFieldTab === 'subCategory' && !newParentValue.trim()) {
      showToast('error', 'กรุณาเลือกประเภทหลักก่อนเพิ่มประเภทย่อย');
      return;
    }

    setIsAddingOption(true);
    try {
      const res = await fetch('/api/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldKey: activeFieldTab,
          value: trimmed,
          parentValue: activeFieldTab === 'subCategory' ? newParentValue : undefined,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setNewValue('');
        await fetchAll();
        showToast('success', `เพิ่มตัวเลือก "${trimmed}" เรียบร้อยแล้ว`);
      } else {
        showToast('error', json.error || 'ไม่สามารถเพิ่มตัวเลือกได้');
      }
    } catch {
      showToast('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsAddingOption(false);
    }
  };

  const startEditing = (opt: DropdownOption) => {
    setEditingId(opt.id);
    setEditingValue(opt.value);
    setEditingParentValue(opt.parentValue || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingValue('');
    setEditingParentValue('');
  };

  const handleSaveEdit = async (opt: DropdownOption) => {
    const trimmed = editingValue.trim();
    if (!trimmed) return;

    if (opt.fieldKey === 'subCategory' && !editingParentValue.trim()) {
      showToast('error', 'กรุณาเลือกประเภทหลัก');
      return;
    }

    setIsUpdatingId(opt.id);
    try {
      const res = await fetch('/api/options', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: opt.id,
          value: trimmed,
          parentValue: opt.fieldKey === 'subCategory' ? editingParentValue : undefined,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        cancelEditing();
        await fetchAll();
        showToast('success', 'แก้ไขตัวเลือกเรียบร้อยแล้ว');
      } else {
        showToast('error', json.error || 'ไม่สามารถแก้ไขตัวเลือกได้');
      }
    } catch {
      showToast('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsUpdatingId(null);
    }
  };

  const handleDeleteOption = async (opt: DropdownOption) => {
    setDeletingId(opt.id);
    try {
      const res = await fetch(`/api/options?id=${encodeURIComponent(opt.id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (res.ok && json.success) {
        await fetchAll();
        showToast('success', `ลบตัวเลือก "${opt.value}" เรียบร้อยแล้ว`);
      } else {
        showToast('error', json.error || 'ไม่สามารถลบตัวเลือกได้');
      }
    } catch {
      showToast('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setDeletingId(null);
    }
  };

  const visibleOptions = useMemo(() => {
    const filtered = options.filter((o) => o.fieldKey === activeFieldTab);
    if (activeFieldTab === 'subCategory' && subCategoryParentFilter !== 'ALL') {
      return filtered.filter((o) => o.parentValue === subCategoryParentFilter);
    }
    return filtered;
  }, [options, activeFieldTab, subCategoryParentFilter]);

  const activeFieldLabel =
    fieldSettings.find((f) => f.fieldKey === activeFieldTab)?.label || activeFieldTab;

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col">
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <Toast {...toast} onDismiss={() => setToast(null)} />
        </div>
      )}

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Top Bar */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-2.5 rounded-2xl bg-slate-900 text-white shadow-sm shrink-0">
              <Settings2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                ตั้งค่าฟิลด์และตัวเลือก Dropdown
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                กำหนดฟิลด์บังคับกรอก, รูปแบบการกรอก และจัดการรายการตัวเลือกใน Google Sheets
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400 shadow-2xs transition-all active:scale-[0.98] self-start sm:self-auto min-h-[42px]"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>กลับหน้า Dashboard</span>
          </Link>
        </header>

        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center gap-3 shadow-xs">
            <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
            <p className="text-sm text-slate-600 font-medium">กำลังโหลดข้อมูลการตั้งค่า...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Section 1: Field Rules Configuration */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-5 py-4 sm:px-6 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <SlidersHorizontal className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      1. กำหนดคุณสมบัติของแต่ละฟิลด์ในฟอร์มบันทึก
                    </h2>
                    <p className="text-xs text-slate-600">
                      เลือกได้ว่าฟิลด์ไหนต้องบังคับกรอก (Required) และฟิลด์ไหนให้เลือกจาก Dropdown หรือพิมพ์เอง
                    </p>
                  </div>
                </div>
                {isSavingSettings && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 shrink-0">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    กำลังบันทึก...
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/40 text-xs font-semibold text-slate-600">
                      <th className="py-3 px-5">ชื่อฟิลด์ข้อมูล</th>
                      <th className="py-3 px-5">ชื่อคีย์ / คอลัมน์ในชีต</th>
                      <th className="py-3 px-5 text-center w-40">บังคับกรอก (Required)</th>
                      <th className="py-3 px-5 text-center w-44">ใช้ Dropdown</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {/* System core fixed rows info */}
                    <tr className="bg-slate-50/40">
                      <td className="py-3 px-5 font-medium text-slate-900">
                        รหัสครุภัณฑ์ / สถานะ
                      </td>
                      <td className="py-3 px-5 text-xs font-mono text-slate-600">
                        assetCode, status
                      </td>
                      <td className="py-3 px-5 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          บังคับเสมอ (หลัก)
                        </span>
                      </td>
                      <td className="py-3 px-5 text-center">
                        <span className="text-xs text-slate-600">ค่าคงที่ของระบบ</span>
                      </td>
                    </tr>

                    {fieldSettings.map((setting) => (
                      <tr key={setting.fieldKey} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-5 font-medium text-slate-900">
                          {setting.label}
                          {setting.fieldKey === 'subCategory' && (
                            <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200/80">
                              <GitBranch className="w-3 h-3" />
                              ผูกกับประเภทหลัก
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-xs font-mono text-slate-600">
                          {setting.fieldKey}
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={setting.required}
                            aria-label={`สลับบังคับกรอกสำหรับ ${setting.label}`}
                            onClick={() => handleToggleSetting(setting.fieldKey, 'required')}
                            disabled={isSavingSettings}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:opacity-60 ${
                              setting.required ? 'bg-blue-600' : 'bg-slate-300'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ${
                                setting.required ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          {setting.supportsDropdown ? (
                            <button
                              type="button"
                              role="switch"
                              aria-checked={setting.useDropdown}
                              aria-label={`สลับใช้ Dropdown สำหรับ ${setting.label}`}
                              onClick={() => handleToggleSetting(setting.fieldKey, 'useDropdown')}
                              disabled={isSavingSettings}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:opacity-60 ${
                                setting.useDropdown ? 'bg-emerald-600' : 'bg-slate-300'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ${
                                  setting.useDropdown ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          ) : (
                            <span className="text-xs text-slate-600">
                              {setting.fieldKey === 'acquisitionDate'
                                ? 'ช่องเลือกวันที่'
                                : setting.fieldKey === 'unitPrice'
                                  ? 'ช่องตัวเลข'
                                  : 'ช่องข้อความยาว'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 2: Dropdown Options CRUD Manager */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-5 py-4 sm:px-6 border-b border-slate-200/80 bg-slate-50/60 flex items-center gap-2.5">
                <ListFilter className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    2. เพิ่ม / แก้ไข / ลบ รายการตัวเลือก Dropdown
                  </h2>
                  <p className="text-xs text-slate-600">
                    แสดงเฉพาะฟิลด์ที่เปิดใช้งาน Dropdown ด้านบน โดยประเภทย่อยจะถูกผูกไว้ภายใต้ประเภทหลักที่เลือก
                  </p>
                </div>
              </div>

              {dropdownEnabledFields.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-600">
                  ยังไม่มีฟิลด์ที่เปิดใช้ Dropdown กรุณาเปิดสวิตช์ &ldquo;ใช้ Dropdown&rdquo; ในตารางด้านบนก่อน
                </div>
              ) : (
                <div className="p-5 sm:p-6 space-y-5">
                  {/* Tabs for Dropdown-enabled fields */}
                  <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
                    {dropdownEnabledFields.map((field) => {
                      const count = options.filter((o) => o.fieldKey === field.fieldKey).length;
                      const isActive = activeFieldTab === field.fieldKey;
                      return (
                        <button
                          key={field.fieldKey}
                          type="button"
                          onClick={() => {
                            setActiveFieldTab(field.fieldKey as DropdownFieldKey);
                            cancelEditing();
                            setSubCategoryParentFilter('ALL');
                          }}
                          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all active:scale-[0.98] cursor-pointer min-h-[40px] ${
                            isActive
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900'
                          }`}
                        >
                          <span>{field.label}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[11px] font-semibold tabular-nums ${
                              isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-white text-slate-700 border border-slate-200'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Warning if subCategory selected but no mainCategory exists */}
                  {activeFieldTab === 'subCategory' && mainCategoryOptions.length === 0 ? (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-center gap-3 text-sm text-amber-800">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                      <span>
                        ยังไม่มีรายการ <strong>ประเภทหลัก</strong> กรุณาเพิ่มประเภทหลักอย่างน้อย 1 รายการก่อน จึงจะเพิ่มประเภทย่อยที่ผูกกันได้
                      </span>
                    </div>
                  ) : (
                    /* Add Option Form */
                    <form
                      onSubmit={handleAddOption}
                      className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 bg-slate-50/80 p-4 rounded-xl border border-slate-200/90"
                    >
                      {activeFieldTab === 'subCategory' && (
                        <div className="sm:w-64 shrink-0">
                          <label
                            htmlFor="new-parent-category"
                            className="block text-xs font-semibold text-slate-700 mb-1.5"
                          >
                            อยู่ภายใต้ประเภทหลัก <span className="text-rose-500">*</span>
                          </label>
                          <select
                            id="new-parent-category"
                            value={newParentValue}
                            onChange={(e) => setNewParentValue(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[42px]"
                          >
                            {mainCategoryOptions.map((mc) => (
                              <option key={mc.id} value={mc.value}>
                                {mc.value}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="flex-1">
                        <label
                          htmlFor="new-option-value"
                          className="block text-xs font-semibold text-slate-700 mb-1.5"
                        >
                          เพิ่มตัวเลือกใหม่สำหรับ &ldquo;{activeFieldLabel}&rdquo;
                        </label>
                        <input
                          id="new-option-value"
                          type="text"
                          value={newValue}
                          onChange={(e) => setNewValue(e.target.value)}
                          placeholder={`ระบุชื่อ${activeFieldLabel}...`}
                          className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[42px]"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isAddingOption || !newValue.trim()}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-h-[42px]"
                      >
                        {isAddingOption ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                        <span>เพิ่มตัวเลือก</span>
                      </button>
                    </form>
                  )}

                  {/* Optional parent filter when viewing subCategory */}
                  {activeFieldTab === 'subCategory' && mainCategoryOptions.length > 0 && (
                    <div className="flex items-center gap-2.5 text-xs">
                      <span className="font-medium text-slate-700">กรองตามประเภทหลัก:</span>
                      <select
                        value={subCategoryParentFilter}
                        onChange={(e) => setSubCategoryParentFilter(e.target.value)}
                        className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[36px]"
                      >
                        <option value="ALL">แสดงทุกประเภทหลัก</option>
                        {mainCategoryOptions.map((mc) => (
                          <option key={mc.id} value={mc.value}>
                            {mc.value}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Options List */}
                  {visibleOptions.length === 0 ? (
                    <div className="py-10 text-center text-sm text-slate-600 border border-dashed border-slate-200 rounded-xl">
                      ยังไม่มีตัวเลือกในหมวดนี้
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                      {visibleOptions.map((opt) => {
                        const isEditingRow = editingId === opt.id;
                        const isUpdatingRow = isUpdatingId === opt.id;
                        const isDeletingRow = deletingId === opt.id;

                        return (
                          <div
                            key={opt.id}
                            className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50/50 transition-colors"
                          >
                            {isEditingRow ? (
                              <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                                {opt.fieldKey === 'subCategory' && (
                                  <select
                                    value={editingParentValue}
                                    onChange={(e) => setEditingParentValue(e.target.value)}
                                    aria-label="เลือกประเภทหลัก"
                                    className="sm:w-52 px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 min-h-[38px]"
                                  >
                                    {mainCategoryOptions.map((mc) => (
                                      <option key={mc.id} value={mc.value}>
                                        {mc.value}
                                      </option>
                                    ))}
                                  </select>
                                )}
                                <input
                                  type="text"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  aria-label="แก้ไขชื่อตัวเลือก"
                                  className="flex-1 px-3 py-1.5 text-sm border border-blue-400 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[38px]"
                                  autoFocus
                                />
                                <div className="flex items-center gap-1.5 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(opt)}
                                    disabled={isUpdatingRow || !editingValue.trim()}
                                    aria-label="บันทึกการแก้ไข"
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50 min-h-[38px]"
                                  >
                                    {isUpdatingRow ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5" />
                                    )}
                                    บันทึก
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEditing}
                                    disabled={isUpdatingRow}
                                    aria-label="ยกเลิกการแก้ไข"
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer min-h-[38px]"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    ยกเลิก
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex flex-wrap items-center gap-2 min-w-0">
                                  <span className="text-sm font-medium text-slate-900 break-words">
                                    {opt.value}
                                  </span>
                                  {opt.fieldKey === 'subCategory' && opt.parentValue && (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/80">
                                      <GitBranch className="w-3 h-3" />
                                      {opt.parentValue}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => startEditing(opt)}
                                    disabled={Boolean(isDeletingRow)}
                                    aria-label={`แก้ไข ${opt.value}`}
                                    title="แก้ไขชื่อตัวเลือก"
                                    className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all active:scale-95 cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteOption(opt)}
                                    disabled={isDeletingRow}
                                    aria-label={`ลบ ${opt.value}`}
                                    title="ลบตัวเลือก"
                                    className="p-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all active:scale-95 cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center disabled:opacity-40"
                                  >
                                    {isDeletingRow ? (
                                      <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}


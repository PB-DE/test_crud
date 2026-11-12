'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Boxes,
  Plus,
  RefreshCw,
  Sparkles,
  History,
  ExternalLink,
  FileSpreadsheet,
  Settings2,
  Users,
  LogOut,
  QrCode,
  Shield,
  ClipboardCheck,
} from 'lucide-react';
import {
  AssetRecord,
  AssetLogRecord,
  DropdownOption,
  FieldSetting,
  DEFAULT_FIELD_SETTINGS,
  SessionUser,
} from '@/lib/types';
import {
  filterRecords,
  sortRecords,
  SortField,
  SortDirection,
} from '@/lib/filter-utils';
import { reconcileAssetRecords, findAssetByCode } from '@/lib/ui-helpers';
import { SetupBanner } from '@/components/SetupBanner';
import { RecordTable } from '@/components/RecordTable';
import { RecordModal, RecordModalFormData } from '@/components/RecordModal';
import { DeleteDialog } from '@/components/DeleteDialog';
import { LogHistoryModal } from '@/components/LogHistoryModal';
import { ReportModal } from '@/components/ReportModal';
import { QrScannerModal } from '@/components/QrScannerModal';
import { Toast, ToastProps } from '@/components/Toast';

export default function DashboardView() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [isStaffScannerOpen, setIsStaffScannerOpen] = useState(false);

  // Data state
  const [records, setRecords] = useState<AssetRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Status state
  const [statusData, setStatusData] = useState<{
    configured: boolean;
    sheetId?: string;
  }>({
    configured: false,
  });
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ทั้งหมด');
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Modal & Dialog state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AssetRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<AssetRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Change logs history state
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyTargetAsset, setHistoryTargetAsset] = useState<AssetRecord | null>(null);
  const [historyLogs, setHistoryLogs] = useState<AssetLogRecord[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Status report modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Dropdown options & field configuration state
  const [dropdownOptions, setDropdownOptions] = useState<DropdownOption[]>([]);
  const [fieldSettings, setFieldSettings] = useState<FieldSetting[]>(DEFAULT_FIELD_SETTINGS);

  // Toast notification state
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

  // Fetch connection status
  const fetchStatus = useCallback(async () => {
    setIsCheckingStatus(true);
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setStatusData({
          configured: Boolean(data.configured),
          sheetId: data.sheetId,
        });
      }
    } catch (err) {
      console.error('Failed to check status:', err);
    } finally {
      setIsCheckingStatus(false);
    }
  }, []);

  // Fetch records
  const fetchRecords = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoadingRecords(true);
      else setIsRefreshing(true);

      try {
        const res = await fetch('/api/records');
        const json = await res.json();

        if (res.ok && json.success) {
          setRecords(json.data || []);
        } else {
          const msg = json.details ? `${json.error}: ${json.details}` : (json.error || 'ไม่สามารถโหลดข้อมูลครุภัณฑ์ได้');
          showToast('error', msg, 'เกิดข้อผิดพลาด');
        }
      } catch (err) {
        console.error('Failed to fetch records:', err);
        showToast('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย', 'การเชื่อมต่อขัดข้อง');
      } finally {
        setIsLoadingRecords(false);
        setIsRefreshing(false);
      }
    },
    [showToast]
  );

  // Fetch dropdown options and field settings
  const fetchOptions = useCallback(async () => {
    try {
      const res = await fetch('/api/options');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setDropdownOptions(json.data.options || []);
          setFieldSettings(json.data.fieldSettings || DEFAULT_FIELD_SETTINGS);
        }
      }
    } catch (err) {
      console.error('Failed to fetch options:', err);
    }
  }, []);

  // Fetch authenticated user session
  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.user) {
          setCurrentUser(json.user);
        }
      }
    } catch (err) {
      console.error('Failed to fetch current user:', err);
    }
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
      router.refresh();
    }
  };

  // Initial load
  useEffect(() => {
    fetchCurrentUser();
    fetchStatus();
    fetchRecords();
    fetchOptions();
  }, [fetchCurrentUser, fetchStatus, fetchRecords, fetchOptions]);

  // Handle sort column click
  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filtered and sorted records
  const filteredAndSortedRecords = useMemo(() => {
    const filtered = filterRecords(records, searchQuery, statusFilter);
    return sortRecords(filtered, sortField, sortDirection);
  }, [records, searchQuery, statusFilter, sortField, sortDirection]);

  // Handle Save Record (Create or Update with table state reconciliation)
  const handleSaveRecord = async (
    formData: RecordModalFormData,
    targetId?: string
  ) => {
    setIsSubmitting(true);
    const idToUpdate = targetId || editingRecord?.id;
    const isUpdate = Boolean(idToUpdate);
    const isStaffInspection = currentUser?.role === 'staff' || Boolean(formData.isInspection);
    const url = isUpdate ? `/api/records/${idToUpdate}` : '/api/records';
    const method = isUpdate ? 'PUT' : 'POST';

    const requestPayload = isStaffInspection
      ? {
          status: formData.status,
          notes: formData.notes,
          imageUrl: formData.imageUrl,
          isInspection: true,
        }
      : formData;

    const displayName = formData.name || editingRecord?.name || '';
    const displayCode = formData.assetCode || editingRecord?.assetCode || '';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setRecords((prev) => reconcileAssetRecords(prev, json.data));
        setIsAddModalOpen(false);
        setEditingRecord(null);
        showToast(
          'success',
          isStaffInspection
            ? `บันทึกการตรวจเช็กสำเร็จ: ${displayName} (${displayCode})`
            : isUpdate
              ? `อัปเดตข้อมูลครุภัณฑ์สำเร็จ: ${displayName} (${displayCode})`
              : `บันทึกข้อมูลครุภัณฑ์สำเร็จ: ${displayName} (${displayCode})`,
          isStaffInspection
            ? 'บันทึกการตรวจเช็กสำเร็จ'
            : isUpdate
              ? 'อัปเดตข้อมูลครุภัณฑ์สำเร็จ'
              : 'บันทึกข้อมูลครุภัณฑ์สำเร็จ'
        );
      } else {
        const msg = json.details
          ? (json.details.startsWith(json.error) ? json.details : `${json.error}: ${json.details}`)
          : json.error ||
            (isUpdate
              ? 'ไม่สามารถอัปเดตรายการครุภัณฑ์ได้'
              : 'ไม่สามารถสร้างรายการครุภัณฑ์ได้');
        showToast('error', msg, isUpdate ? 'อัปเดตล้มเหลว' : 'บันทึกล้มเหลว');
      }
    } catch (err) {
      console.error('Save error:', err);
      showToast(
        'error',
        'เกิดข้อผิดพลาดที่ไม่คาดคิดในการบันทึกข้อมูล',
        isUpdate ? 'อัปเดตล้มเหลว' : 'บันทึกล้มเหลว'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete / Decommission Record confirmation
  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/records/${deletingRecord.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();

      if (res.ok && json.success) {
        const now = new Date().toISOString();
        setRecords((prev) =>
          prev.map((r) =>
            r.id === deletingRecord.id
              ? {
                  ...r,
                  status: 'จำหน่าย/ตัดบัญชี',
                  updatedAt: now,
                  transactionCount: (r.transactionCount || 1) + 1,
                }
              : r
          )
        );
        showToast(
          'success',
          `จำหน่าย/ตัดบัญชีครุภัณฑ์ ${deletingRecord.name} (${deletingRecord.assetCode}) เรียบร้อยแล้ว (บันทึกลง Ledger)`,
          'จำหน่าย/ตัดบัญชีสำเร็จ'
        );
        setDeletingRecord(null);
      } else {
        const msg = json.details ? `${json.error}: ${json.details}` : (json.error || 'ไม่สามารถจำหน่าย/ตัดบัญชีครุภัณฑ์ได้');
        showToast('error', msg, 'จำหน่าย/ตัดบัญชีล้มเหลว');
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast('error', 'เกิดข้อผิดพลาดที่ไม่คาดคิดในการจำหน่าย/ตัดบัญชีข้อมูล', 'จำหน่าย/ตัดบัญชีล้มเหลว');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle open history modal
  const handleOpenHistory = useCallback(
    async (assetOrCode?: AssetRecord | string | null) => {
      let target: AssetRecord | null = null;
      let assetCode = '';

      if (typeof assetOrCode === 'string') {
        assetCode = assetOrCode.trim();
        target =
          findAssetByCode(assetCode, records) ||
          ({
            id: '',
            assetCode,
            name: assetCode,
            location: '',
            status: 'พร้อมใช้งาน',
            responsiblePerson: '',
            recordedBy: '',
            createdAt: '',
            updatedAt: '',
          } as AssetRecord);
      } else if (assetOrCode) {
        target = assetOrCode;
        assetCode = (assetOrCode.assetCode || '').trim();
      }

      setHistoryTargetAsset(target);
      setHistoryLogs([]);
      setIsHistoryModalOpen(true);
      setIsLoadingLogs(true);
      try {
        const url = assetCode
          ? `/api/logs?assetCode=${encodeURIComponent(assetCode)}`
          : '/api/logs';
        const res = await fetch(url);
        const json = await res.json();

        if (res.ok && json.success) {
          setHistoryLogs(json.data || []);
        } else {
          const msg = json.details
            ? `${json.error}: ${json.details}`
            : json.error || 'ไม่สามารถโหลดประวัติการเปลี่ยนแปลงได้';
          showToast('error', msg, 'เกิดข้อผิดพลาด');
          setHistoryLogs([]);
        }
      } catch (err) {
        console.error('Failed to fetch logs:', err);
        showToast(
          'error',
          'เกิดข้อผิดพลาดในการเชื่อมต่อเพื่อดึงประวัติการเปลี่ยนแปลง',
          'การเชื่อมต่อขัดข้อง'
        );
        setHistoryLogs([]);
      } finally {
        setIsLoadingLogs(false);
      }
    },
    [records, showToast]
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 pointer-events-auto flex flex-col gap-2 max-w-sm">
        {toast && (
          <Toast
            key={toast.id}
            type={toast.type}
            title={toast.title}
            message={toast.message}
            onDismiss={() => setToast(null)}
          />
        )}
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6">
        {/* Top Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  ระบบติดตามตำแหน่งครุภัณฑ์ในองค์กร
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  Live Sync
                </span>
                {statusData.sheetId && (
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${statusData.sheetId}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="เปิดดู Google Sheet ในแท็บใหม่"
                    className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-slate-500 hover:text-blue-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                  >
                    <span>Google Sheets</span>
                    <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                  </a>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                บันทึก ติดตาม และจัดการสถานะครุภัณฑ์ในองค์กร
              </p>
            </div>
          </div>

          {/* Right Side: User Profile Bar + Action Buttons */}
          <div className="flex flex-col items-start sm:items-end gap-2.5">
            {currentUser && (
              <div className="flex items-center gap-2 text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold ${
                    currentUser.role === 'admin'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80'
                      : 'bg-teal-50 text-teal-700 border border-teal-200/80'
                  }`}
                >
                  {currentUser.role === 'admin' ? (
                    <Shield className="w-3 h-3" />
                  ) : (
                    <ClipboardCheck className="w-3 h-3" />
                  )}
                  {currentUser.role === 'admin' ? 'Admin' : 'Staff'}
                </span>
                <span className="font-semibold text-slate-800 max-w-[160px] truncate">
                  {currentUser.displayName}
                </span>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
                  title="ออกจากระบบ"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>ออกจากระบบ</span>
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              {currentUser?.role === 'admin' && (
                <>
                  <Link
                    href="/users"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400 shadow-2xs transition-all active:scale-[0.98] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                    title="จัดการบัญชีผู้ใช้งาน Admin และ Staff"
                  >
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span className="hidden md:inline">จัดการผู้ใช้</span>
                  </Link>

                  <Link
                    href="/settings"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400 shadow-2xs transition-all active:scale-[0.98] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                    title="ตั้งค่าฟิลด์บังคับกรอกและตัวเลือก Dropdown"
                  >
                    <Settings2 className="w-4 h-4 text-slate-600" />
                    <span className="hidden md:inline">ตั้งค่าตัวเลือก</span>
                  </Link>
                </>
              )}

              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400 shadow-2xs transition-all active:scale-[0.98] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                title="ดูรายงานสรุปจำนวนครุภัณฑ์แยกตามสถานะ และส่งออกเป็น PDF"
              >
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <span className="hidden sm:inline">รายงานสรุป</span>
                <span className="sm:hidden">รายงาน</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenHistory()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400 shadow-2xs transition-all active:scale-[0.98] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                title="ดูประวัติการทำรายการทั้งหมดในระบบ"
              >
                <History className="w-4 h-4 text-slate-500" />
                <span className="hidden sm:inline">ประวัติ</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  fetchRecords(true);
                  fetchOptions();
                }}
                disabled={isRefreshing || isLoadingRecords}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400 shadow-2xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`}
                />
                <span className="hidden lg:inline">รีเฟรช</span>
              </button>

              {currentUser?.role === 'staff' ? (
                <button
                  type="button"
                  onClick={() => setIsStaffScannerOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-xl shadow-xs shadow-teal-500/20 transition-all active:scale-[0.98] cursor-pointer focus:ring-2 focus:ring-teal-500/30 focus:outline-none"
                >
                  <QrCode className="w-4 h-4" />
                  <span>สแกน QR ตรวจเช็ก</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs shadow-blue-500/20 transition-all active:scale-[0.98] cursor-pointer focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
                >
                  <Plus className="w-4 h-4" />
                  <span>บันทึกหรือเปลี่ยนแปลงครุภัณฑ์</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Setup Banner - ซ่อนเมื่อเชื่อมต่อ Google Sheets สำเร็จแล้ว แสดงเฉพาะกรณีที่ยังไม่ได้ตั้งค่า */}
        {!statusData.configured && (
          <SetupBanner
            isConfigured={statusData.configured}
            sheetId={statusData.sheetId}
            onRefreshStatus={() => {
              fetchStatus();
              fetchRecords(true);
            }}
            isChecking={isCheckingStatus || isRefreshing}
          />
        )}

        {/* Records Table Component */}
        <RecordTable
          records={filteredAndSortedRecords}
          allRecordsCount={records.length}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          sortField={sortField}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          isLoading={isLoadingRecords}
          onEdit={(record) => setEditingRecord(record)}
          onDelete={(record) => setDeletingRecord(record)}
          onAddNew={() => setIsAddModalOpen(true)}
          onViewHistory={(record) => handleOpenHistory(record)}
          userRole={currentUser?.role || 'admin'}
        />
      </main>

      {/* Add / Change Record Modal (Admin Only) */}
      <RecordModal
        isOpen={isAddModalOpen && currentUser?.role !== 'staff'}
        records={records}
        dropdownOptions={dropdownOptions}
        fieldSettings={fieldSettings}
        currentUser={currentUser}
        isSubmitting={isSubmitting}
        onSave={handleSaveRecord}
        onSubmit={handleSaveRecord}
        onClose={() => setIsAddModalOpen(false)}
        onViewHistory={(code) => handleOpenHistory(code)}
      />

      {/* Edit / Staff Inspect Record Modal */}
      <RecordModal
        isOpen={Boolean(editingRecord)}
        initialData={editingRecord}
        records={records}
        dropdownOptions={dropdownOptions}
        fieldSettings={fieldSettings}
        currentUser={currentUser}
        isInspectionMode={currentUser?.role === 'staff'}
        isSubmitting={isSubmitting}
        onSave={handleSaveRecord}
        onSubmit={handleSaveRecord}
        onClose={() => setEditingRecord(null)}
        onViewHistory={(code) => handleOpenHistory(code)}
      />

      {/* Staff QR Scanner Direct-to-Inspect Modal */}
      <QrScannerModal
        isOpen={isStaffScannerOpen}
        onClose={() => setIsStaffScannerOpen(false)}
        onScan={(cleanCode) => {
          const match = findAssetByCode(cleanCode, records);
          if (match) {
            setEditingRecord(match);
          } else {
            showToast(
              'error',
              `ไม่พบรหัสครุภัณฑ์ "${cleanCode}" ในระบบ (เฉพาะผู้ดูแลระบบ Admin เท่านั้นที่เพิ่มรายการใหม่ได้)`,
              'ไม่พบครุภัณฑ์'
            );
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteDialog
        isOpen={Boolean(deletingRecord)}
        record={deletingRecord}
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeletingRecord(null)}
      />

      {/* Change Log History Modal */}
      <LogHistoryModal
        isOpen={isHistoryModalOpen}
        targetAsset={historyTargetAsset}
        logs={historyLogs}
        isLoading={isLoadingLogs}
        userRole={currentUser?.role || 'admin'}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setHistoryTargetAsset(null);
        }}
        onEditAsset={(asset) => {
          setIsHistoryModalOpen(false);
          setEditingRecord(asset);
        }}
      />

      {/* Asset Status Summary Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        records={records}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            ระบบติดตามตำแหน่งครุภัณฑ์ในองค์กร (Asset Tracking System)
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span>เชื่อมต่อฐานข้อมูล Google Sheets แบบเรียลไทม์</span>
          </div>
        </div>
      </footer>
    </div>
  );
}


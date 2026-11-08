'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Boxes,
  Plus,
  RefreshCw,
  Sparkles,
  History,
} from 'lucide-react';
import { AssetRecord, AssetLogRecord } from '@/lib/types';
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
import { Toast, ToastProps } from '@/components/Toast';

export default function DashboardView() {
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

  // Initial load
  useEffect(() => {
    fetchStatus();
    fetchRecords();
  }, [fetchStatus, fetchRecords]);

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
    const url = isUpdate ? `/api/records/${idToUpdate}` : '/api/records';
    const method = isUpdate ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setRecords((prev) => reconcileAssetRecords(prev, json.data));
        setIsAddModalOpen(false);
        setEditingRecord(null);
        showToast(
          'success',
          isUpdate
            ? `อัปเดตข้อมูลครุภัณฑ์สำเร็จ: ${formData.name} (${formData.assetCode})`
            : `บันทึกข้อมูลครุภัณฑ์สำเร็จ: ${formData.name} (${formData.assetCode})`,
          isUpdate ? 'อัปเดตข้อมูลครุภัณฑ์สำเร็จ' : 'บันทึกข้อมูลครุภัณฑ์สำเร็จ'
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
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Asset Tracking System — บันทึก ติดตาม และจัดการสถานะครุภัณฑ์
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => handleOpenHistory()}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:text-slate-900 shadow-xs transition-colors"
              title="ดูประวัติการทำรายการทั้งหมดในระบบ"
            >
              <History className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">ดูประวัติการเปลี่ยนแปลงทั้งหมด</span>
              <span className="sm:hidden">ประวัติ</span>
            </button>

            <button
              type="button"
              onClick={() => fetchRecords(true)}
              disabled={isRefreshing || isLoadingRecords}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:text-slate-900 shadow-xs transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`}
              />
              <span className="hidden sm:inline">รีเฟรชข้อมูล</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs shadow-blue-500/10 transition-colors focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <Plus className="w-4 h-4" />
              <span>+ บันทึกหรือเปลี่ยนแปลงครุภัณฑ์</span>
            </button>
          </div>
        </header>

        {/* Setup Banner */}
        <SetupBanner
          isConfigured={statusData.configured}
          sheetId={statusData.sheetId}
          onRefreshStatus={() => {
            fetchStatus();
            fetchRecords(true);
          }}
          isChecking={isCheckingStatus || isRefreshing}
        />

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
        />
      </main>

      {/* Add / Change Record Modal */}
      <RecordModal
        isOpen={isAddModalOpen}
        records={records}
        isSubmitting={isSubmitting}
        onSave={handleSaveRecord}
        onSubmit={handleSaveRecord}
        onClose={() => setIsAddModalOpen(false)}
        onViewHistory={(code) => handleOpenHistory(code)}
      />

      {/* Edit Record Modal */}
      <RecordModal
        isOpen={Boolean(editingRecord)}
        initialData={editingRecord}
        records={records}
        isSubmitting={isSubmitting}
        onSave={handleSaveRecord}
        onSubmit={handleSaveRecord}
        onClose={() => setEditingRecord(null)}
        onViewHistory={(code) => handleOpenHistory(code)}
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
        onClose={() => {
          setIsHistoryModalOpen(false);
          setHistoryTargetAsset(null);
        }}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            ระบบติดตามตำแหน่งครุภัณฑ์ในองค์กร (Asset Tracking System) &bull; พัฒนาด้วย Next.js 15, Tailwind CSS และ Google Sheets API
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Production Ready</span>
            <span>&bull;</span>
            <span>Google Sheets Live Database</span>
          </div>
        </div>
      </footer>
    </div>
  );
}


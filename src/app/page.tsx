'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Database,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { RecordItem } from '@/lib/types';
import {
  filterRecords,
  sortRecords,
  SortField,
  SortDirection,
} from '@/lib/filter-utils';
import { SetupBanner } from '@/components/SetupBanner';
import { RecordTable } from '@/components/RecordTable';
import { RecordModal, RecordModalFormData } from '@/components/RecordModal';
import { DeleteDialog } from '@/components/DeleteDialog';
import { Toast, ToastProps } from '@/components/Toast';

export default function DashboardPage() {
  // Data state
  const [records, setRecords] = useState<RecordItem[]>([]);
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
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Modal & Dialog state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RecordItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<RecordItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
          showToast('error', json.error || 'Failed to load records from database');
        }
      } catch (err) {
        console.error('Failed to fetch records:', err);
        showToast('error', 'Network error while fetching records');
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

  // Handle Add Record submit
  const handleCreateSubmit = async (formData: RecordModalFormData) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setRecords((prev) => [json.data, ...prev]);
        setIsAddModalOpen(false);
        showToast('success', `Created record for ${formData.name}`, 'Record Created');
      } else {
        showToast('error', json.error || 'Failed to create record', 'Creation Failed');
      }
    } catch (err) {
      console.error('Create error:', err);
      showToast('error', 'An unexpected error occurred while saving the record');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Record submit
  const handleEditSubmit = async (formData: RecordModalFormData) => {
    if (!editingRecord) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/records/${editingRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setRecords((prev) =>
          prev.map((r) => (r.id === editingRecord.id ? json.data : r))
        );
        setEditingRecord(null);
        showToast('success', `Updated record for ${formData.name}`, 'Record Updated');
      } else {
        showToast('error', json.error || 'Failed to update record', 'Update Failed');
      }
    } catch (err) {
      console.error('Update error:', err);
      showToast('error', 'An unexpected error occurred while updating the record');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Record confirmation
  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/records/${deletingRecord.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setRecords((prev) => prev.filter((r) => r.id !== deletingRecord.id));
        showToast('success', `Deleted record for ${deletingRecord.name}`, 'Record Deleted');
        setDeletingRecord(null);
      } else {
        showToast('error', json.error || 'Failed to delete record', 'Delete Failed');
      }
    } catch (err) {
      console.error('Delete error:', err);
      showToast('error', 'An unexpected error occurred while deleting the record');
    } finally {
      setIsDeleting(false);
    }
  };

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
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Google Sheets CRUD Database
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Real-time spreadsheet-backed database dashboard with search, filter, and schema auto-creation.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => fetchRecords(true)}
              disabled={isRefreshing || isLoadingRecords}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:text-slate-900 shadow-xs transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs shadow-blue-500/10 transition-colors focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <Plus className="w-4 h-4" />
              <span>Add Record</span>
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
        />
      </main>

      {/* Add Record Modal */}
      <RecordModal
        isOpen={isAddModalOpen}
        isSubmitting={isSubmitting}
        onSubmit={handleCreateSubmit}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Edit Record Modal */}
      <RecordModal
        isOpen={Boolean(editingRecord)}
        initialData={editingRecord}
        isSubmitting={isSubmitting}
        onSubmit={handleEditSubmit}
        onClose={() => setEditingRecord(null)}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteDialog
        isOpen={Boolean(deletingRecord)}
        record={deletingRecord}
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeletingRecord(null)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            Google Sheets CRUD Web Application &bull; Built with Next.js 15, Tailwind CSS &amp; Googleapis
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Production Ready</span>
            <span>&bull;</span>
            <span>Vercel Deployable</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

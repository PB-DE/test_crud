'use client';

import React from 'react';
import {
  Search,
  X,
  Pencil,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User,
  Inbox,
} from 'lucide-react';
import { RecordItem, RecordStatus, RECORD_STATUSES } from '@/lib/types';
import { SortField, SortDirection } from '@/lib/filter-utils';

export interface RecordTableProps {
  records: RecordItem[];
  allRecordsCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField) => void;
  isLoading: boolean;
  onEdit: (record: RecordItem) => void;
  onDelete: (record: RecordItem) => void;
  onAddNew: () => void;
}

export function RecordTable({
  records,
  allRecordsCount,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortField,
  sortDirection,
  onSortChange,
  isLoading,
  onEdit,
  onDelete,
  onAddNew,
}: RecordTableProps) {
  // Format date helper
  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Status badge styling
  const renderStatusBadge = (status: RecordStatus) => {
    switch (status) {
      case 'Active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
            Active
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
            Pending
          </span>
        );
      case 'Inactive':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5" />
            Inactive
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Search and Filters Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, email, role, notes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-9 py-2 text-sm rounded-xl border border-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => onStatusFilterChange('All')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              statusFilter === 'All'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All
          </button>
          {RECORD_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => onStatusFilterChange(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto min-h-[300px] flex-1">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 text-xs font-semibold uppercase tracking-wider">
              <th
                scope="col"
                onClick={() => onSortChange('name')}
                className="py-3 px-4 sm:px-6 cursor-pointer select-none hover:bg-slate-100/70 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Name</span>
                  {renderSortIndicator('name')}
                </div>
              </th>
              <th
                scope="col"
                onClick={() => onSortChange('email')}
                className="py-3 px-4 sm:px-6 cursor-pointer select-none hover:bg-slate-100/70 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Email</span>
                  {renderSortIndicator('email')}
                </div>
              </th>
              <th
                scope="col"
                onClick={() => onSortChange('role')}
                className="py-3 px-4 sm:px-6 cursor-pointer select-none hover:bg-slate-100/70 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Role</span>
                  {renderSortIndicator('role')}
                </div>
              </th>
              <th
                scope="col"
                onClick={() => onSortChange('status')}
                className="py-3 px-4 sm:px-6 cursor-pointer select-none hover:bg-slate-100/70 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Status</span>
                  {renderSortIndicator('status')}
                </div>
              </th>
              <th
                scope="col"
                className="py-3 px-4 sm:px-6 text-slate-600 font-semibold"
              >
                Notes
              </th>
              <th
                scope="col"
                onClick={() => onSortChange('createdAt')}
                className="py-3 px-4 sm:px-6 cursor-pointer select-none hover:bg-slate-100/70 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>Created</span>
                  {renderSortIndicator('createdAt')}
                </div>
              </th>
              <th
                scope="col"
                className="py-3 px-4 sm:px-6 text-right text-slate-600 font-semibold"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              // Skeleton rows
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
                      <div className="h-4 w-28 bg-slate-200 rounded" />
                    </div>
                  </td>
                  <td className="py-4 px-4 sm:px-6">
                    <div className="h-4 w-36 bg-slate-200 rounded" />
                  </td>
                  <td className="py-4 px-4 sm:px-6">
                    <div className="h-4 w-24 bg-slate-200 rounded" />
                  </td>
                  <td className="py-4 px-4 sm:px-6">
                    <div className="h-5 w-16 bg-slate-200 rounded-full" />
                  </td>
                  <td className="py-4 px-4 sm:px-6">
                    <div className="h-4 w-32 bg-slate-200 rounded" />
                  </td>
                  <td className="py-4 px-4 sm:px-6">
                    <div className="h-4 w-20 bg-slate-200 rounded" />
                  </td>
                  <td className="py-4 px-4 sm:px-6 text-right">
                    <div className="inline-flex gap-2">
                      <div className="w-7 h-7 bg-slate-200 rounded-lg" />
                      <div className="w-7 h-7 bg-slate-200 rounded-lg" />
                    </div>
                  </td>
                </tr>
              ))
            ) : records.length === 0 ? (
              // Empty state
              <tr>
                <td colSpan={7} className="py-16 px-4 text-center">
                  <div className="max-w-sm mx-auto flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                      <Inbox className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900">
                      No records found
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-5 leading-relaxed">
                      {searchQuery || statusFilter !== 'All'
                        ? 'No records match your active search or filter criteria. Try resetting them.'
                        : 'Your database is currently empty. Add your first record to get started.'}
                    </p>
                    {searchQuery || statusFilter !== 'All' ? (
                      <button
                        type="button"
                        onClick={() => {
                          onSearchChange('');
                          onStatusFilterChange('All');
                        }}
                        className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                      >
                        Reset filters
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onAddNew}
                        className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
                      >
                        Add First Record
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              // Record rows
              records.map((record) => (
                <tr
                  key={record.id}
                  className="hover:bg-slate-50/80 transition-colors group"
                >
                  <td className="py-3.5 px-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center shrink-0">
                        {record.name.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
                      </div>
                      <span className="font-medium text-slate-900">
                        {record.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-slate-600 font-mono text-xs sm:text-sm">
                    {record.email}
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-slate-700">
                    {record.role}
                  </td>
                  <td className="py-3.5 px-4 sm:px-6">
                    {renderStatusBadge(record.status)}
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-slate-500 max-w-xs truncate text-xs sm:text-sm">
                    {record.notes ? (
                      <span title={record.notes}>{record.notes}</span>
                    ) : (
                      <span className="text-slate-300 italic">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-slate-500 text-xs sm:text-sm whitespace-nowrap">
                    {formatDate(record.createdAt)}
                  </td>
                  <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEdit(record)}
                        aria-label={`Edit ${record.name}`}
                        title="Edit record"
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(record)}
                        aria-label={`Delete ${record.name}`}
                        title="Delete record"
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Summary */}
      <div className="px-4 sm:px-6 py-3 border-t border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <div>
          Showing <span className="font-semibold text-slate-700">{records.length}</span> of{' '}
          <span className="font-semibold text-slate-700">{allRecordsCount}</span> total records
          {searchQuery && (
            <span className="ml-1 text-slate-400">
              (filtered from search)
            </span>
          )}
        </div>
        <div className="text-slate-400 text-[11px]">
          Click table headers to toggle ascending/descending sort
        </div>
      </div>
    </div>
  );
}

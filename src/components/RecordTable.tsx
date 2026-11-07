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
  Inbox,
  Tag,
  MapPin,
  User,
  History,
} from 'lucide-react';
import { AssetRecord, AssetStatus, ASSET_STATUSES } from '@/lib/types';
import { SortField, SortDirection } from '@/lib/filter-utils';

export interface RecordTableProps {
  records: AssetRecord[];
  allRecordsCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField) => void;
  isLoading: boolean;
  onEdit: (record: AssetRecord) => void;
  onDelete: (record: AssetRecord) => void;
  onAddNew: () => void;
  onViewHistory?: (record: AssetRecord) => void;
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
  onViewHistory,
}: RecordTableProps) {
  // Format date helper with Thai localization fallback
  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return d.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Status badge styling
  const renderStatusBadge = (status: AssetStatus | string) => {
    switch (status) {
      case 'พร้อมใช้งาน':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 shrink-0" />
            พร้อมใช้งาน
          </span>
        );
      case 'กำลังใช้งาน':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/80 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 shrink-0" />
            กำลังใช้งาน
          </span>
        );
      case 'ส่งซ่อม':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/80 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 shrink-0" />
            ส่งซ่อม
          </span>
        );
      case 'จำหน่าย/ตัดบัญชี':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5 shrink-0" />
            จำหน่าย/ตัดบัญชี
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 whitespace-nowrap">
            {status}
          </span>
        );
    }
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return (
        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      );
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-blue-600 shrink-0" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-blue-600 shrink-0" />
    );
  };

  const isAllFilterActive = statusFilter === 'All' || statusFilter === 'ทั้งหมด';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
      {/* Search and Filters Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="ค้นหารหัสครุภัณฑ์, ชื่อรายการ, ตำแหน่ง, ผู้รับผิดชอบ..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-9 py-2 text-sm rounded-xl border border-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="ล้างคำค้นหา"
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
            onClick={() => onStatusFilterChange('ทั้งหมด')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              isAllFilterActive
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ทั้งหมด
          </button>
          {ASSET_STATUSES.map((status) => (
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
              {/* รหัสครุภัณฑ์ */}
              <th
                scope="col"
                onClick={() => onSortChange('assetCode')}
                className="py-3 px-4 sm:px-5 cursor-pointer select-none hover:bg-slate-100/70 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>รหัสครุภัณฑ์</span>
                  {renderSortIndicator('assetCode')}
                </div>
              </th>

              {/* ชื่อรายการครุภัณฑ์ */}
              <th
                scope="col"
                onClick={() => onSortChange('name')}
                className="py-3 px-4 sm:px-5 cursor-pointer select-none hover:bg-slate-100/70 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>ชื่อรายการครุภัณฑ์</span>
                  {renderSortIndicator('name')}
                </div>
              </th>

              {/* ตำแหน่งที่ตั้ง */}
              <th
                scope="col"
                onClick={() => onSortChange('location')}
                className="py-3 px-4 sm:px-5 cursor-pointer select-none hover:bg-slate-100/70 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>ตำแหน่งที่ตั้ง</span>
                  {renderSortIndicator('location')}
                </div>
              </th>

              {/* สถานะ */}
              <th
                scope="col"
                onClick={() => onSortChange('status')}
                className="py-3 px-4 sm:px-5 cursor-pointer select-none hover:bg-slate-100/70 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>สถานะ</span>
                  {renderSortIndicator('status')}
                </div>
              </th>

              {/* ผู้รับผิดชอบ */}
              <th
                scope="col"
                onClick={() => onSortChange('responsiblePerson')}
                className="py-3 px-4 sm:px-5 cursor-pointer select-none hover:bg-slate-100/70 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>ผู้รับผิดชอบ</span>
                  {renderSortIndicator('responsiblePerson')}
                </div>
              </th>

              {/* ผู้บันทึก */}
              <th
                scope="col"
                onClick={() => onSortChange('recordedBy')}
                className="py-3 px-4 sm:px-5 cursor-pointer select-none hover:bg-slate-100/70 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>ผู้บันทึก</span>
                  {renderSortIndicator('recordedBy')}
                </div>
              </th>

              {/* หมายเหตุ */}
              <th
                scope="col"
                className="py-3 px-4 sm:px-5 text-slate-600 font-semibold"
              >
                หมายเหตุ
              </th>

              {/* อัปเดตล่าสุด */}
              <th
                scope="col"
                onClick={() => onSortChange('updatedAt')}
                className="py-3 px-4 sm:px-5 cursor-pointer select-none hover:bg-slate-100/70 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <span>อัปเดตล่าสุด</span>
                  {renderSortIndicator('updatedAt')}
                </div>
              </th>

              {/* จัดการ */}
              <th
                scope="col"
                className="py-3 px-4 sm:px-5 text-right text-slate-600 font-semibold"
              >
                จัดการ
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              // Skeleton rows
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-4 sm:px-5">
                    <div className="h-4 w-24 bg-slate-200 rounded" />
                  </td>
                  <td className="py-4 px-4 sm:px-5">
                    <div className="h-4 w-36 bg-slate-200 rounded" />
                  </td>
                  <td className="py-4 px-4 sm:px-5">
                    <div className="h-4 w-28 bg-slate-200 rounded" />
                  </td>
                  <td className="py-4 px-4 sm:px-5">
                    <div className="h-5 w-20 bg-slate-200 rounded-full" />
                  </td>
                  <td className="py-4 px-4 sm:px-5">
                    <div className="h-4 w-24 bg-slate-200 rounded" />
                  </td>
                  <td className="py-4 px-4 sm:px-5">
                    <div className="h-4 w-20 bg-slate-200 rounded" />
                  </td>
                  <td className="py-4 px-4 sm:px-5">
                    <div className="h-4 w-24 bg-slate-200 rounded" />
                  </td>
                  <td className="py-4 px-4 sm:px-5">
                    <div className="h-4 w-20 bg-slate-200 rounded" />
                  </td>
                  <td className="py-4 px-4 sm:px-5 text-right">
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
                <td colSpan={9} className="py-16 px-4 text-center">
                  <div className="max-w-md mx-auto flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                      <Inbox className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900">
                      ไม่พบข้อมูลครุภัณฑ์
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-5 leading-relaxed">
                      {searchQuery || !isAllFilterActive
                        ? 'ไม่พบรายการที่ตรงกับคำค้นหาหรือตัวกรองที่เลือก ลองล้างตัวกรองเพื่อค้นหาใหม่'
                        : 'ยังไม่มีรายการครุภัณฑ์ในระบบ เริ่มต้นด้วยการเพิ่มครุภัณฑ์ชิ้นแรก'}
                    </p>
                    {searchQuery || !isAllFilterActive ? (
                      <button
                        type="button"
                        onClick={() => {
                          onSearchChange('');
                          onStatusFilterChange('ทั้งหมด');
                        }}
                        className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                      >
                        ล้างตัวกรอง
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onAddNew}
                        className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
                      >
                        + บันทึกครุภัณฑ์ใหม่
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
                  {/* รหัสครุภัณฑ์ */}
                  <td className="py-3.5 px-4 sm:px-5 font-mono text-xs sm:text-sm font-semibold text-blue-700 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50/60 border border-blue-100">
                      <Tag className="w-3 h-3 text-blue-500" />
                      <span>{record.assetCode}</span>
                    </div>
                  </td>

                  {/* ชื่อรายการครุภัณฑ์ */}
                  <td className="py-3.5 px-4 sm:px-5">
                    <span className="font-medium text-slate-900 line-clamp-2">
                      {record.name}
                    </span>
                  </td>

                  {/* ตำแหน่งที่ตั้ง */}
                  <td className="py-3.5 px-4 sm:px-5 text-slate-700 text-xs sm:text-sm">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="line-clamp-1">{record.location}</span>
                    </div>
                  </td>

                  {/* สถานะ */}
                  <td className="py-3.5 px-4 sm:px-5">
                    {renderStatusBadge(record.status)}
                  </td>

                  {/* ผู้รับผิดชอบ */}
                  <td className="py-3.5 px-4 sm:px-5 text-slate-700 text-xs sm:text-sm">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="line-clamp-1">{record.responsiblePerson}</span>
                    </div>
                  </td>

                  {/* ผู้บันทึก */}
                  <td className="py-3.5 px-4 sm:px-5 text-slate-600 text-xs sm:text-sm whitespace-nowrap">
                    {record.recordedBy}
                  </td>

                  {/* หมายเหตุ */}
                  <td className="py-3.5 px-4 sm:px-5 text-slate-500 max-w-xs truncate text-xs sm:text-sm">
                    {record.notes ? (
                      <span title={record.notes}>{record.notes}</span>
                    ) : (
                      <span className="text-slate-300 italic">—</span>
                    )}
                  </td>

                  {/* อัปเดตล่าสุด */}
                  <td className="py-3.5 px-4 sm:px-5 text-slate-500 text-xs sm:text-sm whitespace-nowrap">
                    {formatDate(record.updatedAt || record.createdAt)}
                  </td>

                  {/* จัดการ */}
                  <td className="py-3.5 px-4 sm:px-5 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      {onViewHistory && (
                        <button
                          type="button"
                          onClick={() => onViewHistory(record)}
                          aria-label={`ดูประวัติ ${record.name} (${record.assetCode})`}
                          title="ดูประวัติการเปลี่ยนแปลง"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onEdit(record)}
                        aria-label={`แก้ไข ${record.name} (${record.assetCode})`}
                        title="แก้ไขข้อมูลครุภัณฑ์"
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(record)}
                        aria-label={`ลบ ${record.name} (${record.assetCode})`}
                        title="ลบรายการครุภัณฑ์"
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
          แสดง <span className="font-semibold text-slate-700">{records.length}</span> จากทั้งหมด{' '}
          <span className="font-semibold text-slate-700">{allRecordsCount}</span> รายการ
          {searchQuery && (
            <span className="ml-1 text-slate-400">
              (กรองจากคำค้นหา)
            </span>
          )}
        </div>
        <div className="text-slate-400 text-[11px]">
          คลิกที่หัวตารางเพื่อจัดเรียงข้อมูล น้อยไปมาก / มากไปน้อย
        </div>
      </div>
    </div>
  );
}

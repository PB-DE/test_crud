'use client';

import React, { useEffect } from 'react';
import {
  X,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  PlayCircle,
  Wrench,
  Archive,
  Layers,
} from 'lucide-react';
import { AssetRecord, AssetStatus, ASSET_STATUSES } from '@/lib/types';
import {
  calculateStatusSummary,
  groupAssetsByStatus,
} from '@/lib/report-utils';
import { formatLogDateTime } from '@/lib/ui-helpers';

export const REPORT_MODAL_TITLE = 'รายงานสรุปสถานะครุภัณฑ์';
export const REPORT_PRINT_CONTAINER_ID = 'printable-report';

export interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: AssetRecord[];
}

export function ReportModal({ isOpen, onClose, records }: ReportModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const summary = calculateStatusSummary(records);
  const grouped = groupAssetsByStatus(records);

  const handlePrint = () => {
    window.print();
  };

  const getStatusIcon = (status: AssetStatus) => {
    switch (status) {
      case 'พร้อมใช้งาน':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'กำลังใช้งาน':
        return <PlayCircle className="w-4 h-4 text-blue-600" />;
      case 'ส่งซ่อม':
        return <Wrench className="w-4 h-4 text-amber-600" />;
      case 'จำหน่าย/ตัดบัญชี':
        return <Archive className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity no-print"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 printable-document">
        {/* Header - Screen Only */}
        <div className="px-5 py-4 sm:px-6 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between shrink-0 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  id="report-modal-title"
                  className="text-base sm:text-lg font-bold text-slate-900 truncate"
                >
                  {REPORT_MODAL_TITLE}
                </h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  {summary.total} รายการ
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                สรุปจำนวนครุภัณฑ์แยกตามสถานะ และบัญชีรายละเอียด
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs shadow-blue-500/20 transition-all active:scale-[0.98] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
              title="พิมพ์หรือบันทึกเป็น PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ส่งออกเป็น PDF / พิมพ์</span>
              <span className="sm:hidden">พิมพ์/PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="ปิดหน้าต่างรายงาน"
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/70 transition-all active:scale-95 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Content Body */}
        <div
          id={REPORT_PRINT_CONTAINER_ID}
          className="p-5 sm:p-7 overflow-y-auto space-y-6 print:space-y-4 print:p-0"
        >
          {/* Institutional Print Header */}
          <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 rounded border border-slate-300">
                  กรมการขนส่งทางบก (DLT)
                </span>
                <span className="text-xs text-slate-500">
                  ระบบบันทึกและติดตามครุภัณฑ์
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                รายงานสรุปจำนวนครุภัณฑ์แยกตามสถานะ
              </h1>
            </div>
            <div className="text-left sm:text-right text-xs text-slate-600">
              <div>
                ข้อมูล ณ วันที่:{' '}
                <span className="font-semibold text-slate-900">
                  {formatLogDateTime(summary.generatedAt)}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                จำนวนครุภัณฑ์ในระบบทั้งหมด:{' '}
                <span className="font-bold text-slate-800">
                  {summary.total}
                </span>{' '}
                รายการ
              </div>
            </div>
          </div>

          {/* Section 1: KPI Stat Cards */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              สรุปสถิติจำนวนและสัดส่วน
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {/* Total Card */}
              <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">
                    รวมทั้งหมด
                  </span>
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-900 tabular-nums">
                    {summary.total}
                  </span>
                  <span className="text-xs text-slate-500">100%</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  รายการในฐานข้อมูล
                </p>
              </div>

              {/* Status Specific Cards */}
              {summary.items.map((item) => (
                <div
                  key={item.status}
                  className={`p-3.5 rounded-xl border ${item.borderClass} ${item.bgClass} shadow-2xs`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${item.colorClass}`}>
                      {item.label}
                    </span>
                    {getStatusIcon(item.status)}
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span
                      className={`text-2xl font-bold tabular-nums ${item.colorClass}`}
                    >
                      {item.count}
                    </span>
                    <span
                      className={`text-xs font-semibold tabular-nums ${item.colorClass}`}
                    >
                      {item.percentage}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    จากจำนวนทั้งหมด
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Proportional Multi-Segment Progress Bar */}
          {summary.total > 0 && (
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2 print-avoid-break">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold text-slate-700">
                  สัดส่วนสถานะครุภัณฑ์ (Distribution)
                </span>
                <span className="text-[11px] text-slate-500">
                  คำนวณจาก {summary.total} รายการ
                </span>
              </div>

              {/* Multi-segment bar */}
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex shadow-inner">
                {summary.items.map((item) => {
                  if (item.count === 0) return null;
                  let bg = 'bg-slate-400';
                  if (item.status === 'พร้อมใช้งาน') bg = 'bg-emerald-500';
                  if (item.status === 'กำลังใช้งาน') bg = 'bg-blue-600';
                  if (item.status === 'ส่งซ่อม') bg = 'bg-amber-500';
                  if (item.status === 'จำหน่าย/ตัดบัญชี') bg = 'bg-slate-500';

                  return (
                    <div
                      key={item.status}
                      style={{ width: `${item.percentage}%` }}
                      className={`${bg} h-full transition-all duration-300 relative group`}
                      title={`${item.label}: ${item.count} รายการ (${item.percentage}%)`}
                    />
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-600">
                {summary.items.map((item) => (
                  <div key={item.status} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${item.dotClass}`} />
                    <span>
                      {item.label}:{' '}
                      <strong className="text-slate-800">
                        {item.count}
                      </strong>{' '}
                      ({item.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Grouped Asset Lists By Status */}
          <div className="space-y-6 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              รายละเอียดครุภัณฑ์แยกตามสถานะ
            </h3>

            {ASSET_STATUSES.map((status) => {
              const items = grouped[status] || [];
              const theme = summary.items.find((i) => i.status === status);

              return (
                <div
                  key={status}
                  className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs print-avoid-break"
                >
                  {/* Status Group Header */}
                  <div
                    className={`px-4 py-2.5 border-b border-slate-200 flex items-center justify-between ${
                      theme?.bgClass || 'bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {getStatusIcon(status)}
                      <h4
                        className={`text-sm font-bold ${
                          theme?.colorClass || 'text-slate-800'
                        }`}
                      >
                        {status}
                      </h4>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/80 border border-slate-200 text-slate-700">
                        {items.length} รายการ
                      </span>
                    </div>

                    <span className="text-xs text-slate-500">
                      สัดส่วน {theme?.percentage || 0}%
                    </span>
                  </div>

                  {/* Items Table */}
                  {items.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 italic">
                      ไม่มีรายการครุภัณฑ์ในสถานะนี้
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-600 font-semibold">
                            <th className="py-2 px-3 w-10 text-center">#</th>
                            <th className="py-2 px-3 w-32">รหัสครุภัณฑ์</th>
                            <th className="py-2 px-3">ชื่อครุภัณฑ์</th>
                            <th className="py-2 px-3 w-36">สถานที่ตั้ง</th>
                            <th className="py-2 px-3 w-36">ผู้รับผิดชอบ</th>
                            <th className="py-2 px-3 w-40">หมายเหตุ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {items.map((asset, idx) => (
                            <tr
                              key={asset.id || idx}
                              className="hover:bg-slate-50/60 transition-colors"
                            >
                              <td className="py-2 px-3 text-center text-slate-400 tabular-nums">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-3 font-mono font-semibold text-blue-700 tabular-nums whitespace-nowrap">
                                {asset.assetCode}
                              </td>
                              <td className="py-2 px-3 font-medium text-slate-900">
                                {asset.name}
                              </td>
                              <td className="py-2 px-3 text-slate-700">
                                {asset.location || '—'}
                              </td>
                              <td className="py-2 px-3 text-slate-700">
                                {asset.responsiblePerson || '—'}
                              </td>
                              <td className="py-2 px-3 text-slate-500 text-[11px]">
                                {asset.notes || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Section 4: Official Signature Block for Printed PDF */}
          <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs text-slate-700 print-avoid-break">
            <div className="space-y-8">
              <p>ลงชื่อ.......................................................... ผู้รายงาน</p>
              <div>
                <p>(..........................................................)</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  ตำแหน่ง..........................................................
                </p>
                <p className="text-[11px] text-slate-500">
                  วันที่ ......./......./...........
                </p>
              </div>
            </div>

            <div className="space-y-8">
              <p>ลงชื่อ.......................................................... ผู้รับรอง</p>
              <div>
                <p>(..........................................................)</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  หัวหน้ากลุ่มงาน/ผู้มีอำนาจ
                </p>
                <p className="text-[11px] text-slate-500">
                  วันที่ ......./......./...........
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Screen Only */}
        <div className="px-5 py-3.5 sm:px-6 bg-slate-50/90 border-t border-slate-200/80 flex items-center justify-between shrink-0 no-print">
          <span className="text-xs text-slate-500 hidden sm:inline">
            กดปุ่ม Esc หรือปุ่มปิดเพื่อกลับสู่แดชบอร์ดหลัก
          </span>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:border-slate-400 shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs shadow-blue-500/20 transition-all active:scale-[0.98] cursor-pointer focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
            >
              <Printer className="w-4 h-4" />
              <span>ส่งออกเป็น PDF / พิมพ์</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

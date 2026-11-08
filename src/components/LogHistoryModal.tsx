'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  X,
  Search,
  Clock,
  MapPin,
  User,
  Tag,
  ArrowRight,
  CheckCircle2,
  Trash2,
  Loader2,
  Camera,
  ZoomIn,
  Pencil,
} from 'lucide-react';
import { AssetRecord, AssetLogRecord } from '@/lib/types';
import {
  filterLogs,
  formatLogDateTime,
  getActionBadgeStyle,
} from '@/lib/filter-utils';

export interface LogHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AssetLogRecord[];
  isLoading: boolean;
  targetAsset?: AssetRecord | null;
  onEditAsset?: (asset: AssetRecord) => void;
}

export function LogHistoryModal({
  isOpen,
  onClose,
  logs,
  isLoading,
  targetAsset,
  onEditAsset,
}: LogHistoryModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingImage, setViewingImage] = useState<{ url: string; title: string } | null>(null);

  // Reset search query and photo viewer when modal opens or targetAsset changes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setViewingImage(null);
    }
  }, [isOpen, targetAsset]);

  // Handle ESC key and body scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (viewingImage) {
          setViewingImage(null);
        } else {
          onClose();
        }
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

  // Real-time filtered logs
  const filteredLogs = useMemo(() => {
    return filterLogs(logs, searchQuery);
  }, [logs, searchQuery]);

  if (!isOpen) return null;

  const renderDiff = (diffStr: string, icon: React.ReactNode, label: string) => {
    if (!diffStr || diffStr === '-') return null;
    const parts = diffStr.split(' ➔ ');
    return (
      <div className="flex items-start sm:items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 text-xs sm:text-sm">
        <div className="flex items-center gap-1.5 shrink-0 text-slate-500">
          {icon}
          <span className="font-semibold text-slate-700">{label}:</span>
        </div>
        {parts.length === 2 ? (
          <div className="flex flex-wrap items-center gap-1.5 font-medium">
            <span className="text-slate-500 line-through decoration-slate-400">{parts[0]}</span>
            <ArrowRight className="w-3.5 h-3.5 text-blue-600 shrink-0 inline" />
            <span className="text-blue-700 font-semibold bg-blue-50/80 px-1.5 py-0.5 rounded border border-blue-200/50">
              {parts[1]}
            </span>
          </div>
        ) : (
          <span className="text-slate-700 font-medium">{diffStr}</span>
        )}
      </div>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-history-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-3xl max-h-[88vh] bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 border-b border-slate-200/80 bg-slate-50/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {targetAsset?.imageUrl ? (
              <div
                onClick={() =>
                  setViewingImage({
                    url: targetAsset.imageUrl!,
                    title: `${targetAsset.assetCode} - ${targetAsset.name}`,
                  })
                }
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden border border-slate-200/90 shadow-2xs shrink-0 cursor-pointer hover:border-blue-400 hover:ring-2 hover:ring-blue-500/20 transition-all relative group bg-white"
                title="คลิกเพื่อดูรูปภาพขนาดเต็ม"
              >
                <img
                  src={targetAsset.imageUrl}
                  alt={targetAsset.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <ZoomIn className="w-4 h-4 drop-shadow-xs" />
                </div>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <History className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <h2
                id="log-history-modal-title"
                className="text-base sm:text-lg font-bold text-slate-900 leading-tight truncate"
              >
                {targetAsset
                  ? `ประวัติ: ${targetAsset.assetCode} ${targetAsset.name}`
                  : 'ประวัติการทำรายการ'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {targetAsset
                  ? 'บันทึกประวัติการเปลี่ยนแปลงของครุภัณฑ์ชิ้นนี้'
                  : 'บันทึกประวัติการเปลี่ยนแปลงทั้งหมดในระบบ'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            {targetAsset && onEditAsset && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditAsset(targetAsset);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                title={`เปลี่ยนแปลงข้อมูล ${targetAsset.assetCode}`}
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>เปลี่ยนแปลงข้อมูล</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="ปิดหน้าต่างประวัติ"
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search inside modal */}
        <div className="p-3 sm:px-6 border-b border-slate-100 bg-white shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาตามรหัส, ชื่อ, ตำแหน่ง, ผู้บันทึก, หมายเหตุ..."
              className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                aria-label="ล้างคำค้นหา"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Timeline Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
              <p className="text-sm font-medium">กำลังโหลดประวัติการเปลี่ยนแปลง...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
                <History className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-600">
                {searchQuery ? 'ไม่พบบันทึกประวัติที่ตรงกับคำค้นหา' : 'ยังไม่มีประวัติการเปลี่ยนแปลง'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-xs text-blue-600 hover:underline"
                >
                  ล้างคำค้นหา
                </button>
              )}
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-8 space-y-5 before:absolute before:left-2.5 sm:before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {filteredLogs.map((log) => {
                const badgeStyle = getActionBadgeStyle(log.action);
                return (
                  <div key={log.id || `${log.timestamp}-${log.assetCode}`} className="relative group">
                    {/* Timeline bullet */}
                    <div
                      className={`absolute -left-6 sm:-left-8 top-1.5 w-5 h-5 rounded-full border-2 border-white ${badgeStyle.dot} shadow-xs ring-4 ring-slate-50 flex items-center justify-center`}
                    />

                    {/* Timeline Card */}
                    <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs hover:border-slate-300 transition-colors space-y-3">
                      {/* Card Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${badgeStyle.dot} mr-1.5 shrink-0`} />
                            {log.action}
                          </span>

                          {/* Asset code & name if in all-logs mode or different asset */}
                          {(!targetAsset || targetAsset.assetCode !== log.assetCode) && (
                            <div className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                              <span className="font-mono tabular-nums text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60">
                                {log.assetCode}
                              </span>
                              <span className="truncate max-w-[200px] text-slate-600 font-normal">
                                {log.name}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Timestamp */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 tabular-nums">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatLogDateTime(log.timestamp)}</span>
                        </div>
                      </div>

                      {/* Diffs & Details */}
                      <div className="space-y-2">
                        {log.changeSummary && log.action !== 'บันทึกรายการใหม่' && log.action !== 'ลบรายการ' && (
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                            <span className="text-slate-400 font-medium">สรุปการเปลี่ยนแปลง:</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60 font-medium">
                              {log.changeSummary}
                            </span>
                          </div>
                        )}
                        {renderDiff(
                          log.locationChange,
                          <MapPin className="w-4 h-4 text-amber-500 shrink-0" />,
                          'ตำแหน่งที่ตั้ง'
                        )}
                        {renderDiff(
                          log.responsibleChange,
                          <User className="w-4 h-4 text-indigo-500 shrink-0" />,
                          'ผู้รับผิดชอบ'
                        )}
                        {renderDiff(
                          log.statusChange,
                          <Tag className="w-4 h-4 text-emerald-500 shrink-0" />,
                          'สถานะ'
                        )}
                        {log.action === 'บันทึกรายการใหม่' && (
                          <div className="text-xs sm:text-sm text-emerald-700 font-medium bg-emerald-50/70 border border-emerald-100 rounded-lg p-2.5 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{log.changeSummary || 'บันทึกรายการใหม่เข้าสู่ระบบ'}</span>
                          </div>
                        )}
                        {log.action === 'ลบรายการ' && (
                          <div className="text-xs sm:text-sm text-rose-700 font-medium bg-rose-50/70 border border-rose-100 rounded-lg p-2.5 flex items-center gap-2">
                            <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>{log.changeSummary || 'ลบรายการออกจากระบบ'}</span>
                          </div>
                        )}

                        {/* Attached Photo Preview */}
                        {(() => {
                          const previewImg =
                            log.imageUrl ||
                            (targetAsset && targetAsset.assetCode === log.assetCode
                              ? targetAsset.imageUrl
                              : undefined);
                          if (!previewImg) return null;
                          return (
                            <div className="pt-2 flex items-center gap-3">
                              <div
                                onClick={() =>
                                  setViewingImage({
                                    url: previewImg,
                                    title: `${log.assetCode} - ${log.action} (${formatLogDateTime(log.timestamp)})`,
                                  })
                                }
                                className="group/photo relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden border border-slate-200/90 shadow-2xs cursor-pointer hover:border-blue-400 hover:ring-2 hover:ring-blue-500/20 transition-all bg-slate-50"
                                title="คลิกเพื่อดูภาพขนาดเต็ม"
                              >
                                <img
                                  src={previewImg}
                                  alt={`รูปภาพ ${log.assetCode}`}
                                  className="w-full h-full object-cover group-hover/photo:scale-110 transition-transform duration-200"
                                />
                                <div className="absolute inset-0 bg-slate-900/35 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <ZoomIn className="w-4 h-4 drop-shadow-sm" />
                                </div>
                              </div>
                              <div className="text-xs text-slate-500 flex flex-col justify-center gap-1">
                                <div className="flex items-center gap-1.5 font-medium text-slate-700">
                                  <Camera className="w-3.5 h-3.5 text-blue-500" />
                                  <span>รูปภาพครุภัณฑ์</span>
                                </div>
                                <span className="text-[11px] text-slate-400">
                                  คลิกที่รูปเพื่อดูภาพขนาดเต็ม
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Footer */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">ผู้ทำรายการ:</span>
                          <span className="font-medium text-slate-700">{log.recordedBy || 'ไม่ระบุ'}</span>
                        </div>
                        {log.notes && (
                          <div className="flex items-center gap-1 text-slate-600 max-w-sm truncate" title={log.notes}>
                            <span className="text-slate-400">หมายเหตุ:</span>
                            <span className="italic font-normal">"{log.notes}"</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 sm:px-6 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {!isLoading && (
              <span>
                แสดง <span className="font-semibold text-slate-700">{filteredLogs.length}</span> จากทั้งหมด{' '}
                <span className="font-semibold text-slate-700">{logs.length}</span> รายการ
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>

      {/* High-Resolution Photo Viewer Lightbox */}
      {viewingImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setViewingImage(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white">
              <span className="text-xs sm:text-sm font-medium truncate pr-4">
                {viewingImage.title}
              </span>
              <button
                type="button"
                onClick={() => setViewingImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center overflow-auto max-h-[calc(90vh-60px)]">
              <img
                src={viewingImage.url}
                alt={viewingImage.title}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

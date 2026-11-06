'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export interface SetupBannerProps {
  isConfigured: boolean;
  sheetId?: string;
  onRefreshStatus?: () => void;
  isChecking?: boolean;
}

export function SetupBanner({
  isConfigured,
  sheetId,
  onRefreshStatus,
  isChecking = false,
}: SetupBannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopySheetId = () => {
    if (!sheetId) return;
    navigator.clipboard.writeText(sheetId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sheetUrl = sheetId
    ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit`
    : undefined;

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all">
      {/* Header bar */}
      <div className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start md:items-center gap-3.5">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              isConfigured
                ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20'
                : 'bg-amber-50 text-amber-600 ring-1 ring-amber-500/20'
            }`}
          >
            {isConfigured ? (
              <FileSpreadsheet className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-900 text-sm md:text-base">
                Data Source Status:
              </span>
              {isConfigured ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Connected to Google Sheets
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Demo Mode (In-Memory)
                </span>
              )}
            </div>

            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              {isConfigured ? (
                <span>
                  All changes are synced live to your Google Spreadsheet.
                  {sheetId && (
                    <span className="ml-1 text-slate-600">
                      ID: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-xs">{sheetId.slice(0, 12)}...</code>
                    </span>
                  )}
                </span>
              ) : (
                'Running in demo mode with sample records. Changes are stored in memory and reset on restart.'
              )}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          {sheetUrl && (
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <span>Open Sheet</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            </a>
          )}

          {sheetId && (
            <button
              type="button"
              onClick={handleCopySheetId}
              title="Copy Sheet ID"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy ID'}</span>
            </button>
          )}

          {onRefreshStatus && (
            <button
              type="button"
              onClick={onRefreshStatus}
              disabled={isChecking}
              title="Check connection status"
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${isChecking ? 'animate-spin text-blue-600' : ''}`}
              />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <span>{isConfigured ? 'Connection Info' : 'Setup Guide'}</span>
            {isOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Collapsible Connection Guide */}
      {isOpen && (
        <div className="border-t border-slate-200 bg-slate-50/70 p-5 md:p-6 text-sm text-slate-700">
          <div className="max-w-4xl space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-slate-900 text-sm">
                How to Connect Your Own Google Sheet in 4 Steps
              </h3>
            </div>

            <ol className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs md:text-sm">
              <li className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-1">
                <div className="flex items-center gap-2 font-medium text-slate-900">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center shrink-0">
                    1
                  </span>
                  Create Sheet & Copy ID
                </div>
                <p className="text-slate-600 pl-7 text-xs">
                  Create a new blank sheet at <span className="font-mono text-slate-800">sheets.new</span>. Copy the Sheet ID from its URL: <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">.../d/<strong>&lt;SHEET_ID&gt;</strong>/edit</code>.
                </p>
              </li>

              <li className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-1">
                <div className="flex items-center gap-2 font-medium text-slate-900">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center shrink-0">
                    2
                  </span>
                  Create Google Service Account
                </div>
                <p className="text-slate-600 pl-7 text-xs">
                  In Google Cloud Console, enable the <strong>Google Sheets API</strong>, create a Service Account, and generate a JSON key file.
                </p>
              </li>

              <li className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-1">
                <div className="flex items-center gap-2 font-medium text-slate-900">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center shrink-0">
                    3
                  </span>
                  Share Sheet with Service Account
                </div>
                <p className="text-slate-600 pl-7 text-xs">
                  Click the <strong>Share</strong> button on your Google Sheet and invite the Service Account email with <strong>Editor</strong> permission.
                </p>
              </li>

              <li className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-1">
                <div className="flex items-center gap-2 font-medium text-slate-900">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center shrink-0">
                    4
                  </span>
                  Add Environment Variables
                </div>
                <p className="text-slate-600 pl-7 text-xs">
                  Set <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">GOOGLE_SHEET_ID</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">GOOGLE_SERVICE_ACCOUNT_EMAIL</code>, and <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">GOOGLE_PRIVATE_KEY</code> in <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">.env.local</code> or Vercel.
                </p>
              </li>
            </ol>

            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/80 border border-blue-100 text-xs text-blue-900">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Auto-Schema Initialization:</span> You do not need to manually create column headers! When this app connects to a blank sheet, it automatically creates the header row (<code className="font-mono text-blue-800">id, name, email, role, status, notes, createdAt, updatedAt</code>) on the first write.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

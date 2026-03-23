'use client';

import { useState } from 'react';
import { Calendar, Download, FileSpreadsheet } from 'lucide-react';

interface ReportFilterProps {
  onDateRangeChange: (from: string, to: string) => void;
  onExportCSV?: () => void;
  onExportPDF?: () => void;
  isLoading?: boolean;
}

export default function ReportFilter({
  onDateRangeChange,
  onExportCSV,
  onExportPDF,
  isLoading,
}: ReportFilterProps) {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
    .toISOString()
    .split('T')[0];

  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);

  const handleApply = () => {
    onDateRangeChange(from, to);
  };

  const quickRanges = [
    { label: 'Last 7 Days', days: 7 },
    { label: 'Last 30 Days', days: 30 },
    { label: 'Last 90 Days', days: 90 },
    { label: 'This Year', days: -1 },
  ];

  const setQuickRange = (days: number) => {
    const end = new Date();
    let start: Date;
    if (days === -1) {
      start = new Date(end.getFullYear(), 0, 1);
    } else {
      start = new Date(Date.now() - days * 86400000);
    }
    const fromStr = start.toISOString().split('T')[0];
    const toStr = end.toISOString().split('T')[0];
    setFrom(fromStr);
    setTo(toStr);
    onDateRangeChange(fromStr, toStr);
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Quick ranges */}
        <div className="flex flex-wrap gap-1.5">
          {quickRanges.map((r) => (
            <button
              key={r.label}
              onClick={() => setQuickRange(r.days)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

        {/* Date inputs */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <span className="text-slate-400 text-sm">to</span>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleApply}
            disabled={isLoading}
            className="px-4 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Loading...' : 'Apply'}
          </button>
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

        {/* Export buttons */}
        <div className="flex gap-1.5">
          {onExportCSV && (
            <button
              onClick={onExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              CSV
            </button>
          )}
          {onExportPDF && (
            <button
              onClick={onExportPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              PDF
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

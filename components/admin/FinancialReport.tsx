'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatINR, getMonthLabel, CHART_COLORS, PALETTE } from '@/lib/charts';
import type { FinancialReportData } from '@/lib/reports';

interface FinancialReportProps {
  data: FinancialReportData;
}

export default function FinancialReport({ data }: FinancialReportProps) {
  const revenueData = data.monthlyRevenue.map((d) => ({
    ...d,
    monthLabel: getMonthLabel(d.month + '-01'),
  }));

  return (
    <div className="space-y-6">
      {/* Financial KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: formatINR(data.totalRevenue, true), color: 'text-blue-600' },
          { label: 'Collected', value: formatINR(data.collectedAmount, true), color: 'text-green-600' },
          { label: 'Outstanding', value: formatINR(data.outstandingAmount, true), color: 'text-amber-600' },
          { label: 'Overdue', value: formatINR(data.overdueAmount, true), color: 'text-red-600' },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4"
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
            <p className={`text-xl font-bold mt-1 ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Refunded', value: formatINR(data.refundedAmount, true) },
          { label: 'Commission Paid', value: formatINR(data.commissionPaid, true) },
          { label: 'Commission Pending', value: formatINR(data.commissionPending, true) },
          {
            label: 'Collection Rate',
            value: data.totalRevenue > 0
              ? `${((data.collectedAmount / data.totalRevenue) * 100).toFixed(1)}%`
              : '0%',
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3"
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue vs Collection Trend */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
          Revenue vs Collection (Monthly)
        </h4>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => formatINR(v, true)} />
              <Tooltip formatter={(v: any) => formatINR(v, true)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke={CHART_COLORS.primary}
                strokeWidth={2.5}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="collected"
                name="Collected"
                stroke={CHART_COLORS.success}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payment Mode Breakdown */}
      {data.paymentModeBreakdown.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
            Payment Mode Breakdown
          </h4>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.paymentModeBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mode" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => formatINR(v, true)} />
                <Tooltip formatter={(v: any) => formatINR(v, true)} />
                <Bar dataKey="amount" name="Amount" radius={[4, 4, 0, 0]}>
                  {data.paymentModeBreakdown.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatINR, getMonthLabel, PALETTE } from '@/lib/charts';
import type { BookingReportData } from '@/lib/reports';

interface BookingReportProps {
  data: BookingReportData;
}

export default function BookingReport({ data }: BookingReportProps) {
  const trendData = data.monthlyTrend.map((d) => ({
    ...d,
    monthLabel: getMonthLabel(d.month + '-01'),
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Bookings', value: String(data.totalBookings) },
          { label: 'Total Revenue', value: formatINR(data.totalRevenue, true) },
          { label: 'Avg Booking Value', value: formatINR(data.avgBookingValue, true) },
          { label: 'Paid Amount', value: formatINR(data.paidAmount, true) },
          { label: 'Outstanding', value: formatINR(data.outstandingAmount, true) },
          { label: 'Collection Rate', value: `${data.paymentCollectionRate.toFixed(1)}%` },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown (Pie) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
            Booking Status
          </h4>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.statusBreakdown}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(entry: any) => `${entry.status} (${entry.count})`}
                >
                  {data.statusBreakdown.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any, name: any) => [v, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Project Breakdown */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
            Revenue by Project
          </h4>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.projectBreakdown} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => formatINR(v, true)} />
                <YAxis type="category" dataKey="project" tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: any) => [formatINR(v, true), 'Revenue']} />
                <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
          Monthly Booking Trend
        </h4>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => formatINR(v, true)} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="bookings" name="Bookings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="revenue" name="Revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

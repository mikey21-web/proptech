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
import { PALETTE, getMonthLabel, formatPct } from '@/lib/charts';
import type { LeadReportData } from '@/lib/reports';

interface LeadReportProps {
  data: LeadReportData;
}

export default function LeadReport({ data }: LeadReportProps) {
  const trendData = data.monthlyTrend.map((d) => ({
    ...d,
    monthLabel: getMonthLabel(d.month + '-01'),
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Leads', value: data.totalLeads, color: 'text-blue-600' },
          { label: 'New Leads', value: data.newLeads, color: 'text-cyan-600' },
          { label: 'Converted', value: data.convertedLeads, color: 'text-green-600' },
          { label: 'Conversion Rate', value: formatPct(data.conversionRate), color: 'text-violet-600' },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4"
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
            <p className={`text-xl font-bold mt-1 ${item.color} dark:opacity-90`}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Breakdown (Pie Chart) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
            Lead Sources
          </h4>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.sourceBreakdown}
                  dataKey="count"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(entry: any) => `${entry.source} (${entry.percentage.toFixed(0)}%)`}
                  labelLine={{ strokeWidth: 1 }}
                >
                  {data.sourceBreakdown.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Breakdown (Horizontal Bar) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
            Status Distribution
          </h4>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.statusBreakdown} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="status" tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: any) => [v, 'Leads']} />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
          Monthly Lead Trend
        </h4>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="leads" name="Total Leads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="converted" name="Converted" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

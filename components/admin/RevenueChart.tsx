'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatINR, getMonthLabel, CHART_COLORS } from '@/lib/charts';

interface RevenueChartProps {
  data: Array<{
    month: string;
    revenue: number;
    target: number;
  }>;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 shadow-lg">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
        {label ? getMonthLabel(label + '-01') : ''}
      </p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatINR(entry.value, true)}
        </p>
      ))}
    </div>
  );
}

export default function RevenueChart({ data }: RevenueChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    monthLabel: getMonthLabel(d.month + '-01'),
  }));

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        Revenue Trend (12 Months)
      </h3>
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
            <XAxis
              dataKey="monthLabel"
              tick={{ fontSize: 12 }}
              className="text-slate-500"
            />
            <YAxis
              tickFormatter={(v) => formatINR(v, true)}
              tick={{ fontSize: 12 }}
              className="text-slate-500"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke={CHART_COLORS.primary}
              strokeWidth={2.5}
              dot={{ r: 4, fill: CHART_COLORS.primary }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="target"
              name="Target"
              stroke={CHART_COLORS.muted}
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

'use client';

import { CHART_COLORS } from '@/lib/charts';

interface LeadFunnelProps {
  data: Array<{
    status: string;
    count: number;
  }>;
}

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  negotiation: 'Negotiation',
  site_visit: 'Site Visit',
  proposal_sent: 'Proposal Sent',
  won: 'Won',
  lost: 'Lost',
  junk: 'Junk',
};

const FUNNEL_COLORS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#c084fc', '#22c55e', '#ef4444', '#94a3b8',
  '#6b7280',
];

export default function LeadFunnel({ data }: LeadFunnelProps) {
  const totalLeads = data.reduce((s, d) => s + d.count, 0);
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  // Filter out stages with 0 count (except won/lost)
  const stages = data.filter(
    (d) => d.count > 0 || d.status === 'won' || d.status === 'lost',
  );

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Lead Funnel
        </h3>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {totalLeads} total leads
        </span>
      </div>

      <div className="space-y-2.5">
        {stages.map((stage, index) => {
          const widthPct = Math.max((stage.count / maxCount) * 100, 8);
          const convPct =
            totalLeads > 0 ? ((stage.count / totalLeads) * 100).toFixed(1) : '0';
          const color = FUNNEL_COLORS[index % FUNNEL_COLORS.length];

          return (
            <div key={stage.status} className="group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {STATUS_LABELS[stage.status] || stage.status}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {stage.count}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    ({convPct}%)
                  </span>
                </div>
              </div>
              <div className="h-7 bg-slate-100 dark:bg-slate-700 rounded-md overflow-hidden">
                <div
                  className="h-full rounded-md transition-all duration-500 ease-out group-hover:opacity-80"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {totalLeads > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">
              Conversion Rate
            </span>
            <span className="font-semibold text-green-600 dark:text-green-400">
              {(
                ((data.find((d) => d.status === 'won')?.count || 0) /
                  totalLeads) *
                100
              ).toFixed(1)}
              %
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

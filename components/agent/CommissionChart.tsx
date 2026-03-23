'use client';

import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils';

interface CommissionData {
  id: string;
  amount: number | string;
  percentage: number | string | null;
  status: string;
  paidAt: string | null;
  createdAt: string;
  booking: {
    id: string;
    bookingNumber: string;
    netAmount: number | string;
    project: { name: string };
  };
}

interface CommissionChartProps {
  commissions: CommissionData[];
}

/**
 * Visual bar-chart-like representation of commissions by project.
 * Pure CSS; no external charting library needed.
 */
export function CommissionChart({ commissions }: CommissionChartProps) {
  if (commissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm text-muted-foreground">No commission data available yet.</p>
      </div>
    );
  }

  // Group by project
  const byProject: Record<string, { name: string; total: number; paid: number; pending: number; count: number }> = {};
  for (const c of commissions) {
    const pName = c.booking.project.name;
    if (!byProject[pName]) {
      byProject[pName] = { name: pName, total: 0, paid: 0, pending: 0, count: 0 };
    }
    const amt = Number(c.amount);
    byProject[pName].total += amt;
    byProject[pName].count += 1;
    if (c.status === 'paid') byProject[pName].paid += amt;
    if (c.status === 'pending' || c.status === 'approved') byProject[pName].pending += amt;
  }

  const projects = Object.values(byProject).sort((a, b) => b.total - a.total);
  const maxTotal = Math.max(...projects.map((p) => p.total), 1);

  // Group by month for monthly trend
  const byMonth: Record<string, number> = {};
  for (const c of commissions) {
    const d = new Date(c.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    byMonth[key] = (byMonth[key] ?? 0) + Number(c.amount);
  }
  const months = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6); // last 6 months
  const maxMonth = Math.max(...months.map(([, v]) => v), 1);

  return (
    <div className="space-y-8">
      {/* By Project */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Commission by Project</h3>
        <div className="space-y-3">
          {projects.map((p) => (
            <div key={p.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-foreground truncate max-w-[60%]">{p.name}</span>
                <span className="text-sm font-medium text-foreground">{formatCurrency(p.total)}</span>
              </div>
              <div className="h-4 rounded-full bg-muted overflow-hidden flex">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${(p.paid / maxTotal) * 100}%` }}
                  title={`Paid: ${formatCurrency(p.paid)}`}
                />
                <div
                  className="h-full bg-yellow-400 transition-all"
                  style={{ width: `${(p.pending / maxTotal) * 100}%` }}
                  title={`Pending: ${formatCurrency(p.pending)}`}
                />
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span>{p.count} booking{p.count !== 1 ? 's' : ''}</span>
                <span className="text-green-600 dark:text-green-400">Paid: {formatCurrency(p.paid)}</span>
                {p.pending > 0 && (
                  <span className="text-yellow-600 dark:text-yellow-400">Pending: {formatCurrency(p.pending)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly trend */}
      {months.length > 1 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Trend</h3>
          <div className="flex items-end gap-2 h-32">
            {months.map(([month, total]) => {
              const height = `${(total / maxMonth) * 100}%`;
              const [y, m] = month.split('-');
              const label = new Date(Number(y), Number(m) - 1).toLocaleDateString('en-IN', { month: 'short' });
              return (
                <div key={month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-foreground">
                    {total >= 100000 ? `${(total / 100000).toFixed(1)}L` : formatCurrency(total).replace('₹', '')}
                  </span>
                  <div className="w-full bg-muted rounded-t-sm overflow-hidden" style={{ height: '100%', position: 'relative' }}>
                    <div
                      className="absolute bottom-0 w-full bg-primary rounded-t-sm transition-all"
                      style={{ height }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-green-500" />
          <span className="text-muted-foreground">Paid</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-yellow-400" />
          <span className="text-muted-foreground">Pending/Approved</span>
        </div>
      </div>
    </div>
  );
}

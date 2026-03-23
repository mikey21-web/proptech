'use client';

import { MetricCard } from '@/components/ui/MetricCard';
import { formatCurrency, formatCompactCurrency } from '@/lib/utils';
import { IndianRupee, Target, TrendingUp, BookOpen, Users, Award } from 'lucide-react';

interface CommissionItem {
  id: string;
  amount: number | string;
  status: string;
  paidAt: string | null;
  createdAt: string;
  booking: {
    id: string;
    bookingNumber: string;
    totalAmount: number | string;
    netAmount: number | string;
    status: string;
    bookingDate: string;
    customer: { id: string; name: string };
    project: { id: string; name: string };
  };
}

interface PerformanceMetricsProps {
  commissions: CommissionItem[];
  summary: {
    totalEarned: number;
    totalPending: number;
    totalPaid: number;
    currentMonth: number;
  };
}

export function PerformanceMetrics({ commissions, summary }: PerformanceMetricsProps) {
  // Compute metrics
  const totalBookings = commissions.length;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const thisMonthCommissions = commissions.filter(
    (c) => new Date(c.createdAt) >= startOfMonth,
  );
  const lastMonthCommissions = commissions.filter(
    (c) => {
      const d = new Date(c.createdAt);
      return d >= startOfLastMonth && d < startOfMonth;
    },
  );

  const avgBookingValue =
    totalBookings > 0
      ? commissions.reduce((s, c) => s + Number(c.booking.netAmount), 0) / totalBookings
      : 0;

  const confirmedBookings = commissions.filter(
    (c) => c.booking.status !== 'cancelled' && c.booking.status !== 'refunded',
  ).length;
  const conversionRate = totalBookings > 0 ? (confirmedBookings / totalBookings) * 100 : 0;

  // Month over month growth
  const thisMonthTotal = thisMonthCommissions.reduce((s, c) => s + Number(c.amount), 0);
  const lastMonthTotal = lastMonthCommissions.reduce((s, c) => s + Number(c.amount), 0);
  const growth =
    lastMonthTotal > 0
      ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
      : thisMonthTotal > 0
        ? 100
        : 0;

  return (
    <div className="space-y-6">
      {/* Top metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Earned"
          value={formatCompactCurrency(summary.totalEarned)}
          subtitle="Approved + Paid"
          icon={IndianRupee}
        />
        <MetricCard
          title="Current Month"
          value={formatCompactCurrency(summary.currentMonth)}
          subtitle={`${thisMonthCommissions.length} commissions`}
          icon={TrendingUp}
          trend={growth !== 0 ? { value: Math.round(growth), label: 'vs last month' } : undefined}
        />
        <MetricCard
          title="Pending"
          value={formatCompactCurrency(summary.totalPending)}
          subtitle="Awaiting approval"
          icon={Target}
        />
        <MetricCard
          title="Paid Out"
          value={formatCompactCurrency(summary.totalPaid)}
          subtitle="Deposited to account"
          icon={Award}
        />
      </div>

      {/* Performance indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Total Bookings"
          value={String(totalBookings)}
          subtitle="Lifetime"
          icon={BookOpen}
        />
        <MetricCard
          title="Avg Booking Value"
          value={formatCompactCurrency(avgBookingValue)}
          icon={IndianRupee}
        />
        <MetricCard
          title="Success Rate"
          value={`${conversionRate.toFixed(1)}%`}
          subtitle={`${confirmedBookings} of ${totalBookings} active`}
          icon={Users}
        />
      </div>

      {/* Commission history table */}
      {commissions.length > 0 && (
        <div className="rounded-lg border border-border bg-card">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-base font-semibold text-foreground">Commission History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="grid">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Booking</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Project</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Booking Value</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Commission</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {commissions.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{c.booking.bookingNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.booking.project.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.booking.customer.name}</td>
                    <td className="px-4 py-3 text-foreground">{formatCurrency(Number(c.booking.netAmount))}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{formatCurrency(Number(c.amount))}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          c.status === 'paid'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : c.status === 'approved'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                              : c.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}
                      >
                        {c.status.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

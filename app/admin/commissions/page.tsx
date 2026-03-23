'use client';

import { useState, useEffect } from 'react';
import { IndianRupee, Search, Download, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface Commission {
  id: string;
  amount: number;
  percentage: number | null;
  status: string;
  approvedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  agent: {
    id: string;
    agentCode: string;
    user: { id: string; name: string | null; email: string };
  };
  booking: {
    id: string;
    bookingNumber: string;
    totalAmount: number;
    netAmount: number;
    status: string;
    bookingDate: string;
    customer: { id: string; name: string } | null;
    project: { id: string; name: string } | null;
  };
}

interface Summary {
  totalEarned: number;
  totalPending: number;
  totalPaid: number;
  currentMonth: number;
}

function formatCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  clawed_back: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalEarned: 0, totalPending: 0, totalPaid: 0, currentMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/commissions')
      .then(async (res) => {
        const json = await res.json();
        if (res.ok) {
          setCommissions(json.data?.commissions || []);
          setSummary(json.data?.summary || { totalEarned: 0, totalPending: 0, totalPaid: 0, currentMonth: 0 });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = commissions.filter(
    (c) =>
      (c.agent.user.name || '').toLowerCase().includes(search.toLowerCase()) ||
      c.agent.agentCode.toLowerCase().includes(search.toLowerCase()) ||
      c.booking.bookingNumber.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Commissions</h1>
          <p className="text-sm text-muted-foreground mt-1">Track agent commissions and payouts</p>
        </div>
        <button className="inline-flex items-center gap-2 border border-border text-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-accent transition-colors w-fit">
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Earned', value: formatCurrency(summary.totalEarned), icon: IndianRupee, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Total Paid', value: formatCurrency(summary.totalPaid), icon: CheckCircle, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Pending', value: formatCurrency(summary.totalPending), icon: Clock, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
          { label: 'This Month', value: formatCurrency(summary.currentMonth), icon: AlertCircle, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
                <div className={cn('p-1.5 rounded-lg', card.bg)}>
                  <Icon className={cn('h-4 w-4', card.color)} />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 w-full max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by agent, booking #..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
        />
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading commissions...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <IndianRupee className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No commissions found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Agent</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Booking</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3 hidden md:table-cell">Project</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3 hidden lg:table-cell">Booking Amt</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Commission</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3 hidden sm:table-cell">%</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3 hidden lg:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-foreground">{c.agent.user.name || c.agent.agentCode}</p>
                      <p className="text-xs text-muted-foreground">{c.agent.agentCode}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-primary">{c.booking.bookingNumber}</p>
                      <p className="text-xs text-muted-foreground">{c.booking.customer?.name || '—'}</p>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell text-sm text-foreground">{c.booking.project?.name || '—'}</td>
                    <td className="px-6 py-4 hidden lg:table-cell text-sm text-foreground">{formatCurrency(Number(c.booking.netAmount))}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-foreground">{formatCurrency(Number(c.amount))}</td>
                    <td className="px-6 py-4 hidden sm:table-cell text-sm text-muted-foreground">{c.percentage ? `${c.percentage}%` : '—'}</td>
                    <td className="px-6 py-4">
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize', statusColors[c.status] || 'bg-gray-100 text-gray-800')}>
                        {c.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell text-sm text-muted-foreground">
                      {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

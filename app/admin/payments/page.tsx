'use client';

import { useState, useEffect } from 'react';
import { IndianRupee, Search, Download, CreditCard, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface BookingPayment {
  id: string;
  bookingNumber: string;
  status: string;
  netAmount: number;
  paidAmount: number;
  balanceAmount: number;
  bookingDate: string;
  customer: { name: string } | null;
  project: { name: string } | null;
}

function formatCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function PaymentsPage() {
  const [bookings, setBookings] = useState<BookingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/bookings?limit=100')
      .then(async (res) => {
        const json = await res.json();
        if (res.ok) setBookings(json.data?.bookings || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = bookings.filter(
    (b) =>
      b.bookingNumber.toLowerCase().includes(search.toLowerCase()) ||
      (b.customer?.name || '').toLowerCase().includes(search.toLowerCase()),
  );

  const totalNet = bookings.reduce((s, b) => s + Number(b.netAmount), 0);
  const totalPaid = bookings.reduce((s, b) => s + Number(b.paidAmount), 0);
  const totalBalance = bookings.reduce((s, b) => s + Number(b.balanceAmount), 0);
  const fullyPaid = bookings.filter((b) => Number(b.balanceAmount) <= 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payments</h1>
          <p className="text-sm text-muted-foreground mt-1">Track payment collections across all bookings</p>
        </div>
        <button className="inline-flex items-center gap-2 border border-border text-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-accent transition-colors w-fit">
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Value', value: formatCurrency(totalNet), icon: IndianRupee, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Collected', value: formatCurrency(totalPaid), icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Outstanding', value: formatCurrency(totalBalance), icon: Clock, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'Fully Paid', value: `${fullyPaid}`, icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
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

      {/* Collection Progress */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-sm font-semibold text-foreground mb-3">Collection Progress</h2>
        <div className="h-4 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${totalNet > 0 ? (totalPaid / totalNet) * 100 : 0}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>{totalNet > 0 ? ((totalPaid / totalNet) * 100).toFixed(1) : 0}% collected</span>
          <span>{formatCurrency(totalBalance)} remaining</span>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 w-full max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by booking # or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
        />
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading payments...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Booking #</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Customer</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3 hidden md:table-cell">Project</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-6 py-3">Net Amount</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-6 py-3">Paid</th>
                  <th className="text-right text-xs font-medium text-muted-foreground px-6 py-3">Balance</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3 hidden sm:table-cell">Progress</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => {
                  const net = Number(b.netAmount);
                  const paid = Number(b.paidAmount);
                  const bal = Number(b.balanceAmount);
                  const pct = net > 0 ? (paid / net) * 100 : 0;
                  return (
                    <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-primary">{b.bookingNumber}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{b.customer?.name || '—'}</td>
                      <td className="px-6 py-4 hidden md:table-cell text-sm text-muted-foreground">{b.project?.name || '—'}</td>
                      <td className="px-6 py-4 text-sm font-medium text-foreground text-right">{formatCurrency(net)}</td>
                      <td className="px-6 py-4 text-sm font-medium text-green-600 text-right">{formatCurrency(paid)}</td>
                      <td className="px-6 py-4 text-sm font-medium text-right">
                        <span className={bal > 0 ? 'text-red-600' : 'text-green-600'}>
                          {bal > 0 ? formatCurrency(bal) : 'Paid'}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full', pct >= 100 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-400')}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Search, Filter, Download, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface Booking {
  id: string;
  bookingNumber: string;
  status: string;
  bookingDate: string;
  netAmount: number;
  customer: { name: string; phone: string } | null;
  project: { name: string } | null;
  agent: { user: { name: string } } | null;
  plot: { plotNumber: string } | null;
  flat: { flatNumber: string } | null;
}

function formatCurrency(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

const statusColors: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  agreement_signed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  registration_done: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  possession_given: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  refunded: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/bookings')
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bookings</h1>
          <p className="text-sm text-muted-foreground mt-1">Track and manage all property bookings</p>
        </div>
        <button className="inline-flex items-center gap-2 border border-border text-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-accent transition-colors w-fit">
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 flex-1 max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by booking # or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
          />
        </div>
        <button className="inline-flex items-center gap-2 border border-border px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <Filter className="h-4 w-4" />
          Filter
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading bookings...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {search ? 'No bookings match your search' : 'No bookings yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">
                    <button className="flex items-center gap-1 hover:text-foreground">Booking # <ArrowUpDown className="h-3 w-3" /></button>
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Customer</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Project</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Unit</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Agent</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">
                    <button className="flex items-center gap-1 hover:text-foreground">Amount <ArrowUpDown className="h-3 w-3" /></button>
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">
                    <button className="flex items-center gap-1 hover:text-foreground">Date <ArrowUpDown className="h-3 w-3" /></button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
                    <td className="px-6 py-4 text-sm font-medium text-primary">{b.bookingNumber}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-foreground">{b.customer?.name || '—'}</p>
                      {b.customer?.phone && <p className="text-xs text-muted-foreground">{b.customer.phone}</p>}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">{b.project?.name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{b.plot?.plotNumber || b.flat?.flatNumber || '—'}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{b.agent?.user?.name || '—'}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-foreground">{formatCurrency(Number(b.netAmount))}</td>
                    <td className="px-6 py-4">
                      <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', statusColors[b.status] || 'bg-gray-100 text-gray-800')}>
                        {b.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(b.bookingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
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

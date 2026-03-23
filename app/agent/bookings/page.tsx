'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookingCard, type BookingCardData } from '@/components/agent/BookingCard';
import { Pagination } from '@/components/ui/Pagination';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { MetricCard } from '@/components/ui/MetricCard';
import { useToast } from '@/components/ui/Toast';
import { formatCompactCurrency } from '@/lib/utils';
import { BookOpen, IndianRupee, Clock, CheckCircle2, Filter, X, Search, LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function BookingsPage() {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<BookingCardData[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  const fetchBookings = useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');
      if (statusFilter) params.set('status', statusFilter);
      if (projectFilter) params.set('projectId', projectFilter);

      const res = await fetch(`/api/bookings?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      setBookings(json.data.bookings);
      setPagination(json.data.pagination);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load bookings', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, projectFilter, toast]);

  useEffect(() => {
    fetchBookings(1);
  }, [fetchBookings]);

  const clearFilters = () => {
    setStatusFilter('');
    setProjectFilter('');
  };

  const hasFilters = statusFilter || projectFilter;

  // Compute quick stats
  const totalValue = bookings.reduce((s, b) => s + Number(b.netAmount), 0);
  const totalPaid = bookings.reduce((s, b) => s + Number(b.paidAmount), 0);
  const pendingCount = bookings.filter((b) => b.status === 'pending').length;
  const confirmedCount = bookings.filter(
    (b) => b.status !== 'pending' && b.status !== 'cancelled' && b.status !== 'refunded',
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Bookings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pagination.total} booking{pagination.total !== 1 ? 's' : ''} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-accent',
              )}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-accent',
              )}
              aria-label="Table view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
              showFilters || hasFilters
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-foreground hover:bg-accent',
            )}
          >
            <Filter className="h-4 w-4" /> Filters
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total Bookings" value={String(pagination.total)} icon={BookOpen} />
        <MetricCard title="Total Value" value={formatCompactCurrency(totalValue)} icon={IndianRupee} />
        <MetricCard title="Pending" value={String(pendingCount)} icon={Clock} />
        <MetricCard title="Confirmed" value={String(confirmedCount)} icon={CheckCircle2} />
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              aria-label="Filter by status"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="agreement_signed">Agreement Signed</option>
              <option value="registration_done">Registration Done</option>
              <option value="possession_given">Possession Given</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-border bg-card">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <BookOpen className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No bookings found</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="grid">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Booking #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Customer</th>
                  <th className="hidden md:table-cell text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Project</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Status</th>
                  <th className="hidden sm:table-cell text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Amount</th>
                  <th className="hidden lg:table-cell text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/agent/bookings/${b.id}`} className="font-medium text-primary hover:underline">
                        {b.bookingNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-foreground">{b.customer.name}</td>
                    <td className="hidden md:table-cell px-4 py-3 text-muted-foreground">{b.project.name}</td>
                    <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                    <td className="hidden sm:table-cell px-4 py-3 text-foreground">{formatCurrency(Number(b.netAmount))}</td>
                    <td className="hidden lg:table-cell px-4 py-3 text-muted-foreground">{formatDate(b.bookingDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && bookings.length > 0 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={(p) => fetchBookings(p)}
        />
      )}
    </div>
  );
}

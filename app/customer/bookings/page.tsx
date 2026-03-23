'use client';

import { useEffect, useState } from 'react';
import { BookOpen, AlertTriangle, Search } from 'lucide-react';
import BookingCard from '@/components/customer/BookingCard';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/customer/bookings')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setBookings(data.data.bookings);
        else setError(data.error || 'Failed to load bookings');
      })
      .catch(() => setError('Failed to load bookings'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = bookings.filter((b) => {
    if (filter !== 'all' && b.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        b.bookingNumber.toLowerCase().includes(q) ||
        b.project.name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-secondary rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-72 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-3" />
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  const statusFilters = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'agreement_signed', label: 'Agreement' },
    { key: 'registration_done', label: 'Registered' },
    { key: 'possession_given', label: 'Possession' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Bookings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track all your property bookings and milestones.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bookings..."
            className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label="Search bookings"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Filter by status">
          {statusFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              role="tab"
              aria-selected={filter === f.key}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                filter === f.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings grid */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground">
            {search || filter !== 'all'
              ? 'No bookings match your filters.'
              : 'No bookings yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  );
}

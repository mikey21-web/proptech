'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  IndianRupee,
  FileText,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatCompactCurrency } from '@/lib/utils/format';
import BookingCard from '@/components/customer/BookingCard';
import NotificationCenter from '@/components/customer/NotificationCenter';

interface DashboardData {
  bookings: any[];
  payments: {
    summary: {
      totalDue: number;
      totalPaid: number;
      overdueAmount: number;
      overdueCount: number;
      upcomingCount: number;
    };
  };
  messages: {
    notifications: any[];
    tickets: any[];
  };
  documents: {
    summary: {
      requiredCompleted: number;
      requiredTotal: number;
    };
  };
}

export default function CustomerDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const [bookingsRes, paymentsRes, messagesRes, docsRes] =
          await Promise.all([
            fetch('/api/customer/bookings'),
            fetch('/api/customer/payments'),
            fetch('/api/customer/messages'),
            fetch('/api/customer/documents'),
          ]);

        const [bookingsData, paymentsData, messagesData, docsData] =
          await Promise.all([
            bookingsRes.json(),
            paymentsRes.json(),
            messagesRes.json(),
            docsRes.json(),
          ]);

        setData({
          bookings: bookingsData.success ? bookingsData.data.bookings : [],
          payments: paymentsData.success
            ? paymentsData.data
            : { summary: { totalDue: 0, totalPaid: 0, overdueAmount: 0, overdueCount: 0, upcomingCount: 0 } },
          messages: messagesData.success
            ? messagesData.data
            : { notifications: [], tickets: [] },
          documents: docsData.success
            ? docsData.data
            : { summary: { requiredCompleted: 0, requiredTotal: 0 } },
        });
      } catch {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-secondary rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-3" />
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-sm font-medium text-primary hover:text-primary/80"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const bookings = data?.bookings || [];
  const summary = data?.payments.summary || {
    totalDue: 0, totalPaid: 0, overdueAmount: 0, overdueCount: 0, upcomingCount: 0,
  };
  const notifications = data?.messages.notifications || [];
  const docsSummary = data?.documents.summary || { requiredCompleted: 0, requiredTotal: 0 };
  const openTickets = (data?.messages.tickets || []).filter(
    (t: any) => t.status !== 'completed' && t.status !== 'cancelled',
  );

  const statCards = [
    {
      label: 'Active Bookings',
      value: bookings.filter((b: any) => !['cancelled', 'refunded'].includes(b.status)).length,
      icon: BookOpen,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
      href: '/customer/bookings',
    },
    {
      label: 'Total Paid',
      value: formatCompactCurrency(summary.totalPaid),
      icon: IndianRupee,
      color: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
      href: '/customer/payments',
    },
    {
      label: 'Outstanding',
      value: formatCompactCurrency(summary.totalDue),
      icon: TrendingUp,
      color: summary.overdueCount > 0
        ? 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30'
        : 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30',
      href: '/customer/payments',
      subtitle: summary.overdueCount > 0
        ? `${summary.overdueCount} overdue`
        : `${summary.upcomingCount} upcoming`,
    },
    {
      label: 'Documents',
      value: `${docsSummary.requiredCompleted}/${docsSummary.requiredTotal}`,
      icon: FileText,
      color: docsSummary.requiredCompleted === docsSummary.requiredTotal
        ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
        : 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30',
      href: '/customer/documents',
      subtitle: 'Required docs',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here is an overview of your property bookings and payments.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-border bg-card p-4 hover:shadow-sm hover:border-primary/20 transition-all"
          >
            <div className={cn('inline-flex rounded-lg p-2', card.color)}>
              <card.icon className="h-5 w-5" />
            </div>
            <p className="mt-3 text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
            {card.subtitle && (
              <p className="text-xs text-muted-foreground">{card.subtitle}</p>
            )}
          </Link>
        ))}
      </div>

      {/* Overdue warning */}
      {summary.overdueCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              You have {summary.overdueCount} overdue payment{summary.overdueCount > 1 ? 's' : ''} totaling{' '}
              {formatCurrency(summary.overdueAmount)}
            </p>
          </div>
          <Link
            href="/customer/payments"
            className="flex-shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
          >
            Pay Now
          </Link>
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bookings */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">My Bookings</h2>
            <Link
              href="/customer/bookings"
              className="text-sm font-medium text-primary hover:text-primary/80 inline-flex items-center gap-1"
            >
              View All <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {bookings.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground">
                No bookings yet. Contact your agent to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bookings.slice(0, 4).map((booking: any) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Link href="/customer/payments" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors">
                <IndianRupee className="h-4 w-4 text-green-600 dark:text-green-400" />
                Make a Payment
              </Link>
              <Link href="/customer/documents" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors">
                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Upload Documents
              </Link>
              <Link href="/customer/messages" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors">
                <MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                Submit a Query
                {openTickets.length > 0 && (
                  <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                    {openTickets.length}
                  </span>
                )}
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Recent Updates</h3>
            <NotificationCenter notifications={notifications.slice(0, 5)} />
          </div>
        </div>
      </div>
    </div>
  );
}

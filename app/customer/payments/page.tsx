'use client';

import { useEffect, useState } from 'react';
import {
  IndianRupee,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Clock,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatCompactCurrency } from '@/lib/utils/format';
import PaymentScheduleTable from '@/components/customer/PaymentScheduleTable';
import PaymentForm from '@/components/customer/PaymentForm';

export default function PaymentsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<{
    bookingId: string;
    bookingNumber: string;
    projectName: string;
    maxAmount: number;
    installmentId?: string;
    suggestedAmount?: number;
  } | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<string>('all');

  const fetchData = () => {
    setLoading(true);
    fetch('/api/customer/payments')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data);
        else setError(d.error || 'Failed to load payments');
      })
      .catch(() => setError('Failed to load payments'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handlePayNow = (bookingIdx: number, installmentId: string, amount: number) => {
    const booking = data.bookings[bookingIdx];
    if (!booking) return;
    setPaymentTarget({
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      projectName: booking.project.name,
      maxAmount: Number(booking.balanceAmount),
      installmentId,
      suggestedAmount: amount,
    });
    setShowPayment(true);
  };

  const handleDownloadReceipt = (paymentId: string) => {
    window.open(`/api/customer/payments/${paymentId}/receipt`, '_blank');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-secondary rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-secondary animate-pulse" />
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

  const { bookings, summary, razorpayKeyId } = data;

  const filteredBookings = selectedBooking === 'all'
    ? bookings
    : bookings.filter((b: any) => b.id === selectedBooking);

  const summaryCards = [
    {
      label: 'Total Paid',
      value: formatCompactCurrency(summary.totalPaid),
      icon: CheckCircle2,
      color: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'Outstanding',
      value: formatCompactCurrency(summary.totalDue),
      icon: TrendingUp,
      color: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30',
    },
    {
      label: 'Overdue',
      value: formatCurrency(summary.overdueAmount),
      icon: AlertTriangle,
      color: summary.overdueCount > 0
        ? 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30'
        : 'text-muted-foreground bg-secondary',
      subtitle: `${summary.overdueCount} installment${summary.overdueCount !== 1 ? 's' : ''}`,
    },
    {
      label: 'Upcoming',
      value: `${summary.upcomingCount}`,
      icon: Clock,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
      subtitle: 'installments',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Payments</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View your payment schedule, history, and make online payments.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className={cn('inline-flex rounded-lg p-2', card.color)}>
              <card.icon className="h-5 w-5" />
            </div>
            <p className="mt-2 text-xl font-bold text-foreground">
              {card.value}
            </p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
            {card.subtitle && (
              <p className="text-xs text-muted-foreground">{card.subtitle}</p>
            )}
          </div>
        ))}
      </div>

      {/* Booking selector */}
      {bookings.length > 1 && (
        <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="Select booking">
          <button
            role="tab"
            aria-selected={selectedBooking === 'all'}
            onClick={() => setSelectedBooking('all')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
              selectedBooking === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground',
            )}
          >
            All Bookings
          </button>
          {bookings.map((b: any) => (
            <button
              key={b.id}
              role="tab"
              aria-selected={selectedBooking === b.id}
              onClick={() => setSelectedBooking(b.id)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
                selectedBooking === b.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground',
              )}
            >
              {b.bookingNumber} — {b.project.name}
            </button>
          ))}
        </div>
      )}

      {/* Payment modal */}
      {showPayment && paymentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <PaymentForm
              bookingId={paymentTarget.bookingId}
              bookingNumber={paymentTarget.bookingNumber}
              projectName={paymentTarget.projectName}
              maxAmount={paymentTarget.maxAmount}
              installmentId={paymentTarget.installmentId}
              suggestedAmount={paymentTarget.suggestedAmount}
              razorpayKeyId={razorpayKeyId}
              onSuccess={() => {
                setShowPayment(false);
                setPaymentTarget(null);
                fetchData();
              }}
              onCancel={() => {
                setShowPayment(false);
                setPaymentTarget(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Per-booking payment tables */}
      {filteredBookings.map((booking: any, idx: number) => {
        const actualIdx = bookings.indexOf(booking);
        const propertyDetail = booking.plot
          ? `Plot ${booking.plot.plotNumber}`
          : booking.flat
            ? `Flat ${booking.flat.flatNumber}`
            : '';

        return (
          <div key={booking.id} className="rounded-xl border border-border bg-card p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {booking.project.name}
                  {propertyDetail && ` — ${propertyDetail}`}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {booking.bookingNumber} | Balance: {formatCurrency(Number(booking.balanceAmount))}
                </p>
              </div>
              {Number(booking.balanceAmount) > 0 && (
                <button
                  onClick={() => {
                    setPaymentTarget({
                      bookingId: booking.id,
                      bookingNumber: booking.bookingNumber,
                      projectName: booking.project.name,
                      maxAmount: Number(booking.balanceAmount),
                    });
                    setShowPayment(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  Pay Now
                </button>
              )}
            </div>

            <PaymentScheduleTable
              installments={booking.installments || []}
              payments={booking.payments || []}
              bookingId={booking.id}
              onPayNow={(installmentId, amount) =>
                handlePayNow(actualIdx, installmentId, amount)
              }
              onDownloadReceipt={handleDownloadReceipt}
            />
          </div>
        );
      })}

      {bookings.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <IndianRupee className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground">
            No payments to display. Your payment schedule will appear here once bookings are confirmed.
          </p>
        </div>
      )}
    </div>
  );
}

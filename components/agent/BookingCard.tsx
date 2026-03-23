'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Building2, User, Calendar, IndianRupee, ArrowRight } from 'lucide-react';

export interface BookingCardData {
  id: string;
  bookingNumber: string;
  status: string;
  bookingDate: string;
  totalAmount: number | string;
  netAmount: number | string;
  paidAmount: number | string;
  balanceAmount: number | string;
  customer: { id: string; name: string; phone: string };
  project: { id: string; name: string };
  agent: { id: string; agentCode: string; user: { name: string } } | null;
  plot: { id: string; plotNumber: string } | null;
  flat: { id: string; flatNumber: string } | null;
}

interface BookingCardProps {
  booking: BookingCardData;
  className?: string;
}

export function BookingCard({ booking, className }: BookingCardProps) {
  const paid = Number(booking.paidAmount);
  const net = Number(booking.netAmount);
  const paymentProgress = net > 0 ? Math.min((paid / net) * 100, 100) : 0;

  return (
    <Link
      href={`/agent/bookings/${booking.id}`}
      className={cn(
        'block rounded-lg border border-border bg-card p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{booking.bookingNumber}</span>
            <StatusBadge status={booking.status} />
          </div>
          <p className="text-base font-medium text-foreground mt-1">{booking.customer.name}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground truncate">{booking.project.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">{formatDate(booking.bookingDate)}</span>
        </div>
        {(booking.plot || booking.flat) && (
          <div className="flex items-center gap-2 col-span-2">
            <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
              {booking.plot ? `Plot ${booking.plot.plotNumber}` : `Flat ${booking.flat?.flatNumber}`}
            </span>
          </div>
        )}
      </div>

      {/* Payment progress */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Payment Progress</span>
          <span className="font-medium text-foreground">
            {formatCurrency(paid)} / {formatCurrency(net)}
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              paymentProgress >= 100
                ? 'bg-green-500'
                : paymentProgress >= 50
                  ? 'bg-blue-500'
                  : 'bg-yellow-500',
            )}
            style={{ width: `${paymentProgress}%` }}
          />
        </div>
        {Number(booking.balanceAmount) > 0 && (
          <p className="text-xs text-muted-foreground">
            Balance: {formatCurrency(Number(booking.balanceAmount))}
          </p>
        )}
      </div>
    </Link>
  );
}

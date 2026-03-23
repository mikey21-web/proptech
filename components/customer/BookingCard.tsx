'use client';

import Link from 'next/link';
import {
  Building2,
  MapPin,
  User,
  Phone,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDate } from '@/lib/utils/format';

interface BookingCardProps {
  booking: {
    id: string;
    bookingNumber: string;
    status: string;
    bookingDate: string;
    totalAmount: number | string;
    netAmount: number | string;
    paidAmount: number | string;
    balanceAmount: number | string;
    progressPercent: number;
    nextMilestone: { key: string; label: string } | null;
    project: { name: string; type: string; city: string | null };
    plot?: { plotNumber: string; area: number | string } | null;
    flat?: { flatNumber: string; floor: number; bedrooms: number } | null;
    agent?: {
      user: { name: string; phone: string | null };
    } | null;
  };
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: CheckCircle2 },
  agreement_signed: { label: 'Agreement Signed', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400', icon: CheckCircle2 },
  registration_done: { label: 'Registered', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', icon: CheckCircle2 },
  possession_given: { label: 'Possession Given', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: AlertCircle },
  refunded: { label: 'Refunded', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400', icon: AlertCircle },
};

export default function BookingCard({ booking }: BookingCardProps) {
  const status = statusConfig[booking.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const property = booking.plot
    ? `Plot ${booking.plot.plotNumber} (${Number(booking.plot.area).toLocaleString()} sq ft)`
    : booking.flat
      ? `Flat ${booking.flat.flatNumber}, Floor ${booking.flat.floor}, ${booking.flat.bedrooms} BHK`
      : 'N/A';

  return (
    <Link
      href={`/customer/bookings/${booking.id}`}
      className="block rounded-xl border border-border bg-card p-4 sm:p-6 transition-all hover:shadow-md hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {booking.project.name}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {booking.bookingNumber}
          </p>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
            status.color,
          )}
        >
          <StatusIcon className="h-3.5 w-3.5" />
          {status.label}
        </span>
      </div>

      {/* Property detail */}
      <div className="space-y-2 mb-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 flex-shrink-0" />
          <span>{property}</span>
        </div>
        {booking.project.city && (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span>{booking.project.city}</span>
          </div>
        )}
        {booking.agent && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 flex-shrink-0" />
            <span>Agent: {booking.agent.user.name}</span>
            {booking.agent.user.phone && (
              <a
                href={`https://wa.me/91${booking.agent.user.phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:text-green-700"
                onClick={(e) => e.stopPropagation()}
                aria-label={`WhatsApp ${booking.agent.user.name}`}
              >
                <Phone className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium text-foreground">
            {booking.progressPercent}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-secondary" role="progressbar" aria-valuenow={booking.progressPercent} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${booking.progressPercent}%` }}
          />
        </div>
        {booking.nextMilestone && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Next: {booking.nextMilestone.label}
          </p>
        )}
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-3 gap-3 rounded-lg bg-secondary/50 p-3">
        <div>
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-sm font-semibold text-foreground">
            {formatCurrency(Number(booking.netAmount))}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Paid</p>
          <p className="text-sm font-semibold text-green-600 dark:text-green-400">
            {formatCurrency(Number(booking.paidAmount))}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Due</p>
          <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
            {formatCurrency(Number(booking.balanceAmount))}
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-4 flex items-center justify-end text-xs text-primary font-medium">
        View Details
        <ChevronRight className="ml-1 h-4 w-4" />
      </div>
    </Link>
  );
}

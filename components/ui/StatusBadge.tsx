'use client';

import { cn } from '@/lib/utils/cn';

type StatusVariant =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'negotiation'
  | 'site_visit'
  | 'proposal_sent'
  | 'won'
  | 'lost'
  | 'junk'
  | 'pending'
  | 'confirmed'
  | 'agreement_signed'
  | 'registration_done'
  | 'possession_given'
  | 'cancelled'
  | 'refunded'
  | 'approved'
  | 'paid'
  | 'clawed_back'
  | 'hot'
  | 'warm'
  | 'cold'
  | 'converted'
  | 'dead'
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent'
  | 'upcoming'
  | 'due'
  | 'overdue'
  | 'partially_paid'
  | 'waived'
  | 'received'
  | 'verified'
  | 'bounced'
  | string;

const variantStyles: Record<string, string> = {
  // Lead statuses
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  contacted: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  qualified: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  negotiation: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  site_visit: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  proposal_sent: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  won: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  lost: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  junk: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',

  // Booking statuses
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  agreement_signed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  registration_done: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  possession_given: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  refunded: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',

  // Commission statuses
  approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  clawed_back: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',

  // Priority
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',

  // Installment
  upcoming: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  due: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  partially_paid: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  waived: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  received: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  verified: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  bounced: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',

  // Catch-all custom values
  hot: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  warm: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  cold: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  converted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  dead: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, className, size = 'sm' }: StatusBadgeProps) {
  const key = status.toLowerCase().replace(/ /g, '_');
  const style = variantStyles[key] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        style,
        className,
      )}
    >
      {label}
    </span>
  );
}

'use client';

import { formatINR } from '@/lib/charts';

interface BookingEntry {
  id: string;
  bookingNumber: string;
  status: string;
  bookingDate: string;
  netAmount: number | string;
  customer: { name: string; phone: string };
  project: { name: string };
  agent?: { user: { name: string } } | null;
  plot?: { plotNumber: string } | null;
  flat?: { flatNumber: string } | null;
}

interface RecentBookingsProps {
  bookings: BookingEntry[];
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  agreement_signed: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  registration_done: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  possession_given: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  refunded: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  agreement_signed: 'Agreement',
  registration_done: 'Registered',
  possession_given: 'Possession',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export default function RecentBookings({ bookings }: RecentBookingsProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        Recent Bookings
      </h3>

      {bookings.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
          No bookings yet
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                {['Booking #', 'Customer', 'Project', 'Unit', 'Amount', 'Agent', 'Status', 'Date'].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 pb-2 pr-3 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                >
                  <td className="py-2.5 pr-3 text-sm font-mono text-slate-900 dark:text-white">
                    {b.bookingNumber}
                  </td>
                  <td className="py-2.5 pr-3">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {b.customer.name}
                    </p>
                    <p className="text-xs text-slate-500">{b.customer.phone}</p>
                  </td>
                  <td className="py-2.5 pr-3 text-sm text-slate-700 dark:text-slate-300">
                    {b.project.name}
                  </td>
                  <td className="py-2.5 pr-3 text-sm text-slate-700 dark:text-slate-300">
                    {b.plot?.plotNumber || b.flat?.flatNumber || '-'}
                  </td>
                  <td className="py-2.5 pr-3 text-sm font-medium text-slate-900 dark:text-white whitespace-nowrap">
                    {formatINR(Number(b.netAmount), true)}
                  </td>
                  <td className="py-2.5 pr-3 text-sm text-slate-700 dark:text-slate-300">
                    {b.agent?.user?.name || '-'}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_STYLES[b.status] || STATUS_STYLES.pending
                      }`}
                    >
                      {STATUS_LABELS[b.status] || b.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {new Date(b.bookingDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

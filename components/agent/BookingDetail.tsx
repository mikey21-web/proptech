'use client';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { WhatsAppButton } from '@/components/agent/WhatsAppButton';
import { PaymentScheduleTable } from '@/components/agent/PaymentScheduleTable';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils/cn';
import {
  Building2,
  User,
  Calendar,
  Phone,
  Mail,
  FileText,
  CreditCard,
  IndianRupee,
  MapPin,
} from 'lucide-react';

interface Payment {
  id: string;
  receiptNumber: string | null;
  amount: number | string;
  mode: string;
  status: string;
  paymentDate: string;
  referenceNo: string | null;
}

interface Installment {
  id: string;
  installmentNo: number;
  amount: number | string;
  dueDate: string;
  paidAmount: number | string;
  status: string;
}

interface CommissionData {
  id: string;
  amount: number | string;
  percentage: number | string | null;
  status: string;
}

interface BookingDetailData {
  id: string;
  bookingNumber: string;
  status: string;
  bookingDate: string;
  agreementDate: string | null;
  registrationDate: string | null;
  possessionDate: string | null;
  totalAmount: number | string;
  discountAmount: number | string;
  netAmount: number | string;
  paidAmount: number | string;
  balanceAmount: number | string;
  gstAmount: number | string;
  stampDuty: number | string;
  registrationFee: number | string;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    panNumber: string | null;
  };
  project: { id: string; name: string; type: string; city: string | null };
  plot: { id: string; plotNumber: string; area: number | string; price: number | string; status: string } | null;
  flat: {
    id: string;
    flatNumber: string;
    floor: number;
    bedrooms: number;
    area: number | string;
    price: number | string;
    status: string;
  } | null;
  agent: {
    id: string;
    agentCode: string;
    user: { name: string; email: string };
  } | null;
  createdBy: { id: string; name: string } | null;
  payments: Payment[];
  commissions: CommissionData[];
  installments: Installment[];
}

interface BookingDetailProps {
  booking: BookingDetailData;
}

export function BookingDetail({ booking }: BookingDetailProps) {
  const paid = Number(booking.paidAmount);
  const net = Number(booking.netAmount);
  const paymentProgress = net > 0 ? Math.min((paid / net) * 100, 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{booking.bookingNumber}</h1>
            <StatusBadge status={booking.status} size="md" />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Booked on {formatDate(booking.bookingDate)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <WhatsAppButton
            phone={booking.customer.phone}
            message={`Hi ${booking.customer.name}, regarding your booking ${booking.bookingNumber} at ${booking.project.name}.`}
          />
          <a
            href={`tel:${booking.customer.phone}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Phone className="h-3.5 w-3.5" /> Call Customer
          </a>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Total Amount" value={formatCurrency(Number(booking.totalAmount))} />
        <SummaryCard label="Net Amount" value={formatCurrency(net)} />
        <SummaryCard label="Paid" value={formatCurrency(paid)} variant="success" />
        <SummaryCard label="Balance" value={formatCurrency(Number(booking.balanceAmount))} variant={Number(booking.balanceAmount) > 0 ? 'warning' : 'success'} />
      </div>

      {/* Payment progress bar */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Payment Progress</span>
          <span className="text-sm text-muted-foreground">{paymentProgress.toFixed(1)}%</span>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden">
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer */}
          <InfoCard title="Customer Information" icon={User}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoItem label="Name" value={booking.customer.name} />
              <InfoItem label="Phone" value={booking.customer.phone} />
              {booking.customer.email && <InfoItem label="Email" value={booking.customer.email} />}
              {booking.customer.panNumber && <InfoItem label="PAN" value={booking.customer.panNumber} />}
            </div>
          </InfoCard>

          {/* Property */}
          <InfoCard title="Property Details" icon={Building2}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoItem label="Project" value={booking.project.name} />
              <InfoItem label="Type" value={booking.project.type.replace(/_/g, ' ')} />
              {booking.project.city && <InfoItem label="City" value={booking.project.city} />}
              {booking.plot && (
                <>
                  <InfoItem label="Plot Number" value={booking.plot.plotNumber} />
                  <InfoItem label="Area" value={`${Number(booking.plot.area)} sq ft`} />
                  <InfoItem label="Plot Price" value={formatCurrency(Number(booking.plot.price))} />
                </>
              )}
              {booking.flat && (
                <>
                  <InfoItem label="Flat Number" value={booking.flat.flatNumber} />
                  <InfoItem label="Floor" value={String(booking.flat.floor)} />
                  <InfoItem label="Bedrooms" value={String(booking.flat.bedrooms)} />
                  <InfoItem label="Area" value={`${Number(booking.flat.area)} sq ft`} />
                </>
              )}
            </div>
          </InfoCard>

          {/* Payment schedule */}
          {booking.installments.length > 0 && (
            <InfoCard title="Payment Schedule" icon={CreditCard}>
              <PaymentScheduleTable installments={booking.installments} />
            </InfoCard>
          )}

          {/* Payments */}
          {booking.payments.length > 0 && (
            <InfoCard title="Payment History" icon={IndianRupee}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" role="grid">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Receipt</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Amount</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Mode</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Status</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {booking.payments.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium text-foreground">{p.receiptNumber ?? '-'}</td>
                        <td className="px-3 py-2 text-foreground">{formatCurrency(Number(p.amount))}</td>
                        <td className="px-3 py-2 text-muted-foreground capitalize">{p.mode.replace(/_/g, ' ')}</td>
                        <td className="px-3 py-2"><StatusBadge status={p.status} /></td>
                        <td className="px-3 py-2 text-muted-foreground">{formatDate(p.paymentDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </InfoCard>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Dates */}
          <InfoCard title="Key Dates" icon={Calendar}>
            <div className="space-y-3">
              <InfoItem label="Booking Date" value={formatDate(booking.bookingDate)} />
              {booking.agreementDate && <InfoItem label="Agreement Date" value={formatDate(booking.agreementDate)} />}
              {booking.registrationDate && <InfoItem label="Registration Date" value={formatDate(booking.registrationDate)} />}
              {booking.possessionDate && <InfoItem label="Possession Date" value={formatDate(booking.possessionDate)} />}
            </div>
          </InfoCard>

          {/* Financial breakdown */}
          <InfoCard title="Financial Summary" icon={IndianRupee}>
            <div className="space-y-2">
              <FinRow label="Total Amount" value={formatCurrency(Number(booking.totalAmount))} />
              {Number(booking.discountAmount) > 0 && (
                <FinRow label="Discount" value={`-${formatCurrency(Number(booking.discountAmount))}`} variant="discount" />
              )}
              {Number(booking.gstAmount) > 0 && (
                <FinRow label="GST" value={formatCurrency(Number(booking.gstAmount))} />
              )}
              {Number(booking.stampDuty) > 0 && (
                <FinRow label="Stamp Duty" value={formatCurrency(Number(booking.stampDuty))} />
              )}
              {Number(booking.registrationFee) > 0 && (
                <FinRow label="Registration Fee" value={formatCurrency(Number(booking.registrationFee))} />
              )}
              <div className="border-t border-border pt-2">
                <FinRow label="Net Amount" value={formatCurrency(net)} bold />
              </div>
            </div>
          </InfoCard>

          {/* Commission */}
          {booking.commissions.length > 0 && (
            <InfoCard title="Commission" icon={IndianRupee}>
              <div className="space-y-2">
                {booking.commissions.map((c) => (
                  <div key={c.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{formatCurrency(Number(c.amount))}</p>
                      {c.percentage && <p className="text-xs text-muted-foreground">{Number(c.percentage)}%</p>}
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                ))}
              </div>
            </InfoCard>
          )}

          {/* Remarks */}
          {booking.remarks && (
            <InfoCard title="Remarks" icon={FileText}>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{booking.remarks}</p>
            </InfoCard>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, icon: Icon, children }: { title: string; icon: typeof User; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" /> {title}
      </h2>
      {children}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function SummaryCard({ label, value, variant }: { label: string; value: string; variant?: 'success' | 'warning' }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn(
        'text-lg font-bold mt-1',
        variant === 'success' ? 'text-green-600 dark:text-green-400' :
        variant === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
        'text-foreground'
      )}>
        {value}
      </p>
    </div>
  );
}

function FinRow({ label, value, bold, variant }: { label: string; value: string; bold?: boolean; variant?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn('text-sm', bold ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{label}</span>
      <span className={cn(
        'text-sm',
        bold ? 'font-semibold text-foreground' : 'text-foreground',
        variant === 'discount' && 'text-green-600 dark:text-green-400',
      )}>
        {value}
      </span>
    </div>
  );
}

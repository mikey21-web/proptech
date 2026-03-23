'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  MapPin,
  User,
  Phone,
  AlertTriangle,
  IndianRupee,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import BookingTimeline from '@/components/customer/BookingTimeline';
import DocumentChecklist from '@/components/customer/DocumentChecklist';
import PaymentScheduleTable from '@/components/customer/PaymentScheduleTable';
import WhatsAppChat from '@/components/customer/WhatsAppChat';
import PaymentForm from '@/components/customer/PaymentForm';

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<{
    installmentId?: string;
    amount: number;
  } | null>(null);
  const [razorpayKeyId, setRazorpayKeyId] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`/api/customer/bookings/${bookingId}`).then((r) => r.json()),
      fetch('/api/customer/payments').then((r) => r.json()),
    ])
      .then(([bookingData, paymentsData]) => {
        if (bookingData.success) {
          setData(bookingData.data);
        } else {
          setError(bookingData.error || 'Booking not found');
        }
        if (paymentsData.success) {
          setRazorpayKeyId(paymentsData.data.razorpayKeyId || '');
        }
      })
      .catch(() => setError('Failed to load booking'))
      .finally(() => setLoading(false));
  }, [bookingId]);

  const handlePayNow = (installmentId: string, amount: number) => {
    setPaymentTarget({ installmentId, amount });
    setShowPayment(true);
  };

  const handlePaymentSuccess = () => {
    setShowPayment(false);
    setPaymentTarget(null);
    // Reload data
    setLoading(true);
    fetch(`/api/customer/bookings/${bookingId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data);
      })
      .finally(() => setLoading(false));
  };

  const handleDownloadReceipt = (paymentId: string) => {
    window.open(`/api/customer/payments/${paymentId}/receipt`, '_blank');
  };

  const handleDocUpload = (docType: string) => {
    router.push(`/customer/documents?upload=${docType}`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-secondary rounded animate-pulse" />
        <div className="h-48 rounded-xl bg-secondary animate-pulse" />
        <div className="h-64 rounded-xl bg-secondary animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-3" />
        <p className="text-muted-foreground">{error}</p>
        <Link href="/customer/bookings" className="mt-3 inline-block text-sm font-medium text-primary">
          Back to Bookings
        </Link>
      </div>
    );
  }

  const { booking, milestones, documentChecklist } = data;
  const property = booking.plot
    ? `Plot ${booking.plot.plotNumber}${booking.plot.dimensions ? ` (${booking.plot.dimensions})` : ''}`
    : booking.flat
      ? `Flat ${booking.flat.flatNumber}, Floor ${booking.flat.floor}, ${booking.flat.bedrooms} BHK`
      : 'N/A';

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/customer/bookings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Bookings
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {booking.project.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {booking.bookingNumber} | Booked on {formatDate(booking.bookingDate)}
            </p>
            <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                {property}
              </span>
              {booking.project.city && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {booking.project.city}
                  {booking.project.state ? `, ${booking.project.state}` : ''}
                </span>
              )}
            </div>
          </div>

          {/* Financial overview */}
          <div className="grid grid-cols-3 gap-4 sm:text-right">
            <div>
              <p className="text-xs text-muted-foreground">Net Amount</p>
              <p className="text-base font-bold text-foreground">
                {formatCurrency(Number(booking.netAmount))}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Paid</p>
              <p className="text-base font-bold text-green-600 dark:text-green-400">
                {formatCurrency(Number(booking.paidAmount))}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className="text-base font-bold text-orange-600 dark:text-orange-400">
                {formatCurrency(Number(booking.balanceAmount))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment modal */}
      {showPayment && paymentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <PaymentForm
              bookingId={bookingId}
              bookingNumber={booking.bookingNumber}
              projectName={booking.project.name}
              maxAmount={Number(booking.balanceAmount)}
              installmentId={paymentTarget.installmentId}
              suggestedAmount={paymentTarget.amount}
              razorpayKeyId={razorpayKeyId}
              onSuccess={handlePaymentSuccess}
              onCancel={() => {
                setShowPayment(false);
                setPaymentTarget(null);
              }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline */}
          <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">
              Booking Timeline
            </h2>
            <BookingTimeline milestones={milestones} />
          </div>

          {/* Payments */}
          <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">
                Payments
              </h2>
              {Number(booking.balanceAmount) > 0 && (
                <button
                  onClick={() => {
                    setPaymentTarget({
                      amount: Number(booking.balanceAmount),
                    });
                    setShowPayment(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <IndianRupee className="h-3.5 w-3.5" />
                  Make Payment
                </button>
              )}
            </div>
            <PaymentScheduleTable
              installments={booking.installments || []}
              payments={booking.payments || []}
              bookingId={bookingId}
              onPayNow={handlePayNow}
              onDownloadReceipt={handleDownloadReceipt}
            />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Agent contact */}
          {booking.agent && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Your Agent
              </h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {booking.agent.user.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {booking.agent.agentCode}
                  </p>
                </div>
              </div>
              {booking.agent.user.phone && (
                <WhatsAppChat
                  agentName={booking.agent.user.name}
                  agentPhone={booking.agent.user.phone}
                  bookingNumber={booking.bookingNumber}
                />
              )}
            </div>
          )}

          {/* Document checklist */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Document Checklist
            </h3>
            <DocumentChecklist
              items={documentChecklist}
              onUpload={handleDocUpload}
            />
          </div>

          {/* Booking details */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Booking Details
            </h3>
            <dl className="space-y-2 text-sm">
              {booking.project.reraNumber && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">RERA No</dt>
                  <dd className="font-medium text-foreground">{booking.project.reraNumber}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Total Amount</dt>
                <dd className="font-medium text-foreground">{formatCurrency(Number(booking.totalAmount))}</dd>
              </div>
              {Number(booking.discountAmount) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Discount</dt>
                  <dd className="font-medium text-green-600">-{formatCurrency(Number(booking.discountAmount))}</dd>
                </div>
              )}
              {Number(booking.gstAmount) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">GST</dt>
                  <dd className="font-medium text-foreground">{formatCurrency(Number(booking.gstAmount))}</dd>
                </div>
              )}
              {Number(booking.stampDuty) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Stamp Duty</dt>
                  <dd className="font-medium text-foreground">{formatCurrency(Number(booking.stampDuty))}</dd>
                </div>
              )}
              {Number(booking.registrationFee) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Registration Fee</dt>
                  <dd className="font-medium text-foreground">{formatCurrency(Number(booking.registrationFee))}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2">
                <dt className="font-medium text-foreground">Net Amount</dt>
                <dd className="font-bold text-foreground">{formatCurrency(Number(booking.netAmount))}</dd>
              </div>
            </dl>
          </div>

          {/* Loan info */}
          {booking.loans && booking.loans.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Home Loan
              </h3>
              {booking.loans.map((loan: any) => (
                <dl key={loan.id} className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Bank</dt>
                    <dd className="font-medium text-foreground">{loan.bankName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Sanctioned</dt>
                    <dd className="font-medium text-foreground">{formatCurrency(Number(loan.sanctionedAmount))}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Interest Rate</dt>
                    <dd className="font-medium text-foreground">{Number(loan.interestRate)}%</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className="font-medium text-foreground capitalize">{loan.status.replace('_', ' ')}</dd>
                  </div>
                </dl>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatCurrency, formatDate } from '@/lib/utils/format';

interface Installment {
  id: string;
  installmentNo: number;
  amount: number | string;
  dueDate: string;
  paidAmount: number | string;
  status: string;
  paidDate?: string | null;
}

interface Payment {
  id: string;
  receiptNumber?: string | null;
  amount: number | string;
  mode: string;
  status: string;
  paymentDate: string;
  referenceNo?: string | null;
}

interface PaymentScheduleTableProps {
  installments: Installment[];
  payments: Payment[];
  bookingId: string;
  onPayNow?: (installmentId: string, amount: number) => void;
  onDownloadReceipt?: (paymentId: string) => void;
  className?: string;
}

const installmentStatusConfig: Record<
  string,
  { label: string; color: string; icon: typeof CheckCircle2 }
> = {
  paid: { label: 'Paid', color: 'text-green-600 dark:text-green-400', icon: CheckCircle2 },
  partially_paid: { label: 'Partial', color: 'text-blue-600 dark:text-blue-400', icon: Clock },
  due: { label: 'Due', color: 'text-amber-600 dark:text-amber-400', icon: Clock },
  overdue: { label: 'Overdue', color: 'text-red-600 dark:text-red-400', icon: AlertTriangle },
  upcoming: { label: 'Upcoming', color: 'text-muted-foreground', icon: Clock },
  waived: { label: 'Waived', color: 'text-gray-500', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'text-gray-400', icon: Clock },
};

const paymentModeLabels: Record<string, string> = {
  cash: 'Cash',
  cheque: 'Cheque',
  bank_transfer: 'NEFT/RTGS',
  upi: 'UPI',
  credit_card: 'Credit Card',
  debit_card: 'Debit Card',
  demand_draft: 'DD',
  emi: 'EMI',
  loan: 'Loan',
  other: 'Other',
};

export default function PaymentScheduleTable({
  installments,
  payments,
  bookingId,
  onPayNow,
  onDownloadReceipt,
  className,
}: PaymentScheduleTableProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Payment Schedule */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">
          Payment Schedule
        </h3>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">#</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Due Date</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Paid</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {installments.map((inst) => {
                const config = installmentStatusConfig[inst.status] || installmentStatusConfig.upcoming;
                const StatusIcon = config.icon;
                const remaining = Number(inst.amount) - Number(inst.paidAmount);
                const canPay = ['due', 'overdue', 'upcoming', 'partially_paid'].includes(inst.status) && remaining > 0;

                return (
                  <tr key={inst.id} className="hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {inst.installmentNo}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {formatDate(inst.dueDate)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">
                      {formatCurrency(Number(inst.amount))}
                    </td>
                    <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                      {formatCurrency(Number(inst.paidAmount))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('inline-flex items-center gap-1', config.color)}>
                        <StatusIcon className="h-4 w-4" />
                        <span className="text-xs font-medium">{config.label}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canPay && onPayNow && (
                        <button
                          onClick={() => onPayNow(inst.id, remaining)}
                          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                          aria-label={`Pay installment ${inst.installmentNo}`}
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          Pay Now
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {installments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No installments scheduled yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment History */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">
          Payment History
        </h3>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Receipt</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Mode</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">
                    {payment.receiptNumber || '—'}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {formatDate(payment.paymentDate)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-green-600 dark:text-green-400">
                    {formatCurrency(Number(payment.amount))}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {paymentModeLabels[payment.mode] || payment.mode}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {payment.referenceNo || '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {['received', 'verified'].includes(payment.status) && onDownloadReceipt && (
                      <button
                        onClick={() => onDownloadReceipt(payment.id)}
                        className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-xs font-medium"
                        aria-label={`Download receipt ${payment.receiptNumber}`}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No payments recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

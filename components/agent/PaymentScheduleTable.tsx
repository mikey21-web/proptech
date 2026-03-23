'use client';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils/cn';

interface Installment {
  id: string;
  installmentNo: number;
  amount: number | string;
  dueDate: string;
  paidAmount: number | string;
  status: string;
}

interface PaymentScheduleTableProps {
  installments: Installment[];
}

export function PaymentScheduleTable({ installments }: PaymentScheduleTableProps) {
  if (installments.length === 0) {
    return <p className="text-sm text-muted-foreground">No installments scheduled.</p>;
  }

  const now = new Date();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" role="grid">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">#</th>
            <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Amount</th>
            <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Due Date</th>
            <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Paid</th>
            <th className="text-left px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {installments.map((inst) => {
            const dueDate = new Date(inst.dueDate);
            const isOverdue = dueDate < now && inst.status !== 'paid' && inst.status !== 'waived' && inst.status !== 'cancelled';
            return (
              <tr
                key={inst.id}
                className={cn(
                  'hover:bg-muted/30 transition-colors',
                  isOverdue && 'bg-red-50/50 dark:bg-red-900/10',
                )}
              >
                <td className="px-3 py-2 font-medium text-foreground">{inst.installmentNo}</td>
                <td className="px-3 py-2 text-foreground">{formatCurrency(Number(inst.amount))}</td>
                <td className="px-3 py-2">
                  <span className={cn(
                    'text-muted-foreground',
                    isOverdue && 'text-red-600 dark:text-red-400 font-medium',
                  )}>
                    {formatDate(inst.dueDate)}
                  </span>
                </td>
                <td className="px-3 py-2 text-foreground">{formatCurrency(Number(inst.paidAmount))}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={isOverdue && inst.status !== 'overdue' ? 'overdue' : inst.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border bg-muted/30">
            <td className="px-3 py-2 font-semibold text-foreground">Total</td>
            <td className="px-3 py-2 font-semibold text-foreground">
              {formatCurrency(installments.reduce((s, i) => s + Number(i.amount), 0))}
            </td>
            <td className="px-3 py-2" />
            <td className="px-3 py-2 font-semibold text-foreground">
              {formatCurrency(installments.reduce((s, i) => s + Number(i.paidAmount), 0))}
            </td>
            <td className="px-3 py-2" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

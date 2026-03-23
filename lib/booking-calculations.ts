import { Decimal } from '@prisma/client/runtime/library';

export interface InstallmentSchedule {
  installments: Array<{
    installmentNo: number;
    dueDate: Date;
    amount: Decimal;
    status: 'upcoming';
  }>;
  totalAmount: Decimal;
}

export function calculateInstallments(
  totalAmount: number,
  downPaymentAmount: number,
  numberOfInstallments: number,
  frequencyMonths: number = 1,
  startDate: Date = new Date(),
): InstallmentSchedule {
  const installments = [];
  const remainingAmount = totalAmount - downPaymentAmount;
  const installmentAmount = remainingAmount / numberOfInstallments;

  // Down payment (0th installment)
  if (downPaymentAmount > 0) {
    installments.push({
      installmentNo: 0,
      dueDate: startDate,
      amount: new Decimal(downPaymentAmount),
      status: 'upcoming' as const,
    });
  }

  // Regular installments
  for (let i = 1; i <= numberOfInstallments; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + frequencyMonths * i);

    // Handle last installment rounding
    let amount = installmentAmount;
    if (i === numberOfInstallments) {
      // Ensure last installment covers any rounding differences
      const sumOfPrevious = installments.reduce(
        (sum, inst) => sum + inst.amount.toNumber(),
        0,
      );
      amount = totalAmount - sumOfPrevious;
    }

    installments.push({
      installmentNo: i,
      dueDate,
      amount: new Decimal(amount),
      status: 'upcoming' as const,
    });
  }

  return {
    installments,
    totalAmount: new Decimal(totalAmount),
  };
}

export function calculateNetAmount(
  basePrice: number,
  discountAmount: number = 0,
  gstAmount: number = 0,
  stampDuty: number = 0,
  registrationFee: number = 0,
): number {
  return basePrice - discountAmount + gstAmount + stampDuty + registrationFee;
}

export function calculateInstallmentStats(
  installments: Array<{ amount: Decimal }>,
): {
  totalAmount: Decimal;
  averageAmount: Decimal;
  minAmount: Decimal;
  maxAmount: Decimal;
} {
  const amounts = installments.map((i) => i.amount.toNumber());
  const total = amounts.reduce((sum, a) => sum + a, 0);

  return {
    totalAmount: new Decimal(total),
    averageAmount: new Decimal(total / amounts.length),
    minAmount: new Decimal(Math.min(...amounts)),
    maxAmount: new Decimal(Math.max(...amounts)),
  };
}

export function getInstallmentFrequencyMonths(
  frequency: 'monthly' | 'quarterly' | 'semi_annual',
): number {
  switch (frequency) {
    case 'monthly':
      return 1;
    case 'quarterly':
      return 3;
    case 'semi_annual':
      return 6;
    default:
      return 1;
  }
}

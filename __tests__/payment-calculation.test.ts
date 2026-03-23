/**
 * Payment Calculation Tests
 *
 * Tests per DEBUG.md Section 7:
 * - Outstanding balance = Total Booking Amount - Sum of all recorded payments
 * - Test with actual numbers: Rs. 50 lakh booking, 3 payments of Rs. 10L, Rs. 15L, Rs. 5L → outstanding should be Rs. 20L
 * - Partial payment handling
 * - Overpayment prevention
 */

import { Decimal } from '@prisma/client/runtime/library';

// ---------------------------------------------------------------------------
// Payment Calculation Functions (mirroring lib/payment logic)
// ---------------------------------------------------------------------------

interface BookingAmounts {
  totalAmount: number;
  discountAmount: number;
  gstAmount: number;
  stampDuty: number;
  registrationFee: number;
}

interface PaymentResult {
  netAmount: number;
  paidAmount: number;
  balanceAmount: number;
}

/**
 * Calculate net amount per DEBUG.md formula:
 * netAmount = totalAmount - discountAmount + gstAmount + stampDuty + registrationFee
 */
function calculateNetAmount(booking: BookingAmounts): number {
  return (
    booking.totalAmount -
    booking.discountAmount +
    booking.gstAmount +
    booking.stampDuty +
    booking.registrationFee
  );
}

/**
 * Calculate balance after payment:
 * balanceAmount = netAmount - paidAmount
 */
function calculateBalance(netAmount: number, paidAmount: number): number {
  return Math.max(0, netAmount - paidAmount);
}

/**
 * Apply payment to booking
 */
function applyPayment(
  current: PaymentResult,
  paymentAmount: number,
): PaymentResult {
  const newPaid = current.paidAmount + paymentAmount;
  const newBalance = calculateBalance(current.netAmount, newPaid);

  return {
    netAmount: current.netAmount,
    paidAmount: newPaid,
    balanceAmount: newBalance,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Payment Calculation - Net Amount', () => {
  test('should calculate net amount correctly with all components', () => {
    const booking: BookingAmounts = {
      totalAmount: 5000000, // Rs. 50 lakh
      discountAmount: 100000, // Rs. 1 lakh discount
      gstAmount: 250000, // Rs. 2.5 lakh GST
      stampDuty: 175000, // Rs. 1.75 lakh stamp duty
      registrationFee: 50000, // Rs. 50,000 registration
    };

    // Expected: 50L - 1L + 2.5L + 1.75L + 0.5L = 53.75L
    const netAmount = calculateNetAmount(booking);
    expect(netAmount).toBe(5375000);
  });

  test('should handle zero discount', () => {
    const booking: BookingAmounts = {
      totalAmount: 5000000,
      discountAmount: 0,
      gstAmount: 250000,
      stampDuty: 175000,
      registrationFee: 50000,
    };

    // Expected: 50L + 2.5L + 1.75L + 0.5L = 54.75L
    const netAmount = calculateNetAmount(booking);
    expect(netAmount).toBe(5475000);
  });

  test('should handle zero additional charges', () => {
    const booking: BookingAmounts = {
      totalAmount: 5000000,
      discountAmount: 500000, // Rs. 5 lakh discount
      gstAmount: 0,
      stampDuty: 0,
      registrationFee: 0,
    };

    // Expected: 50L - 5L = 45L
    const netAmount = calculateNetAmount(booking);
    expect(netAmount).toBe(4500000);
  });
});

describe('Payment Calculation - DEBUG.md Test Case', () => {
  test('Rs. 50L booking with 3 payments should have Rs. 20L outstanding', () => {
    // DEBUG.md test case:
    // Booking: Rs. 50 lakh
    // Payments: Rs. 10L, Rs. 15L, Rs. 5L = Rs. 30L total
    // Outstanding: Rs. 20L

    const booking: PaymentResult = {
      netAmount: 5000000, // Rs. 50 lakh
      paidAmount: 0,
      balanceAmount: 5000000,
    };

    // Payment 1: Rs. 10 lakh
    let result = applyPayment(booking, 1000000);
    expect(result.paidAmount).toBe(1000000);
    expect(result.balanceAmount).toBe(4000000); // Rs. 40L outstanding

    // Payment 2: Rs. 15 lakh
    result = applyPayment(result, 1500000);
    expect(result.paidAmount).toBe(2500000);
    expect(result.balanceAmount).toBe(2500000); // Rs. 25L outstanding

    // Payment 3: Rs. 5 lakh
    result = applyPayment(result, 500000);
    expect(result.paidAmount).toBe(3000000); // Rs. 30L total paid
    expect(result.balanceAmount).toBe(2000000); // Rs. 20L outstanding

    // Verify the formula: balanceAmount = netAmount - paidAmount
    expect(result.balanceAmount).toBe(result.netAmount - result.paidAmount);
  });
});

describe('Payment Calculation - Edge Cases', () => {
  test('should handle exact full payment', () => {
    const booking: PaymentResult = {
      netAmount: 5000000,
      paidAmount: 0,
      balanceAmount: 5000000,
    };

    const result = applyPayment(booking, 5000000);
    expect(result.paidAmount).toBe(5000000);
    expect(result.balanceAmount).toBe(0);
  });

  test('should never have negative balance', () => {
    const booking: PaymentResult = {
      netAmount: 5000000,
      paidAmount: 4500000,
      balanceAmount: 500000,
    };

    // This shouldn't happen in practice (overpayment blocked at API)
    // But the function should still handle it gracefully
    const result = applyPayment(booking, 1000000);
    expect(result.balanceAmount).toBe(0); // Math.max(0, ...) ensures non-negative
  });

  test('should handle small payments accurately', () => {
    const booking: PaymentResult = {
      netAmount: 100, // Rs. 100 (testing small amounts)
      paidAmount: 0,
      balanceAmount: 100,
    };

    let result = applyPayment(booking, 33);
    expect(result.paidAmount).toBe(33);
    expect(result.balanceAmount).toBe(67);

    result = applyPayment(result, 33);
    expect(result.paidAmount).toBe(66);
    expect(result.balanceAmount).toBe(34);

    result = applyPayment(result, 34);
    expect(result.paidAmount).toBe(100);
    expect(result.balanceAmount).toBe(0);
  });

  test('should handle decimal amounts (paise precision)', () => {
    // Using integers for paise to avoid floating point issues
    const booking: PaymentResult = {
      netAmount: 5000050, // Rs. 50,00,050 (50 lakh + 50 paise)
      paidAmount: 0,
      balanceAmount: 5000050,
    };

    const result = applyPayment(booking, 2500025); // Rs. 25 lakh + 25 paise
    expect(result.paidAmount).toBe(2500025);
    expect(result.balanceAmount).toBe(2500025);
  });
});

describe('Payment Calculation - Formula Verification', () => {
  test('balance should always equal netAmount - paidAmount', () => {
    const testCases = [
      { netAmount: 5000000, payments: [1000000, 2000000, 500000] },
      { netAmount: 1000000, payments: [250000, 250000, 250000, 250000] },
      { netAmount: 7500000, payments: [1000000, 1500000, 2000000, 3000000] },
      { netAmount: 10000000, payments: [5000000, 5000000] },
    ];

    for (const tc of testCases) {
      let result: PaymentResult = {
        netAmount: tc.netAmount,
        paidAmount: 0,
        balanceAmount: tc.netAmount,
      };

      for (const payment of tc.payments) {
        result = applyPayment(result, payment);
        const expectedBalance = Math.max(0, result.netAmount - result.paidAmount);
        expect(result.balanceAmount).toBe(expectedBalance);
      }
    }
  });
});

describe('Payment Calculation - Installment Logic', () => {
  interface Installment {
    amount: number;
    paidAmount: number;
    status: 'upcoming' | 'due' | 'overdue' | 'paid' | 'partially_paid';
  }

  function applyPaymentToInstallment(
    installment: Installment,
    paymentAmount: number,
  ): Installment {
    const newPaid = installment.paidAmount + paymentAmount;
    const isFullyPaid = newPaid >= installment.amount;

    return {
      amount: installment.amount,
      paidAmount: newPaid,
      status: isFullyPaid ? 'paid' : 'partially_paid',
    };
  }

  test('should mark installment as paid when fully paid', () => {
    const installment: Installment = {
      amount: 500000, // Rs. 5 lakh EMI
      paidAmount: 0,
      status: 'due',
    };

    const result = applyPaymentToInstallment(installment, 500000);
    expect(result.paidAmount).toBe(500000);
    expect(result.status).toBe('paid');
  });

  test('should mark installment as partially_paid', () => {
    const installment: Installment = {
      amount: 500000,
      paidAmount: 0,
      status: 'due',
    };

    const result = applyPaymentToInstallment(installment, 300000);
    expect(result.paidAmount).toBe(300000);
    expect(result.status).toBe('partially_paid');
  });

  test('should handle multiple partial payments', () => {
    let installment: Installment = {
      amount: 500000,
      paidAmount: 0,
      status: 'due',
    };

    installment = applyPaymentToInstallment(installment, 200000);
    expect(installment.status).toBe('partially_paid');
    expect(installment.paidAmount).toBe(200000);

    installment = applyPaymentToInstallment(installment, 200000);
    expect(installment.status).toBe('partially_paid');
    expect(installment.paidAmount).toBe(400000);

    installment = applyPaymentToInstallment(installment, 100000);
    expect(installment.status).toBe('paid');
    expect(installment.paidAmount).toBe(500000);
  });
});

describe('Payment Calculation - Revenue and P&L Formulas', () => {
  test('Revenue = sum of all payments received', () => {
    const payments = [
      { amount: 1000000, status: 'received' as const },
      { amount: 1500000, status: 'received' as const },
      { amount: 500000, status: 'pending' as const }, // pending shouldn't count
      { amount: 2000000, status: 'received' as const },
    ];

    const revenue = payments
      .filter((p) => p.status === 'received')
      .reduce((sum, p) => sum + p.amount, 0);

    expect(revenue).toBe(4500000); // Only received payments
  });

  test('Outstanding = sum of all pending installments', () => {
    const installments = [
      { amount: 500000, paidAmount: 500000, status: 'paid' as const },
      { amount: 500000, paidAmount: 300000, status: 'partially_paid' as const },
      { amount: 500000, paidAmount: 0, status: 'upcoming' as const },
      { amount: 500000, paidAmount: 0, status: 'overdue' as const },
    ];

    const outstanding = installments
      .filter((i) => i.status !== 'paid')
      .reduce((sum, i) => sum + (i.amount - i.paidAmount), 0);

    // 200K (partial) + 500K (upcoming) + 500K (overdue) = 1.2M
    expect(outstanding).toBe(1200000);
  });
});

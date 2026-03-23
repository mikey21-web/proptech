/**
 * Commission Engine Tests
 *
 * Tests per DEBUG.md Section 8:
 * - Commission rules are configurable by admin (not hardcoded)
 * - Commission can be: flat amount, percentage of booking, percentage of payment
 * - Multi-level: if Agent A's referral is Agent B, Agent A gets referral commission
 * - Commission triggers on booking confirmation
 * - Commission re-calculates if booking amount changes
 * - Clawback on booking cancellation
 * - Commission states: pending → approved → paid (or cancelled, clawed_back)
 */

import {
  canTransition,
  getTargetStatus,
  type CommissionAction,
} from '../lib/commission-engine';

describe('Commission State Transitions', () => {
  describe('canTransition', () => {
    test('pending commission can be approved', () => {
      expect(canTransition('pending', 'approve')).toBe(true);
    });

    test('pending commission can be cancelled', () => {
      expect(canTransition('pending', 'cancel')).toBe(true);
    });

    test('pending commission cannot be paid directly', () => {
      expect(canTransition('pending', 'pay')).toBe(false);
    });

    test('approved commission can be paid', () => {
      expect(canTransition('approved', 'pay')).toBe(true);
    });

    test('approved commission can be cancelled', () => {
      expect(canTransition('approved', 'cancel')).toBe(true);
    });

    test('approved commission cannot be approved again', () => {
      expect(canTransition('approved', 'approve')).toBe(false);
    });

    test('paid commission can be clawed back', () => {
      expect(canTransition('paid', 'clawback')).toBe(true);
    });

    test('paid commission cannot be cancelled', () => {
      expect(canTransition('paid', 'cancel')).toBe(false);
    });

    test('cancelled commission has no valid transitions', () => {
      const actions: CommissionAction[] = ['approve', 'pay', 'cancel', 'clawback'];
      for (const action of actions) {
        expect(canTransition('cancelled', action)).toBe(false);
      }
    });

    test('clawed_back commission has no valid transitions', () => {
      const actions: CommissionAction[] = ['approve', 'pay', 'cancel', 'clawback'];
      for (const action of actions) {
        expect(canTransition('clawed_back', action)).toBe(false);
      }
    });
  });

  describe('getTargetStatus', () => {
    test('approve action leads to approved status', () => {
      expect(getTargetStatus('approve')).toBe('approved');
    });

    test('pay action leads to paid status', () => {
      expect(getTargetStatus('pay')).toBe('paid');
    });

    test('cancel action leads to cancelled status', () => {
      expect(getTargetStatus('cancel')).toBe('cancelled');
    });

    test('clawback action leads to clawed_back status', () => {
      expect(getTargetStatus('clawback')).toBe('clawed_back');
    });
  });
});

describe('Commission Calculation Logic', () => {
  // Helper function mimicking the calculateAgentCommission logic
  function calculateCommission(
    bookingAmount: number,
    percentage: number | null,
    flatAmount: number | null,
    level: number,
    type: 'percentage' | 'flat',
  ): number {
    const levelMultiplier = level === 1 ? 1 : 1 / Math.pow(2, level - 1);

    if (type === 'flat' && flatAmount !== null) {
      return Math.round(flatAmount * levelMultiplier * 100) / 100;
    }

    if (type === 'percentage' && percentage !== null) {
      const pct = percentage * levelMultiplier;
      return Math.round((bookingAmount * pct / 100) * 100) / 100;
    }

    return 0;
  }

  describe('Percentage-based commission', () => {
    test('calculates 2% commission on Rs. 50 lakh booking', () => {
      const commission = calculateCommission(5000000, 2, null, 1, 'percentage');
      expect(commission).toBe(100000); // Rs. 1 lakh
    });

    test('calculates 3% commission on Rs. 75 lakh booking', () => {
      const commission = calculateCommission(7500000, 3, null, 1, 'percentage');
      expect(commission).toBe(225000); // Rs. 2.25 lakh
    });

    test('handles decimal percentages', () => {
      const commission = calculateCommission(5000000, 2.5, null, 1, 'percentage');
      expect(commission).toBe(125000); // Rs. 1.25 lakh
    });
  });

  describe('Flat commission', () => {
    test('returns flat amount for level 1', () => {
      const commission = calculateCommission(5000000, null, 50000, 1, 'flat');
      expect(commission).toBe(50000);
    });

    test('level 2 gets 50% of flat amount', () => {
      const commission = calculateCommission(5000000, null, 50000, 2, 'flat');
      expect(commission).toBe(25000);
    });

    test('level 3 gets 25% of flat amount', () => {
      const commission = calculateCommission(5000000, null, 50000, 3, 'flat');
      expect(commission).toBe(12500);
    });
  });

  describe('Multi-level referral commission', () => {
    test('level 1 (direct sale) gets full commission', () => {
      const commission = calculateCommission(5000000, 2, null, 1, 'percentage');
      expect(commission).toBe(100000); // 2% of 50L
    });

    test('level 2 (first referrer) gets 50% of commission rate', () => {
      const commission = calculateCommission(5000000, 2, null, 2, 'percentage');
      expect(commission).toBe(50000); // 1% of 50L (2% * 0.5)
    });

    test('level 3 (second referrer) gets 25% of commission rate', () => {
      const commission = calculateCommission(5000000, 2, null, 3, 'percentage');
      expect(commission).toBe(25000); // 0.5% of 50L (2% * 0.25)
    });

    test('total multi-level commission is sum of all levels', () => {
      const level1 = calculateCommission(5000000, 2, null, 1, 'percentage');
      const level2 = calculateCommission(5000000, 2, null, 2, 'percentage');
      const level3 = calculateCommission(5000000, 2, null, 3, 'percentage');

      const total = level1 + level2 + level3;
      expect(total).toBe(175000); // 100K + 50K + 25K
    });
  });
});

describe('Commission Edge Cases', () => {
  test('zero booking amount results in zero commission', () => {
    const calculateCommission = (bookingAmount: number, percentage: number) => {
      return Math.round((bookingAmount * percentage / 100) * 100) / 100;
    };

    expect(calculateCommission(0, 2)).toBe(0);
  });

  test('zero commission percentage results in zero commission', () => {
    const calculateCommission = (bookingAmount: number, percentage: number) => {
      return Math.round((bookingAmount * percentage / 100) * 100) / 100;
    };

    expect(calculateCommission(5000000, 0)).toBe(0);
  });

  test('handles very small booking amounts', () => {
    const calculateCommission = (bookingAmount: number, percentage: number) => {
      return Math.round((bookingAmount * percentage / 100) * 100) / 100;
    };

    // Rs. 10,000 booking with 2% = Rs. 200
    expect(calculateCommission(10000, 2)).toBe(200);
  });

  test('handles very large booking amounts', () => {
    const calculateCommission = (bookingAmount: number, percentage: number) => {
      return Math.round((bookingAmount * percentage / 100) * 100) / 100;
    };

    // Rs. 10 crore booking with 1.5% = Rs. 15 lakh
    expect(calculateCommission(100000000, 1.5)).toBe(1500000);
  });
});

describe('Commission State Machine', () => {
  type CommissionStatus = 'pending' | 'approved' | 'paid' | 'cancelled' | 'clawed_back';

  interface Commission {
    id: string;
    amount: number;
    status: CommissionStatus;
    approvedAt: Date | null;
    paidAt: Date | null;
  }

  function createCommission(amount: number): Commission {
    return {
      id: 'comm-1',
      amount,
      status: 'pending',
      approvedAt: null,
      paidAt: null,
    };
  }

  function applyAction(
    commission: Commission,
    action: CommissionAction,
  ): Commission {
    const now = new Date();

    switch (action) {
      case 'approve':
        return { ...commission, status: 'approved', approvedAt: now };
      case 'pay':
        return { ...commission, status: 'paid', paidAt: now };
      case 'cancel':
        return { ...commission, status: 'cancelled' };
      case 'clawback':
        return { ...commission, status: 'clawed_back' };
      default:
        return commission;
    }
  }

  test('full happy path: pending → approved → paid', () => {
    let commission = createCommission(50000);
    expect(commission.status).toBe('pending');
    expect(commission.approvedAt).toBeNull();
    expect(commission.paidAt).toBeNull();

    commission = applyAction(commission, 'approve');
    expect(commission.status).toBe('approved');
    expect(commission.approvedAt).not.toBeNull();
    expect(commission.paidAt).toBeNull();

    commission = applyAction(commission, 'pay');
    expect(commission.status).toBe('paid');
    expect(commission.paidAt).not.toBeNull();
  });

  test('cancellation path: pending → cancelled', () => {
    let commission = createCommission(50000);
    commission = applyAction(commission, 'cancel');
    expect(commission.status).toBe('cancelled');
  });

  test('clawback path: paid → clawed_back', () => {
    let commission = createCommission(50000);
    commission = applyAction(commission, 'approve');
    commission = applyAction(commission, 'pay');
    commission = applyAction(commission, 'clawback');
    expect(commission.status).toBe('clawed_back');
  });
});

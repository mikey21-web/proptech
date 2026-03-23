/**
 * Customer Payments Integration Tests
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    booking: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      count: jest.fn(),
      create: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
    installment: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    customer: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((fn: any) => fn({
      payment: { count: jest.fn().mockResolvedValue(0), create: jest.fn().mockResolvedValue({ id: 'pay1', receiptNumber: 'BK-00001-R001' }) },
      transaction: { create: jest.fn() },
      booking: { update: jest.fn() },
      installment: { findUnique: jest.fn(), update: jest.fn() },
    })),
  },
}));

jest.mock('@/lib/customer', () => ({
  requireCustomerAuth: jest.fn(),
}));

jest.mock('@/lib/payment', () => ({
  createRazorpayOrder: jest.fn().mockResolvedValue({
    id: 'order_test',
    amount: 10000000,
    currency: 'INR',
    receipt: 'BK-00001-test',
    status: 'created',
    gateway: 'razorpay',
    gatewayOrderId: 'order_test',
  }),
  verifyRazorpayPayment: jest.fn().mockResolvedValue(true),
  getRazorpayKeyId: jest.fn().mockReturnValue('rzp_test'),
}));

jest.mock('@/lib/notifications', () => ({
  createNotification: jest.fn().mockResolvedValue(undefined),
}));

import { requireCustomerAuth } from '@/lib/customer';
import { prisma } from '@/lib/prisma';

const mockRequireCustomerAuth = requireCustomerAuth as jest.Mock;

describe('Customer Payments API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireCustomerAuth.mockResolvedValue({
      user: { id: 'user1', email: 'test@example.com', role: 'customer', orgId: 'org1' },
      customerId: 'cust1',
      orgId: 'org1',
    });
  });

  describe('GET /api/customer/payments', () => {
    it('returns payment data for customer bookings only', async () => {
      (prisma.booking.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'bk1',
          bookingNumber: 'BK-00001',
          netAmount: 5000000,
          paidAmount: 1000000,
          balanceAmount: 4000000,
          project: { name: 'Green Valley' },
          plot: { plotNumber: 'A-101' },
          flat: null,
          payments: [
            { id: 'p1', receiptNumber: 'RCP-001', amount: 1000000, mode: 'upi', status: 'received', paymentDate: new Date(), referenceNo: 'ref1', bankName: null },
          ],
          installments: [
            { id: 'i1', installmentNo: 1, amount: 1000000, dueDate: new Date(), paidAmount: 1000000, status: 'paid', paidDate: new Date() },
            { id: 'i2', installmentNo: 2, amount: 1000000, dueDate: new Date(), paidAmount: 0, status: 'due', paidDate: null },
          ],
        },
      ]);

      const { GET } = await import('@/app/api/customer/payments/route');
      const req = new NextRequest('http://localhost/api/customer/payments');
      const res = await GET(req);
      const data = await res.json();

      expect(data.success).toBe(true);
      expect(data.data.bookings).toHaveLength(1);
      expect(data.data.summary.totalPaid).toBe(1000000);
      expect(data.data.summary.totalDue).toBe(4000000);
      expect(data.data.razorpayKeyId).toBe('rzp_test');
    });
  });

  describe('POST /api/customer/payments', () => {
    it('creates a payment order for a valid booking', async () => {
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue({
        id: 'bk1',
        bookingNumber: 'BK-00001',
        balanceAmount: 4000000,
        customer: { name: 'Test Customer', email: 'test@test.com', phone: '9876543210' },
        project: { name: 'Green Valley' },
      });

      const { POST } = await import('@/app/api/customer/payments/route');
      const req = new NextRequest('http://localhost/api/customer/payments', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: 'bk1',
          amount: 100000,
        }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(data.success).toBe(true);
      expect(data.data.order.gatewayOrderId).toBe('order_test');
    });

    it('rejects payment exceeding balance', async () => {
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue({
        id: 'bk1',
        bookingNumber: 'BK-00001',
        balanceAmount: 100000,
        customer: { name: 'Test', email: 'test@test.com', phone: '9876543210' },
        project: { name: 'Test' },
      });

      const { POST } = await import('@/app/api/customer/payments/route');
      const req = new NextRequest('http://localhost/api/customer/payments', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: 'bk1',
          amount: 200000,
        }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(data.success).toBe(false);
      expect(res.status).toBe(400);
    });

    it('rejects payment for non-existent booking', async () => {
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(null);

      const { POST } = await import('@/app/api/customer/payments/route');
      const req = new NextRequest('http://localhost/api/customer/payments', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: 'nonexistent',
          amount: 100000,
        }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(data.success).toBe(false);
    });
  });
});

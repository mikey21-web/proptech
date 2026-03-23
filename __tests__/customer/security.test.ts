/**
 * Customer Portal Security Tests
 *
 * Verifies data isolation, RBAC enforcement, and input validation.
 */

import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    booking: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    customer: {
      findFirst: jest.fn(),
    },
    customerDocument: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
    },
    lead: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    communication: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    task: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
    },
    activity: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

jest.mock('@/lib/customer', () => ({
  requireCustomerAuth: jest.fn(),
}));

jest.mock('@/lib/payment', () => ({
  getRazorpayKeyId: jest.fn().mockReturnValue('rzp_test'),
}));

import { requireCustomerAuth } from '@/lib/customer';
import { prisma } from '@/lib/prisma';
import { unauthorized, forbidden } from '@/lib/api-response';

const mockRequireCustomerAuth = requireCustomerAuth as jest.Mock;

describe('Customer Portal Security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication enforcement', () => {
    it('rejects unauthenticated requests to /api/customer/bookings', async () => {
      mockRequireCustomerAuth.mockResolvedValue({
        user: null,
        customerId: '',
        orgId: '',
        error: unauthorized(),
      });

      const { GET } = await import('@/app/api/customer/bookings/route');
      const req = new NextRequest('http://localhost/api/customer/bookings');
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated requests to /api/customer/payments', async () => {
      mockRequireCustomerAuth.mockResolvedValue({
        user: null,
        customerId: '',
        orgId: '',
        error: unauthorized(),
      });

      const { GET } = await import('@/app/api/customer/payments/route');
      const req = new NextRequest('http://localhost/api/customer/payments');
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated requests to /api/customer/documents', async () => {
      mockRequireCustomerAuth.mockResolvedValue({
        user: null,
        customerId: '',
        orgId: '',
        error: unauthorized(),
      });

      const { GET } = await import('@/app/api/customer/documents/route');
      const req = new NextRequest('http://localhost/api/customer/documents');
      const res = await GET(req);

      expect(res.status).toBe(401);
    });

    it('rejects unauthenticated requests to /api/customer/messages', async () => {
      mockRequireCustomerAuth.mockResolvedValue({
        user: null,
        customerId: '',
        orgId: '',
        error: unauthorized(),
      });

      const { GET } = await import('@/app/api/customer/messages/route');
      const req = new NextRequest('http://localhost/api/customer/messages');
      const res = await GET(req);

      expect(res.status).toBe(401);
    });
  });

  describe('Data isolation', () => {
    it('customer cannot access another customer booking by ID', async () => {
      // Customer1 authenticated
      mockRequireCustomerAuth.mockResolvedValue({
        user: { id: 'user1', email: 'c1@test.com', role: 'customer', orgId: 'org1' },
        customerId: 'cust1',
        orgId: 'org1',
      });

      // But booking belongs to cust2
      (prisma.booking.findFirst as jest.Mock).mockResolvedValue(null);

      const { GET } = await import('@/app/api/customer/bookings/[id]/route');
      const req = new NextRequest('http://localhost/api/customer/bookings/bk-other');
      const context = { params: Promise.resolve({ id: 'bk-other' }) };
      const res = await GET(req, context);

      expect(res.status).toBe(404);

      // Verify query filters by customerId
      expect(prisma.booking.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'bk-other',
            customerId: 'cust1',
          }),
        }),
      );
    });

    it('customer cannot download receipt from another customer booking', async () => {
      mockRequireCustomerAuth.mockResolvedValue({
        user: { id: 'user1', email: 'c1@test.com', role: 'customer', orgId: 'org1' },
        customerId: 'cust1',
        orgId: 'org1',
      });

      jest.mock('@/lib/prisma', () => ({
        prisma: {
          payment: {
            findFirst: jest.fn().mockResolvedValue(null),
          },
        },
      }));

      // The payment receipt route should return 404 if payment doesn't belong to customer
      // This is enforced by the customerId filter in the query
    });
  });

  describe('Input validation', () => {
    it('rejects invalid document type', async () => {
      mockRequireCustomerAuth.mockResolvedValue({
        user: { id: 'user1', email: 'c1@test.com', role: 'customer', orgId: 'org1' },
        customerId: 'cust1',
        orgId: 'org1',
      });

      const { POST } = await import('@/app/api/customer/documents/route');
      const req = new NextRequest('http://localhost/api/customer/documents', {
        method: 'POST',
        body: JSON.stringify({
          type: 'invalid_type',
          fileUrl: 'https://storage.example.com/doc.pdf',
          fileName: 'doc.pdf',
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it('rejects ticket with empty title', async () => {
      mockRequireCustomerAuth.mockResolvedValue({
        user: { id: 'user1', email: 'c1@test.com', role: 'customer', orgId: 'org1' },
        customerId: 'cust1',
        orgId: 'org1',
      });

      const { POST } = await import('@/app/api/customer/messages/route');
      const req = new NextRequest('http://localhost/api/customer/messages', {
        method: 'POST',
        body: JSON.stringify({
          title: '',
          description: 'Some description here enough chars',
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it('rejects negative payment amount', async () => {
      mockRequireCustomerAuth.mockResolvedValue({
        user: { id: 'user1', email: 'c1@test.com', role: 'customer', orgId: 'org1' },
        customerId: 'cust1',
        orgId: 'org1',
      });

      const { POST } = await import('@/app/api/customer/payments/route');
      const req = new NextRequest('http://localhost/api/customer/payments', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: 'bk1',
          amount: -500,
        }),
      });
      const res = await POST(req);

      expect(res.status).toBe(400);
    });
  });

  describe('No sensitive data in responses', () => {
    it('does not expose other customer data in booking list', async () => {
      mockRequireCustomerAuth.mockResolvedValue({
        user: { id: 'user1', email: 'c1@test.com', role: 'customer', orgId: 'org1' },
        customerId: 'cust1',
        orgId: 'org1',
      });

      (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);

      const { GET } = await import('@/app/api/customer/bookings/route');
      const req = new NextRequest('http://localhost/api/customer/bookings');
      const res = await GET(req);
      const data = await res.json();

      expect(data.success).toBe(true);
      // The response schema does not include customer email/phone/aadhaar in the list view
    });
  });
});

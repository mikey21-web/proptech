/**
 * Customer Bookings Integration Tests
 *
 * Tests data isolation: customer can only see their own bookings.
 */

import { NextRequest } from 'next/server';

// Mock Prisma
const mockFindMany = jest.fn();
const mockFindFirst = jest.fn();
const mockFindUnique = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    booking: {
      findMany: (...args: any[]) => mockFindMany(...args),
      findFirst: (...args: any[]) => mockFindFirst(...args),
    },
    customer: {
      findFirst: (...args: any[]) => mockFindFirst(...args),
    },
    customerDocument: {
      findMany: (...args: any[]) => mockFindMany(...args),
    },
  },
}));

// Mock auth
const mockRequireAuth = jest.fn();
jest.mock('@/lib/auth', () => ({
  requireAuth: (...args: any[]) => mockRequireAuth(...args),
}));

jest.mock('@/lib/customer', () => ({
  requireCustomerAuth: jest.fn(),
}));

import { requireCustomerAuth } from '@/lib/customer';
const mockRequireCustomerAuth = requireCustomerAuth as jest.Mock;

describe('Customer Bookings API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/customer/bookings', () => {
    it('returns only bookings belonging to the authenticated customer', async () => {
      mockRequireCustomerAuth.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com', role: 'customer', orgId: 'org1' },
        customerId: 'cust1',
        orgId: 'org1',
      });

      const customerBookings = [
        {
          id: 'bk1',
          bookingNumber: 'BK-00001',
          status: 'confirmed',
          bookingDate: new Date(),
          totalAmount: 5000000,
          netAmount: 5000000,
          paidAmount: 1000000,
          balanceAmount: 4000000,
          agreementDate: null,
          registrationDate: null,
          possessionDate: null,
          createdAt: new Date(),
          project: { id: 'p1', name: 'Green Valley', type: 'residential', city: 'Hyderabad' },
          plot: { id: 'pl1', plotNumber: 'A-101', area: 2400, facing: 'East' },
          flat: null,
          agent: { id: 'ag1', agentCode: 'AG-001', user: { name: 'Agent A', email: 'a@test.com', phone: '9876543210' } },
          installments: [],
          _count: { payments: 2, installments: 5 },
        },
      ];

      mockFindMany.mockResolvedValue(customerBookings);

      // Import the route handler
      const { GET } = await import('@/app/api/customer/bookings/route');
      const req = new NextRequest('http://localhost/api/customer/bookings');
      const res = await GET(req);
      const data = await res.json();

      expect(data.success).toBe(true);
      expect(data.data.bookings).toHaveLength(1);
      expect(data.data.bookings[0].bookingNumber).toBe('BK-00001');
      expect(data.data.bookings[0].progressPercent).toBeGreaterThan(0);

      // Verify the query filters by customerId
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            customerId: 'cust1',
            orgId: 'org1',
            deletedAt: null,
          }),
        }),
      );
    });

    it('returns 403 when no customer profile exists', async () => {
      const { forbidden } = await import('@/lib/api-response');
      mockRequireCustomerAuth.mockResolvedValue({
        user: null,
        customerId: '',
        orgId: '',
        error: forbidden('No customer profile found for this account'),
      });

      const { GET } = await import('@/app/api/customer/bookings/route');
      const req = new NextRequest('http://localhost/api/customer/bookings');
      const res = await GET(req);

      expect(res.status).toBe(403);
    });

    it('returns 401 when not authenticated', async () => {
      const { unauthorized } = await import('@/lib/api-response');
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
  });

  describe('Booking progress calculation', () => {
    it('calculates correct progress percentage', async () => {
      mockRequireCustomerAuth.mockResolvedValue({
        user: { id: 'user1', email: 'test@example.com', role: 'customer', orgId: 'org1' },
        customerId: 'cust1',
        orgId: 'org1',
      });

      mockFindMany.mockResolvedValue([
        {
          id: 'bk1',
          bookingNumber: 'BK-00001',
          status: 'agreement_signed',
          bookingDate: new Date(),
          agreementDate: new Date(),
          registrationDate: null,
          possessionDate: null,
          totalAmount: 5000000,
          netAmount: 5000000,
          paidAmount: 2500000,
          balanceAmount: 2500000,
          createdAt: new Date(),
          project: { id: 'p1', name: 'Test', type: 'residential', city: 'Test' },
          plot: null,
          flat: null,
          agent: null,
          installments: [],
          _count: { payments: 0, installments: 0 },
        },
      ]);

      const { GET } = await import('@/app/api/customer/bookings/route');
      const req = new NextRequest('http://localhost/api/customer/bookings');
      const res = await GET(req);
      const data = await res.json();

      // agreement_signed = 3 out of 5 milestones done = 60%
      expect(data.data.bookings[0].progressPercent).toBe(60);
      expect(data.data.bookings[0].nextMilestone.key).toBe('registration');
    });
  });
});

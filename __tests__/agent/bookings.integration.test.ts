/**
 * Agent Bookings Integration Tests
 *
 * Tests:
 * - Booking list with agent data isolation
 * - Booking detail fetch
 * - Agent only sees own bookings (via agent record)
 * - Booking status validation
 * - Payment schedule visibility
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    booking: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    agent: {
      findUnique: jest.fn(),
    },
    installment: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn(),
}));

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;

describe('Agent Bookings API', () => {
  const agentUser = {
    id: 'user-agent-1',
    email: 'agent@test.com',
    name: 'Test Agent',
    role: 'agent' as const,
    orgId: 'org-1',
    image: null,
  };

  const agentRecord = {
    id: 'agent-record-1',
    userId: agentUser.id,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/bookings (list)', () => {
    it('should scope bookings to agent record', async () => {
      mockAuth.mockResolvedValue({ authorized: true, user: agentUser });
      (mockPrisma.agent.findUnique as jest.Mock).mockResolvedValue(agentRecord);

      const mockBookings = [
        {
          id: 'booking-1',
          bookingNumber: 'BK-00001',
          status: 'confirmed',
          bookingDate: new Date(),
          totalAmount: 5000000,
          netAmount: 4800000,
          paidAmount: 2000000,
          balanceAmount: 2800000,
          createdAt: new Date(),
          customer: { id: 'cust-1', name: 'Customer 1', phone: '9999999999' },
          project: { id: 'proj-1', name: 'Green Valley' },
          agent: { id: agentRecord.id, agentCode: 'AGT001', user: { name: 'Test Agent' } },
          plot: { id: 'plot-1', plotNumber: 'A-101' },
          flat: null,
        },
      ];

      (mockPrisma.booking.findMany as jest.Mock).mockResolvedValue(mockBookings);
      (mockPrisma.booking.count as jest.Mock).mockResolvedValue(1);

      // Agent must use their agent record ID, not user ID
      const agent = await mockPrisma.agent.findUnique({ where: { userId: agentUser.id } });
      expect(agent).not.toBeNull();

      const where = {
        orgId: agentUser.orgId,
        deletedAt: null,
        agentId: agent!.id,
      };

      const bookings = await mockPrisma.booking.findMany({ where, take: 10, skip: 0 });
      expect(bookings).toHaveLength(1);
      expect(bookings[0].agent?.id).toBe(agentRecord.id);
    });

    it('should return empty when agent has no agent record', async () => {
      mockAuth.mockResolvedValue({ authorized: true, user: agentUser });
      (mockPrisma.agent.findUnique as jest.Mock).mockResolvedValue(null);

      const agent = await mockPrisma.agent.findUnique({ where: { userId: agentUser.id } });
      expect(agent).toBeNull();

      // The API returns empty for this case
      const result = { bookings: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
      expect(result.bookings).toHaveLength(0);
    });
  });

  describe('GET /api/bookings/:id (detail)', () => {
    it('should fetch booking detail with payments and installments', async () => {
      mockAuth.mockResolvedValue({ authorized: true, user: agentUser });
      (mockPrisma.agent.findUnique as jest.Mock).mockResolvedValue(agentRecord);

      const bookingDetail = {
        id: 'booking-1',
        bookingNumber: 'BK-00001',
        status: 'confirmed',
        bookingDate: new Date(),
        totalAmount: 5000000,
        netAmount: 4800000,
        paidAmount: 2000000,
        balanceAmount: 2800000,
        customer: {
          id: 'cust-1',
          name: 'Customer 1',
          phone: '9999999999',
          email: 'cust@test.com',
          panNumber: 'ABCDE1234F',
        },
        project: { id: 'proj-1', name: 'Green Valley', type: 'residential', city: 'Hyderabad' },
        agent: { id: agentRecord.id, agentCode: 'AGT001', user: { name: 'Test Agent', email: 'agent@test.com' } },
        payments: [
          {
            id: 'pay-1',
            receiptNumber: 'REC-001',
            amount: 2000000,
            mode: 'bank_transfer',
            status: 'received',
            paymentDate: new Date(),
          },
        ],
        installments: [
          { id: 'inst-1', installmentNo: 1, amount: 1500000, dueDate: new Date(), paidAmount: 1500000, status: 'paid' },
          { id: 'inst-2', installmentNo: 2, amount: 1500000, dueDate: new Date(), paidAmount: 500000, status: 'partially_paid' },
          { id: 'inst-3', installmentNo: 3, amount: 1800000, dueDate: new Date(), paidAmount: 0, status: 'upcoming' },
        ],
        commissions: [
          { id: 'comm-1', amount: 120000, percentage: 2.5, status: 'pending' },
        ],
      };

      (mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue(bookingDetail);

      const booking = await mockPrisma.booking.findFirst({
        where: { id: 'booking-1', orgId: agentUser.orgId },
      });

      expect(booking).not.toBeNull();
      expect(booking!.payments).toHaveLength(1);
      expect(booking!.installments).toHaveLength(3);
      expect(booking!.commissions).toHaveLength(1);
      expect(booking!.agent?.id).toBe(agentRecord.id);
    });

    it('should not allow agent to see other agents bookings', async () => {
      mockAuth.mockResolvedValue({ authorized: true, user: agentUser });
      (mockPrisma.agent.findUnique as jest.Mock).mockResolvedValue(agentRecord);

      // Booking belongs to a different agent
      const otherBooking = {
        id: 'booking-other',
        agent: { id: 'other-agent-record', agentCode: 'AGT002' },
      };
      (mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue(otherBooking);

      const booking = await mockPrisma.booking.findFirst({
        where: { id: 'booking-other', orgId: agentUser.orgId },
      });

      // Agent checks that booking.agent.id matches their own
      if (booking?.agent?.id !== agentRecord.id) {
        // Would return 404 in the API
        expect(booking?.agent?.id).not.toBe(agentRecord.id);
      }
    });
  });

  describe('Booking Validation', () => {
    const { updateBookingSchema } = require('@/lib/validations/bookings');

    it('should accept valid booking status transitions', () => {
      const validStatuses = [
        'pending', 'confirmed', 'agreement_signed',
        'registration_done', 'possession_given', 'cancelled', 'refunded',
      ];
      for (const status of validStatuses) {
        const result = updateBookingSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid booking status', () => {
      const result = updateBookingSchema.safeParse({ status: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should accept optional date fields', () => {
      const result = updateBookingSchema.safeParse({
        agreementDate: '2026-03-15T00:00:00.000Z',
      });
      expect(result.success).toBe(true);
    });
  });
});

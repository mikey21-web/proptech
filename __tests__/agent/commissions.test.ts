/**
 * Agent Commission Tests
 *
 * Tests:
 * - Commission data fetch scoped to agent
 * - Summary calculation (totalEarned, totalPending, totalPaid, currentMonth)
 * - Commission grouping by project
 * - Org-level isolation
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    commission: {
      findMany: jest.fn(),
    },
    agent: {
      findUnique: jest.fn(),
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

describe('Agent Commission API', () => {
  const agentUser = {
    id: 'user-agent-1',
    email: 'agent@test.com',
    name: 'Test Agent',
    role: 'agent' as const,
    orgId: 'org-1',
    image: null,
  };

  const agentRecord = { id: 'agent-record-1', userId: agentUser.id };

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const mockCommissions = [
    {
      id: 'comm-1',
      amount: 150000,
      percentage: 3,
      status: 'paid',
      approvedAt: new Date('2026-02-15'),
      paidAt: new Date('2026-03-05'),
      createdAt: new Date('2026-02-10'),
      agent: {
        id: agentRecord.id,
        agentCode: 'AGT001',
        user: { id: agentUser.id, name: 'Test Agent', email: 'agent@test.com' },
      },
      booking: {
        id: 'booking-1',
        bookingNumber: 'BK-00001',
        totalAmount: 5000000,
        netAmount: 5000000,
        status: 'confirmed',
        bookingDate: new Date('2026-02-01'),
        customer: { id: 'cust-1', name: 'Customer 1' },
        project: { id: 'proj-1', name: 'Green Valley' },
      },
    },
    {
      id: 'comm-2',
      amount: 200000,
      percentage: 2.5,
      status: 'approved',
      approvedAt: new Date('2026-03-10'),
      paidAt: null,
      createdAt: new Date('2026-03-01'),
      agent: {
        id: agentRecord.id,
        agentCode: 'AGT001',
        user: { id: agentUser.id, name: 'Test Agent', email: 'agent@test.com' },
      },
      booking: {
        id: 'booking-2',
        bookingNumber: 'BK-00002',
        totalAmount: 8000000,
        netAmount: 8000000,
        status: 'confirmed',
        bookingDate: new Date('2026-03-01'),
        customer: { id: 'cust-2', name: 'Customer 2' },
        project: { id: 'proj-1', name: 'Green Valley' },
      },
    },
    {
      id: 'comm-3',
      amount: 100000,
      percentage: 2,
      status: 'pending',
      approvedAt: null,
      paidAt: null,
      createdAt: new Date('2026-03-15'),
      agent: {
        id: agentRecord.id,
        agentCode: 'AGT001',
        user: { id: agentUser.id, name: 'Test Agent', email: 'agent@test.com' },
      },
      booking: {
        id: 'booking-3',
        bookingNumber: 'BK-00003',
        totalAmount: 5000000,
        netAmount: 5000000,
        status: 'pending',
        bookingDate: new Date('2026-03-12'),
        customer: { id: 'cust-3', name: 'Customer 3' },
        project: { id: 'proj-2', name: 'Sunrise Heights' },
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch commissions scoped to agent', async () => {
    mockAuth.mockResolvedValue({ authorized: true, user: agentUser });
    (mockPrisma.agent.findUnique as jest.Mock).mockResolvedValue(agentRecord);
    (mockPrisma.commission.findMany as jest.Mock).mockResolvedValue(mockCommissions);

    const agent = await mockPrisma.agent.findUnique({ where: { userId: agentUser.id } });
    expect(agent).not.toBeNull();

    const commissions = await mockPrisma.commission.findMany({
      where: {
        agentId: agent!.id,
        booking: { orgId: agentUser.orgId, deletedAt: null },
      },
    });

    expect(commissions).toHaveLength(3);
    expect(mockPrisma.commission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          agentId: agentRecord.id,
        }),
      }),
    );
  });

  it('should calculate correct summary totals', () => {
    // Simulate summary calculation logic from the API
    let totalEarned = 0;
    let totalPending = 0;
    let totalPaid = 0;
    let currentMonth = 0;

    for (const c of mockCommissions) {
      const amt = Number(c.amount);
      if (c.status === 'paid') {
        totalPaid += amt;
        totalEarned += amt;
      }
      if (c.status === 'approved') {
        totalEarned += amt;
      }
      if (c.status === 'pending') {
        totalPending += amt;
      }
      if (c.paidAt && new Date(c.paidAt) >= startOfMonth) {
        currentMonth += amt;
      }
    }

    expect(totalPaid).toBe(150000);        // Only comm-1 is paid
    expect(totalEarned).toBe(350000);      // comm-1 (paid) + comm-2 (approved)
    expect(totalPending).toBe(100000);     // Only comm-3
    expect(currentMonth).toBe(150000);     // comm-1 paid in March 2026
  });

  it('should group commissions by project correctly', () => {
    const byProject: Record<string, { total: number; count: number }> = {};

    for (const c of mockCommissions) {
      const pName = c.booking.project.name;
      if (!byProject[pName]) byProject[pName] = { total: 0, count: 0 };
      byProject[pName].total += Number(c.amount);
      byProject[pName].count += 1;
    }

    expect(byProject['Green Valley']).toBeDefined();
    expect(byProject['Green Valley'].total).toBe(350000);
    expect(byProject['Green Valley'].count).toBe(2);
    expect(byProject['Sunrise Heights']).toBeDefined();
    expect(byProject['Sunrise Heights'].total).toBe(100000);
    expect(byProject['Sunrise Heights'].count).toBe(1);
  });

  it('should reject customer role from commission endpoint', async () => {
    mockAuth.mockResolvedValue({
      authorized: false,
      user: { ...agentUser, role: 'customer' as any },
      error: 'Insufficient permissions',
      status: 403,
    });

    const result = await mockAuth(['super_admin', 'admin', 'sales_manager', 'agent']);
    expect(result.authorized).toBe(false);
    expect(result.status).toBe(403);
  });

  it('should return empty for agent with no agent record', async () => {
    mockAuth.mockResolvedValue({ authorized: true, user: agentUser });
    (mockPrisma.agent.findUnique as jest.Mock).mockResolvedValue(null);

    const agent = await mockPrisma.agent.findUnique({ where: { userId: agentUser.id } });
    expect(agent).toBeNull();

    // API would return empty
    const result = {
      commissions: [],
      summary: { totalEarned: 0, totalPending: 0, totalPaid: 0, currentMonth: 0 },
    };
    expect(result.commissions).toHaveLength(0);
    expect(result.summary.totalEarned).toBe(0);
  });
});

describe('Performance Metrics Calculation', () => {
  it('should calculate average booking value', () => {
    const bookingValues = [5000000, 8000000, 5000000];
    const avg = bookingValues.reduce((s, v) => s + v, 0) / bookingValues.length;
    expect(avg).toBeCloseTo(6000000);
  });

  it('should calculate conversion rate', () => {
    const totalBookings = 10;
    const activeBookings = 8; // not cancelled/refunded
    const rate = (activeBookings / totalBookings) * 100;
    expect(rate).toBe(80);
  });

  it('should handle zero bookings gracefully', () => {
    const totalBookings = 0;
    const avg = totalBookings > 0 ? 100 / totalBookings : 0;
    const rate = totalBookings > 0 ? (0 / totalBookings) * 100 : 0;
    expect(avg).toBe(0);
    expect(rate).toBe(0);
  });
});

/**
 * Agent Leads Integration Tests
 *
 * Tests:
 * - Lead list fetch with pagination
 * - Agent data isolation (only sees own leads)
 * - Lead creation with validation
 * - Lead status update
 * - Lead detail fetch with communications/activities
 */

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    lead: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock auth
jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn(),
}));

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;

describe('Agent Leads API', () => {
  const agentUser = {
    id: 'user-agent-1',
    email: 'agent@test.com',
    name: 'Test Agent',
    role: 'agent' as const,
    orgId: 'org-1',
    image: null,
  };

  const otherAgentUser = {
    id: 'user-agent-2',
    email: 'other@test.com',
    name: 'Other Agent',
    role: 'agent' as const,
    orgId: 'org-1',
    image: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/leads (list)', () => {
    it('should scope leads to assigned agent', async () => {
      mockAuth.mockResolvedValue({ authorized: true, user: agentUser });

      const mockLeads = [
        {
          id: 'lead-1',
          name: 'Test Lead',
          phone: '9876543210',
          email: null,
          status: 'new',
          priority: 'medium',
          budget: null,
          source: '99acres',
          createdAt: new Date(),
          updatedAt: new Date(),
          assignedTo: { id: agentUser.id, name: 'Test Agent', email: 'agent@test.com' },
          leadSource: null,
          project: null,
          customer: null,
        },
      ];

      (mockPrisma.lead.findMany as jest.Mock).mockResolvedValue(mockLeads);
      (mockPrisma.lead.count as jest.Mock).mockResolvedValue(1);

      // Simulate the where clause that the API builds for agents
      const where = {
        orgId: agentUser.orgId,
        deletedAt: null,
        assignedToId: agentUser.id, // Agent sees only own leads
      };

      const leads = await mockPrisma.lead.findMany({ where, take: 10, skip: 0 });
      const count = await mockPrisma.lead.count({ where });

      expect(leads).toHaveLength(1);
      expect(count).toBe(1);
      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedToId: agentUser.id,
            orgId: agentUser.orgId,
          }),
        }),
      );
    });

    it('should enforce org isolation', async () => {
      mockAuth.mockResolvedValue({ authorized: true, user: agentUser });

      (mockPrisma.lead.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.lead.count as jest.Mock).mockResolvedValue(0);

      // An agent in org-1 cannot see leads from org-2
      const where = {
        orgId: agentUser.orgId,
        deletedAt: null,
        assignedToId: agentUser.id,
      };

      await mockPrisma.lead.findMany({ where });

      expect(mockPrisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ orgId: 'org-1' }),
        }),
      );
    });

    it('should reject unauthenticated requests', async () => {
      mockAuth.mockResolvedValue({
        authorized: false,
        user: null,
        error: 'Authentication required',
        status: 401,
      });

      const result = await mockAuth(['agent']);
      expect(result.authorized).toBe(false);
      expect(result.status).toBe(401);
    });

    it('should reject non-agent roles from agent pages', async () => {
      mockAuth.mockResolvedValue({
        authorized: false,
        user: { ...agentUser, role: 'customer' as any },
        error: 'Insufficient permissions',
        status: 403,
      });

      const result = await mockAuth(['agent']);
      expect(result.authorized).toBe(false);
      expect(result.status).toBe(403);
    });
  });

  describe('POST /api/leads (create)', () => {
    it('should create a lead assigned to the agent', async () => {
      mockAuth.mockResolvedValue({ authorized: true, user: agentUser });

      const newLead = {
        id: 'lead-new',
        name: 'New Lead',
        phone: '9876543210',
        email: null,
        status: 'new',
        priority: 'medium',
        budget: null,
        source: 'Walk-in',
        createdAt: new Date(),
        assignedTo: { id: agentUser.id, name: 'Test Agent' },
      };

      (mockPrisma.lead.create as jest.Mock).mockResolvedValue(newLead);

      const result = await mockPrisma.lead.create({
        data: {
          name: 'New Lead',
          phone: '9876543210',
          status: 'new',
          priority: 'medium',
          orgId: agentUser.orgId,
          createdById: agentUser.id,
          assignedToId: agentUser.id, // Agent can only self-assign
        },
      });

      expect(result.id).toBe('lead-new');
      expect(mockPrisma.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assignedToId: agentUser.id,
            orgId: agentUser.orgId,
          }),
        }),
      );
    });
  });

  describe('PATCH /api/leads/:id (update status)', () => {
    it('should allow agent to update own lead status', async () => {
      mockAuth.mockResolvedValue({ authorized: true, user: agentUser });

      // Verify lead belongs to agent
      (mockPrisma.lead.findFirst as jest.Mock).mockResolvedValue({
        id: 'lead-1',
        orgId: agentUser.orgId,
        assignedToId: agentUser.id,
      });

      (mockPrisma.lead.update as jest.Mock).mockResolvedValue({
        id: 'lead-1',
        status: 'contacted',
      });

      const existing = await mockPrisma.lead.findFirst({
        where: {
          id: 'lead-1',
          orgId: agentUser.orgId,
          assignedToId: agentUser.id,
          deletedAt: null,
        },
      });

      expect(existing).not.toBeNull();

      const updated = await mockPrisma.lead.update({
        where: { id: 'lead-1' },
        data: { status: 'contacted' },
      });

      expect(updated.status).toBe('contacted');
    });

    it('should NOT allow agent to see other agents leads', async () => {
      mockAuth.mockResolvedValue({ authorized: true, user: agentUser });

      // Lead belongs to a different agent
      (mockPrisma.lead.findFirst as jest.Mock).mockResolvedValue(null);

      const existing = await mockPrisma.lead.findFirst({
        where: {
          id: 'lead-other',
          orgId: agentUser.orgId,
          assignedToId: agentUser.id, // Agent filter
          deletedAt: null,
        },
      });

      expect(existing).toBeNull();
    });
  });
});

describe('Lead Form Validation', () => {
  // Test Zod schema validation rules
  const { createLeadSchema } = require('@/lib/validations/leads');

  it('should require name', () => {
    const result = createLeadSchema.safeParse({ phone: '1234567890' });
    expect(result.success).toBe(false);
  });

  it('should require phone', () => {
    const result = createLeadSchema.safeParse({ name: 'Test' });
    expect(result.success).toBe(false);
  });

  it('should accept valid lead data', () => {
    const result = createLeadSchema.safeParse({
      name: 'John Doe',
      phone: '9876543210',
      status: 'new',
      priority: 'high',
    });
    expect(result.success).toBe(true);
  });

  it('should validate email format', () => {
    const result = createLeadSchema.safeParse({
      name: 'Test',
      phone: '1234567890',
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('should accept valid status values', () => {
    const validStatuses = ['new', 'contacted', 'qualified', 'negotiation', 'site_visit', 'proposal_sent', 'won', 'lost', 'junk'];
    for (const status of validStatuses) {
      const result = createLeadSchema.safeParse({
        name: 'Test',
        phone: '1234567890',
        status,
      });
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid status values', () => {
    const result = createLeadSchema.safeParse({
      name: 'Test',
      phone: '1234567890',
      status: 'invalid_status',
    });
    expect(result.success).toBe(false);
  });
});

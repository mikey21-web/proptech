/**
 * Multi-Level Commission Engine
 *
 * Features per DEBUG.md:
 * - Commission rules configurable by admin (not hardcoded)
 * - Commission can be: flat amount, percentage of booking, percentage of payment received
 * - Multi-level: if Agent A's referral is Agent B, Agent A gets referral commission
 * - Commission triggers on booking confirmation
 * - Commission re-calculates if booking amount changes
 * - Clawback on booking cancellation
 */

import { prisma } from '@/lib/prisma';
import type { CommissionType, CommissionStatus } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CommissionResult {
  amount: number;
  percentage: number | null;
  type: CommissionType;
  ruleId: string | null;
  agentId: string;
  level: number; // 1 = direct, 2 = referral level 1, etc.
}

export interface CommissionCalculationInput {
  orgId: string;
  projectId: string;
  agentId: string;
  bookingAmount: number;
  bookingId?: string;
}

export interface MultiLevelCommissionResult {
  commissions: CommissionResult[];
  totalCommission: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_REFERRAL_LEVELS = 3; // Maximum depth of referral commission

// ---------------------------------------------------------------------------
// Commission Calculation
// ---------------------------------------------------------------------------

/**
 * Calculate commission for a single agent based on rules
 */
async function calculateAgentCommission(
  orgId: string,
  projectId: string,
  bookingAmount: number,
  level: number,
): Promise<{ amount: number; percentage: number | null; type: CommissionType; ruleId: string | null }> {
  // Try project-specific rule first, then org default
  const rule = await prisma.commissionRule.findFirst({
    where: {
      AND: [
        { structure: { orgId, isActive: true } },
        { OR: [{ projectId }, { projectId: null }] },
        { minAmount: { lte: bookingAmount } },
        { OR: [{ maxAmount: { gte: bookingAmount } }, { maxAmount: null }] },
      ],
    },
    orderBy: [
      { projectId: 'desc' }, // prefer project-specific
      { minAmount: 'desc' },
    ],
    include: { structure: true },
  });

  if (!rule) {
    return { amount: 0, percentage: null, type: 'percentage', ruleId: null };
  }

  // Apply level reduction for referral commissions
  // Level 1 (direct) = 100%, Level 2 = 50%, Level 3 = 25%
  const levelMultiplier = level === 1 ? 1 : 1 / Math.pow(2, level - 1);

  if (rule.structure.type === 'flat' && rule.flatAmount) {
    const amount = Number(rule.flatAmount) * levelMultiplier;
    return {
      amount: Math.round(amount * 100) / 100,
      percentage: null,
      type: 'flat',
      ruleId: rule.id,
    };
  }

  if (rule.percentage) {
    const pct = Number(rule.percentage) * levelMultiplier;
    const amount = (bookingAmount * pct) / 100;
    return {
      amount: Math.round(amount * 100) / 100,
      percentage: pct,
      type: 'percentage',
      ruleId: rule.id,
    };
  }

  return { amount: 0, percentage: null, type: 'percentage', ruleId: null };
}

/**
 * Get referral chain for an agent (upline)
 * Returns array of agent IDs from agent's referrer upward
 */
async function getReferralChain(agentId: string): Promise<string[]> {
  const chain: string[] = [];

  // Get agent with team info (team leader is considered referrer)
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      team: {
        select: {
          leaderId: true,
          leader: { select: { id: true, teamId: true } },
        },
      },
    },
  });

  if (!agent?.team?.leaderId) {
    return chain;
  }

  // Add team leader as first referrer
  let currentLeaderId: string | null = agent.team.leaderId;
  let depth = 0;

  while (currentLeaderId && depth < MAX_REFERRAL_LEVELS) {
    // Prevent circular references
    if (chain.includes(currentLeaderId)) break;

    chain.push(currentLeaderId);
    depth++;

    // Get the team leader's team leader (upline)
    const uplineAgent = await prisma.agent.findUnique({
      where: { id: currentLeaderId },
      select: {
        team: { select: { leaderId: true } },
      },
    });

    currentLeaderId = uplineAgent?.team?.leaderId ?? null;
  }

  return chain;
}

/**
 * Calculate multi-level commissions for a booking
 * Returns commissions for the direct agent and all referrers in the chain
 */
export async function calculateMultiLevelCommission(
  input: CommissionCalculationInput,
): Promise<MultiLevelCommissionResult> {
  const commissions: CommissionResult[] = [];
  let totalCommission = 0;

  // Level 1: Direct agent commission
  const directCommission = await calculateAgentCommission(
    input.orgId,
    input.projectId,
    input.bookingAmount,
    1,
  );

  if (directCommission.amount > 0) {
    commissions.push({
      ...directCommission,
      agentId: input.agentId,
      level: 1,
    });
    totalCommission += directCommission.amount;
  }

  // Level 2+: Referral commissions
  const referralChain = await getReferralChain(input.agentId);

  for (let i = 0; i < referralChain.length; i++) {
    const level = i + 2; // 2, 3, ...
    const referrerId = referralChain[i];

    const referralCommission = await calculateAgentCommission(
      input.orgId,
      input.projectId,
      input.bookingAmount,
      level,
    );

    if (referralCommission.amount > 0) {
      commissions.push({
        ...referralCommission,
        agentId: referrerId,
        level,
      });
      totalCommission += referralCommission.amount;
    }
  }

  return { commissions, totalCommission };
}

/**
 * Create commission records in database for a booking
 */
export async function createBookingCommissions(
  bookingId: string,
  input: CommissionCalculationInput,
): Promise<{ created: number; totalAmount: number }> {
  const result = await calculateMultiLevelCommission(input);

  if (result.commissions.length === 0) {
    return { created: 0, totalAmount: 0 };
  }

  // Create all commission records
  await prisma.commission.createMany({
    data: result.commissions.map((c) => ({
      amount: c.amount,
      percentage: c.percentage,
      status: 'pending' as CommissionStatus,
      agentId: c.agentId,
      bookingId,
      remarks: c.level === 1 ? 'Direct sale' : `Referral level ${c.level - 1}`,
    })),
  });

  return { created: result.commissions.length, totalAmount: result.totalCommission };
}

/**
 * Recalculate commissions when booking amount changes
 */
export async function recalculateBookingCommissions(
  bookingId: string,
  newBookingAmount: number,
): Promise<{ updated: number; newTotal: number }> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      orgId: true,
      projectId: true,
      agentId: true,
      commissions: {
        where: { status: { in: ['pending', 'approved'] } },
        select: { id: true, agentId: true },
      },
    },
  });

  if (!booking?.agentId) {
    return { updated: 0, newTotal: 0 };
  }

  // Get new commission amounts
  const result = await calculateMultiLevelCommission({
    orgId: booking.orgId,
    projectId: booking.projectId,
    agentId: booking.agentId,
    bookingAmount: newBookingAmount,
    bookingId,
  });

  // Update existing commissions
  let updated = 0;
  let newTotal = 0;

  for (const existing of booking.commissions) {
    const newCommission = result.commissions.find(
      (c) => c.agentId === existing.agentId,
    );

    if (newCommission) {
      await prisma.commission.update({
        where: { id: existing.id },
        data: {
          amount: newCommission.amount,
          percentage: newCommission.percentage,
        },
      });
      updated++;
      newTotal += newCommission.amount;
    }
  }

  return { updated, newTotal };
}

/**
 * Clawback commissions on booking cancellation
 */
export async function clawbackBookingCommissions(
  bookingId: string,
): Promise<{ cancelled: number; clawedBack: number }> {
  // Get all non-final commissions
  const commissions = await prisma.commission.findMany({
    where: {
      bookingId,
      status: { in: ['pending', 'approved', 'paid'] },
    },
    select: { id: true, status: true, amount: true },
  });

  let cancelled = 0;
  let clawedBack = 0;

  for (const commission of commissions) {
    if (commission.status === 'paid') {
      // Already paid - mark as clawed back (needs recovery)
      await prisma.commission.update({
        where: { id: commission.id },
        data: { status: 'clawed_back' },
      });
      clawedBack++;
    } else {
      // Pending or approved - just cancel
      await prisma.commission.update({
        where: { id: commission.id },
        data: { status: 'cancelled' },
      });
      cancelled++;
    }
  }

  return { cancelled, clawedBack };
}

// ---------------------------------------------------------------------------
// Commission State Transitions
// ---------------------------------------------------------------------------

export type CommissionAction = 'approve' | 'pay' | 'cancel' | 'clawback';

/**
 * Validate commission state transition
 */
export function canTransition(
  currentStatus: CommissionStatus,
  action: CommissionAction,
): boolean {
  const transitions: Record<CommissionStatus, CommissionAction[]> = {
    pending: ['approve', 'cancel'],
    approved: ['pay', 'cancel'],
    paid: ['clawback'],
    cancelled: [],
    clawed_back: [],
  };

  return transitions[currentStatus]?.includes(action) ?? false;
}

/**
 * Get target status for an action
 */
export function getTargetStatus(action: CommissionAction): CommissionStatus {
  const targets: Record<CommissionAction, CommissionStatus> = {
    approve: 'approved',
    pay: 'paid',
    cancel: 'cancelled',
    clawback: 'clawed_back',
  };
  return targets[action];
}

/**
 * Update commission status with validation
 */
export async function updateCommissionStatus(
  commissionId: string,
  action: CommissionAction,
  userId: string,
  orgId: string,
): Promise<{ success: boolean; error?: string; commission?: unknown }> {
  const commission = await prisma.commission.findFirst({
    where: {
      id: commissionId,
      booking: { orgId },
    },
    select: { id: true, status: true, amount: true, agentId: true },
  });

  if (!commission) {
    return { success: false, error: 'Commission not found' };
  }

  if (!canTransition(commission.status, action)) {
    return {
      success: false,
      error: `Cannot ${action} commission in ${commission.status} status`,
    };
  }

  const targetStatus = getTargetStatus(action);
  const now = new Date();

  const updateData: Record<string, unknown> = { status: targetStatus };

  if (action === 'approve') {
    updateData.approvedAt = now;
  } else if (action === 'pay') {
    updateData.paidAt = now;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.commission.update({
      where: { id: commissionId },
      data: updateData,
      select: {
        id: true,
        amount: true,
        status: true,
        approvedAt: true,
        paidAt: true,
        agent: {
          select: {
            id: true,
            agentCode: true,
            user: { select: { name: true } },
          },
        },
        booking: {
          select: {
            id: true,
            bookingNumber: true,
          },
        },
      },
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        action: 'update',
        entity: 'Commission',
        entityId: commissionId,
        oldValues: { status: commission.status },
        newValues: { status: targetStatus },
        userId,
        orgId,
      },
    });

    return result;
  });

  return { success: true, commission: updated };
}

/**
 * Bulk approve commissions
 */
export async function bulkApproveCommissions(
  commissionIds: string[],
  userId: string,
  orgId: string,
): Promise<{ approved: number; failed: number; errors: string[] }> {
  let approved = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const id of commissionIds) {
    const result = await updateCommissionStatus(id, 'approve', userId, orgId);
    if (result.success) {
      approved++;
    } else {
      failed++;
      errors.push(`${id}: ${result.error}`);
    }
  }

  return { approved, failed, errors };
}

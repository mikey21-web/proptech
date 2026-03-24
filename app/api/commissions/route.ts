export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { ok, unauthorized, forbidden, serverError } from '@/lib/api-response';

// ---------------------------------------------------------------------------
// GET /api/commissions — Agent commissions (self-scoped) or admin view
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth([
      'super_admin',
      'admin',
      'sales_manager',
      'agent',
    ]);
    if (!auth.authorized) {
      return auth.status === 401
        ? unauthorized(auth.error)
        : forbidden(auth.error);
    }
    const user = auth.user!;

    let agentId: string | undefined;

    if (user.role === 'agent') {
      const agentRecord = await prisma.agent.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (!agentRecord) {
        return ok({
          commissions: [],
          summary: { totalEarned: 0, totalPending: 0, totalPaid: 0, currentMonth: 0 },
        });
      }
      agentId = agentRecord.id;
    } else {
      const qAgentId = req.nextUrl.searchParams.get('agentId');
      if (qAgentId) agentId = qAgentId;
    }

    const where: Record<string, unknown> = {};
    if (agentId) where.agentId = agentId;

    // Ensure org scoping through booking
    where.booking = { orgId: user.orgId, deletedAt: null };

    const commissions = await prisma.commission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        percentage: true,
        status: true,
        approvedAt: true,
        paidAt: true,
        remarks: true,
        createdAt: true,
        agent: {
          select: {
            id: true,
            agentCode: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            totalAmount: true,
            netAmount: true,
            status: true,
            bookingDate: true,
            customer: { select: { id: true, name: true } },
            project: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Calculate summary
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalEarned = 0;
    let totalPending = 0;
    let totalPaid = 0;
    let currentMonth = 0;

    for (const c of commissions) {
      const amt = Number(c.amount);
      // totalEarned = all non-cancelled commissions
      if (c.status !== 'cancelled' && c.status !== 'clawed_back') {
        totalEarned += amt;
      }
      if (c.status === 'paid') {
        totalPaid += amt;
      }
      if (c.status === 'pending' || c.status === 'approved') {
        totalPending += amt;
      }
      if (c.paidAt && new Date(c.paidAt) >= startOfMonth) {
        currentMonth += amt;
      }
    }

    return ok({
      commissions,
      summary: { totalEarned, totalPending, totalPaid, currentMonth },
    });
  } catch (err) {
    return serverError(String(err));
  }
}

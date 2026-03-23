import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  ok,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  serverError,
} from '@/lib/api-response';
import {
  updateCommissionStatus,
  type CommissionAction,
} from '@/lib/commission-engine';
import { z } from 'zod';

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/commissions/[id] — Single commission detail
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest, context: RouteContext) {
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
    const { id } = await context.params;

    const commission = await prisma.commission.findFirst({
      where: {
        id,
        booking: { orgId: user.orgId, deletedAt: null },
      },
      select: {
        id: true,
        amount: true,
        percentage: true,
        status: true,
        approvedAt: true,
        paidAt: true,
        remarks: true,
        createdAt: true,
        updatedAt: true,
        agent: {
          select: {
            id: true,
            agentCode: true,
            bankAccount: true,
            ifscCode: true,
            bankName: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
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
            customer: { select: { id: true, name: true, phone: true } },
            project: { select: { id: true, name: true } },
            plot: { select: { id: true, plotNumber: true } },
            flat: { select: { id: true, flatNumber: true } },
          },
        },
      },
    });

    if (!commission) return notFound('Commission not found');

    // Agent can only see their own commissions
    if (user.role === 'agent') {
      const agentRecord = await prisma.agent.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (!agentRecord || commission.agent?.id !== agentRecord.id) {
        return notFound('Commission not found');
      }
    }

    // Calculate related commissions (same booking, other agents)
    const relatedCommissions = await prisma.commission.findMany({
      where: {
        bookingId: commission.booking.id,
        id: { not: id },
        booking: { orgId: user.orgId },
      },
      select: {
        id: true,
        amount: true,
        percentage: true,
        status: true,
        remarks: true,
        agent: {
          select: {
            agentCode: true,
            user: { select: { name: true } },
          },
        },
      },
    });

    return ok({
      commission,
      relatedCommissions,
    });
  } catch (err) {
    return serverError(String(err));
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/commissions/[id] — Update commission (approve, pay, cancel)
// ---------------------------------------------------------------------------

const updateSchema = z.object({
  action: z.enum(['approve', 'pay', 'cancel', 'clawback']),
  remarks: z.string().max(500).optional(),
});

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth([
      'super_admin',
      'admin',
      'sales_manager',
    ]);
    if (!auth.authorized) {
      return auth.status === 401
        ? unauthorized(auth.error)
        : forbidden(auth.error);
    }
    const user = auth.user!;
    const { id } = await context.params;

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }

    const { action, remarks } = parsed.data;

    // Permission check: only admin+ can pay
    if (action === 'pay' && !['super_admin', 'admin'].includes(user.role)) {
      return forbidden('Only admins can mark commissions as paid');
    }

    // Perform the status update
    const result = await updateCommissionStatus(
      id,
      action as CommissionAction,
      user.id,
      user.orgId,
    );

    if (!result.success) {
      return badRequest(result.error ?? 'Failed to update commission');
    }

    // Update remarks if provided
    if (remarks) {
      await prisma.commission.update({
        where: { id },
        data: { remarks },
      });
    }

    return ok(result.commission);
  } catch (err) {
    return serverError(String(err));
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
import { updateCallLogSchema } from '@/lib/validations/call-logs';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Single Call Log API
 *
 * Per DEBUG.md Section 3:
 * - Agents can only access their own lead's call logs
 * - Cannot delete call logs (audit requirement), only soft delete
 */

// ---------------------------------------------------------------------------
// GET /api/call-logs/[id] — Get single call log
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth([
      'super_admin',
      'admin',
      'sales_manager',
      'backoffice',
      'agent',
    ]);
    if (!auth.authorized) {
      return auth.status === 401
        ? unauthorized(auth.error)
        : forbidden(auth.error);
    }
    const user = auth.user!;
    const { id } = await context.params;

    const callLog = await prisma.communication.findFirst({
      where: {
        id,
        type: 'call',
        deletedAt: null,
        lead: {
          orgId: user.orgId,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        type: true,
        direction: true,
        subject: true,
        body: true,
        duration: true,
        outcome: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            status: true,
            priority: true,
            assignedTo: { select: { id: true, name: true } },
            project: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!callLog) {
      return notFound('Call log not found');
    }

    // Agent-level: can only see call logs for their assigned leads
    if (user.role === 'agent' && callLog.lead.assignedTo?.id !== user.id) {
      return notFound('Call log not found');
    }

    // Get other recent calls for this lead
    const recentCalls = await prisma.communication.findMany({
      where: {
        leadId: callLog.lead.id,
        type: 'call',
        id: { not: id },
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        direction: true,
        duration: true,
        outcome: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    });

    return ok({
      callLog: {
        ...callLog,
        durationFormatted: callLog.duration
          ? `${Math.floor(callLog.duration / 60)}:${String(callLog.duration % 60).padStart(2, '0')}`
          : null,
      },
      recentCalls: recentCalls.map((c) => ({
        ...c,
        durationFormatted: c.duration
          ? `${Math.floor(c.duration / 60)}:${String(c.duration % 60).padStart(2, '0')}`
          : null,
      })),
    });
  } catch (err) {
    return serverError(String(err));
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/call-logs/[id] — Update call log
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth([
      'super_admin',
      'admin',
      'sales_manager',
      'backoffice',
      'agent',
    ]);
    if (!auth.authorized) {
      return auth.status === 401
        ? unauthorized(auth.error)
        : forbidden(auth.error);
    }
    const user = auth.user!;
    const { id } = await context.params;

    const body = await req.json();
    const parsed = updateCallLogSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }

    // Verify call log exists and is accessible
    const existingCallLog = await prisma.communication.findFirst({
      where: {
        id,
        type: 'call',
        deletedAt: null,
        lead: {
          orgId: user.orgId,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        userId: true,
        lead: {
          select: { assignedToId: true },
        },
      },
    });

    if (!existingCallLog) {
      return notFound('Call log not found');
    }

    // Agent-level: can only update their own call logs
    if (user.role === 'agent') {
      if (existingCallLog.userId !== user.id) {
        return forbidden('You can only update your own call logs');
      }
    }

    const data = parsed.data;

    const callLog = await prisma.communication.update({
      where: { id },
      data: {
        ...(data.direction !== undefined && { direction: data.direction }),
        ...(data.duration !== undefined && { duration: data.duration }),
        ...(data.outcome !== undefined && { outcome: data.outcome }),
        ...(data.subject !== undefined && { subject: data.subject }),
        ...(data.body !== undefined && { body: data.body }),
      },
      select: {
        id: true,
        type: true,
        direction: true,
        subject: true,
        body: true,
        duration: true,
        outcome: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true, phone: true } },
      },
    });

    return ok({
      ...callLog,
      durationFormatted: callLog.duration
        ? `${Math.floor(callLog.duration / 60)}:${String(callLog.duration % 60).padStart(2, '0')}`
        : null,
    });
  } catch (err) {
    return serverError(String(err));
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/call-logs/[id] — Soft delete call log (admin only)
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    // Only admin+ can delete call logs (audit requirement)
    const auth = await requireAuth(['super_admin', 'admin']);
    if (!auth.authorized) {
      return auth.status === 401
        ? unauthorized(auth.error)
        : forbidden(auth.error);
    }
    const user = auth.user!;
    const { id } = await context.params;

    // Verify call log exists and is accessible
    const existingCallLog = await prisma.communication.findFirst({
      where: {
        id,
        type: 'call',
        deletedAt: null,
        lead: {
          orgId: user.orgId,
          deletedAt: null,
        },
      },
      select: { id: true },
    });

    if (!existingCallLog) {
      return notFound('Call log not found');
    }

    // Soft delete
    await prisma.communication.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return ok({ message: 'Call log deleted successfully' });
  } catch (err) {
    return serverError(String(err));
  }
}

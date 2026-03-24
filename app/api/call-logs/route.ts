export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  ok,
  created,
  badRequest,
  unauthorized,
  forbidden,
  serverError,
} from '@/lib/api-response';
import { createCallLogSchema, callLogQuerySchema } from '@/lib/validations/call-logs';
import type { Prisma } from '@prisma/client';

/**
 * Call Logs API
 *
 * Per DEBUG.md Section 3:
 * - Manual logging with duration and outcome
 * - Updates lead's lastContacted field
 * - Agents can only see their own lead's call logs
 */

// ---------------------------------------------------------------------------
// GET /api/call-logs — List call logs (filtered, paginated, org-scoped)
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
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

    // Parse query params
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = callLogQuerySchema.safeParse(params);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }
    const q = parsed.data;

    // Build WHERE — call logs are filtered via lead's orgId
    const where: Prisma.CommunicationWhereInput = {
      type: 'call', // Only call type communications
      deletedAt: null,
      lead: {
        orgId: user.orgId,
        deletedAt: null,
      },
    };

    if (q.leadId) where.leadId = q.leadId;
    if (q.direction) where.direction = q.direction;
    if (q.outcome) where.outcome = q.outcome;
    if (q.userId) where.userId = q.userId;

    // Date range on createdAt
    if (q.from || q.to) {
      where.createdAt = {};
      if (q.from) where.createdAt.gte = new Date(q.from);
      if (q.to) where.createdAt.lte = new Date(q.to);
    }

    // Agent-level: can only see call logs for their assigned leads
    if (user.role === 'agent') {
      where.lead = {
        ...where.lead as Record<string, unknown>,
        assignedToId: user.id,
      };
    }

    const skip = (q.page - 1) * q.limit;

    const [callLogs, total] = await Promise.all([
      prisma.communication.findMany({
        where,
        skip,
        take: q.limit,
        orderBy: { createdAt: 'desc' },
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
          user: { select: { id: true, name: true, email: true } },
          lead: {
            select: {
              id: true,
              name: true,
              phone: true,
              status: true,
              assignedTo: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.communication.count({ where }),
    ]);

    // Format duration for display
    const callLogsWithDuration = callLogs.map((log) => ({
      ...log,
      durationFormatted: log.duration
        ? `${Math.floor(log.duration / 60)}:${String(log.duration % 60).padStart(2, '0')}`
        : null,
    }));

    return ok({
      callLogs: callLogsWithDuration,
      pagination: {
        page: q.page,
        limit: q.limit,
        total,
        totalPages: Math.ceil(total / q.limit),
      },
    });
  } catch (err) {
    return serverError(String(err));
  }
}

// ---------------------------------------------------------------------------
// POST /api/call-logs — Create a call log
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const parsed = createCallLogSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }

    const data = parsed.data;

    // Verify lead exists and belongs to user's org
    const lead = await prisma.lead.findFirst({
      where: { id: data.leadId, orgId: user.orgId, deletedAt: null },
      select: { id: true, assignedToId: true },
    });
    if (!lead) {
      return badRequest('Lead not found or not accessible');
    }

    // Agents can only log calls for their assigned leads
    if (user.role === 'agent' && lead.assignedToId !== user.id) {
      return forbidden('You can only log calls for your assigned leads');
    }

    // Create call log and update lead's lastContacted in a transaction
    const [callLog] = await prisma.$transaction([
      prisma.communication.create({
        data: {
          type: 'call',
          direction: data.direction,
          duration: data.duration ?? null,
          outcome: data.outcome ?? null,
          subject: data.subject ?? null,
          body: data.body ?? null,
          leadId: data.leadId,
          userId: user.id,
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
          user: { select: { id: true, name: true } },
          lead: { select: { id: true, name: true, phone: true } },
        },
      }),
      // Update lead's lastContacted timestamp
      prisma.lead.update({
        where: { id: data.leadId },
        data: { updatedAt: new Date() }, // Using updatedAt as lastContacted
      }),
    ]);

    return created({
      ...callLog,
      durationFormatted: callLog.duration
        ? `${Math.floor(callLog.duration / 60)}:${String(callLog.duration % 60).padStart(2, '0')}`
        : null,
    });
  } catch (err) {
    return serverError(String(err));
  }
}

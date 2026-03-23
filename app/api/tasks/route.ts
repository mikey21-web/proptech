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
import { createTaskSchema, taskQuerySchema } from '@/lib/validations/tasks';
import type { Prisma } from '@prisma/client';

/**
 * Tasks API
 *
 * Per DEBUG.md Section 4:
 * - Filter by assignee/lead/status
 * - IST timezone for due dates
 * - Overdue calculation
 * - Agents can only see/create tasks assigned to them
 */

// ---------------------------------------------------------------------------
// GET /api/tasks — List tasks (filtered, paginated, org-scoped)
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
    const parsed = taskQuerySchema.safeParse(params);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }
    const q = parsed.data;

    // Build WHERE — tasks don't have org directly, but lead does
    // For tasks not linked to leads, we check creator's org
    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
      OR: [
        // Tasks linked to leads in user's org
        { lead: { orgId: user.orgId, deletedAt: null } },
        // Tasks without leads, created by users in same org
        { leadId: null, creator: { orgId: user.orgId } },
      ],
    };

    if (q.status) where.status = q.status;
    if (q.priority) where.priority = q.priority;
    if (q.assigneeId) where.assigneeId = q.assigneeId;
    if (q.leadId) where.leadId = q.leadId;

    // Overdue filter — tasks past due date but not completed
    if (q.overdue === 'true') {
      const now = new Date();
      where.dueDate = { lt: now };
      where.status = { notIn: ['completed', 'cancelled'] };
    }

    // Date range on dueDate
    if (q.from || q.to) {
      where.dueDate = where.dueDate ?? {};
      if (typeof where.dueDate === 'object' && !('lt' in where.dueDate)) {
        if (q.from) (where.dueDate as Record<string, Date>).gte = new Date(q.from);
        if (q.to) (where.dueDate as Record<string, Date>).lte = new Date(q.to);
      }
    }

    // Free-text search on title
    if (q.search) {
      where.title = { contains: q.search, mode: 'insensitive' };
    }

    // Agent-level: can only see their own assigned tasks
    if (user.role === 'agent') {
      where.assigneeId = user.id;
    }

    const skip = (q.page - 1) * q.limit;

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: q.limit,
        orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          dueDate: true,
          completedAt: true,
          createdAt: true,
          updatedAt: true,
          assignee: { select: { id: true, name: true, email: true } },
          creator: { select: { id: true, name: true } },
          lead: {
            select: {
              id: true,
              name: true,
              phone: true,
              status: true,
            },
          },
        },
      }),
      prisma.task.count({ where }),
    ]);

    // Add computed overdue flag
    const now = new Date();
    const tasksWithOverdue = tasks.map((task) => ({
      ...task,
      isOverdue:
        task.dueDate &&
        task.dueDate < now &&
        !['completed', 'cancelled'].includes(task.status),
    }));

    return ok({
      tasks: tasksWithOverdue,
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
// POST /api/tasks — Create a task
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
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }

    const data = parsed.data;

    // If linked to a lead, verify lead exists and belongs to user's org
    if (data.leadId) {
      const lead = await prisma.lead.findFirst({
        where: { id: data.leadId, orgId: user.orgId, deletedAt: null },
        select: { id: true },
      });
      if (!lead) {
        return badRequest('Lead not found or not accessible');
      }
    }

    // Verify assignee exists and belongs to same org
    if (data.assigneeId) {
      const assignee = await prisma.user.findFirst({
        where: { id: data.assigneeId, orgId: user.orgId, deletedAt: null },
        select: { id: true },
      });
      if (!assignee) {
        return badRequest('Assignee not found or not in your organization');
      }
    }

    // Agents can only create tasks assigned to themselves
    const assigneeId =
      user.role === 'agent' ? user.id : (data.assigneeId ?? user.id);

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        leadId: data.leadId ?? null,
        assigneeId,
        creatorId: user.id,
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
        createdAt: true,
        assignee: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true } },
      },
    });

    return created(task);
  } catch (err) {
    return serverError(String(err));
  }
}

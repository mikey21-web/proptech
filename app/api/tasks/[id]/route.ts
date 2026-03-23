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
import { updateTaskSchema } from '@/lib/validations/tasks';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Single Task API
 *
 * Per DEBUG.md Section 4:
 * - Agents can only access their own tasks
 * - Mark completion sets completedAt timestamp
 * - Status transitions validated
 */

// ---------------------------------------------------------------------------
// GET /api/tasks/[id] — Get single task
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

    const task = await prisma.task.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { lead: { orgId: user.orgId, deletedAt: null } },
          { leadId: null, creator: { orgId: user.orgId } },
        ],
      },
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
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
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

    if (!task) {
      return notFound('Task not found');
    }

    // Agent-level: can only see their own assigned tasks
    if (user.role === 'agent' && task.assignee?.id !== user.id) {
      return notFound('Task not found');
    }

    // Add computed overdue flag
    const now = new Date();
    const isOverdue =
      task.dueDate &&
      task.dueDate < now &&
      !['completed', 'cancelled'].includes(task.status);

    return ok({ ...task, isOverdue });
  } catch (err) {
    return serverError(String(err));
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/tasks/[id] — Update task
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
    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }

    // Verify task exists and is accessible
    const existingTask = await prisma.task.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { lead: { orgId: user.orgId, deletedAt: null } },
          { leadId: null, creator: { orgId: user.orgId } },
        ],
      },
      select: { id: true, status: true, assigneeId: true },
    });

    if (!existingTask) {
      return notFound('Task not found');
    }

    // Agent-level: can only update their own assigned tasks
    if (user.role === 'agent' && existingTask.assigneeId !== user.id) {
      return notFound('Task not found');
    }

    const data = parsed.data;

    // If updating assignee, verify they exist in same org
    if (data.assigneeId) {
      const assignee = await prisma.user.findFirst({
        where: { id: data.assigneeId, orgId: user.orgId, deletedAt: null },
        select: { id: true },
      });
      if (!assignee) {
        return badRequest('Assignee not found or not in your organization');
      }
    }

    // Agents cannot reassign to others
    if (user.role === 'agent' && data.assigneeId && data.assigneeId !== user.id) {
      return forbidden('Agents cannot reassign tasks to others');
    }

    // If linking to lead, verify lead exists in same org
    if (data.leadId) {
      const lead = await prisma.lead.findFirst({
        where: { id: data.leadId, orgId: user.orgId, deletedAt: null },
        select: { id: true },
      });
      if (!lead) {
        return badRequest('Lead not found or not accessible');
      }
    }

    // Handle completedAt timestamp based on status
    let completedAt: Date | null | undefined = undefined;
    if (data.status === 'completed' && existingTask.status !== 'completed') {
      completedAt = new Date();
    } else if (data.status && data.status !== 'completed') {
      completedAt = null; // Clear if moving away from completed
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.dueDate !== undefined && {
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
        }),
        ...(data.leadId !== undefined && { leadId: data.leadId }),
        ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId }),
        ...(completedAt !== undefined && { completedAt }),
      },
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
        assignee: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true } },
      },
    });

    return ok(task);
  } catch (err) {
    return serverError(String(err));
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/tasks/[id] — Soft delete task
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAuth([
      'super_admin',
      'admin',
      'sales_manager',
      'backoffice',
    ]);
    if (!auth.authorized) {
      return auth.status === 401
        ? unauthorized(auth.error)
        : forbidden(auth.error);
    }
    const user = auth.user!;
    const { id } = await context.params;

    // Verify task exists and is accessible
    const existingTask = await prisma.task.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { lead: { orgId: user.orgId, deletedAt: null } },
          { leadId: null, creator: { orgId: user.orgId } },
        ],
      },
      select: { id: true },
    });

    if (!existingTask) {
      return notFound('Task not found');
    }

    // Soft delete
    await prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return ok({ message: 'Task deleted successfully' });
  } catch (err) {
    return serverError(String(err));
  }
}

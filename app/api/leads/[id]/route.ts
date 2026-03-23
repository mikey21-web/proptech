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
import { updateLeadSchema } from '@/lib/validations/leads';

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/leads/[id]
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

    const lead = await prisma.lead.findFirst({
      where: {
        id,
        orgId: user.orgId,
        deletedAt: null,
        ...(user.role === 'agent' ? { assignedToId: user.id } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        altPhone: true,
        status: true,
        priority: true,
        budget: true,
        notes: true,
        source: true,
        createdAt: true,
        updatedAt: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
        leadSource: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, phone: true } },
        communications: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            type: true,
            direction: true,
            subject: true,
            outcome: true,
            createdAt: true,
          },
        },
        activities: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            type: true,
            title: true,
            createdAt: true,
          },
        },
      },
    });

    if (!lead) return notFound('Lead not found');

    return ok(lead);
  } catch (err) {
    return serverError(String(err));
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/leads/[id]
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
    const parsed = updateLeadSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }

    // Verify ownership / org
    const existing = await prisma.lead.findFirst({
      where: {
        id,
        orgId: user.orgId,
        deletedAt: null,
        ...(user.role === 'agent' ? { assignedToId: user.id } : {}),
      },
    });

    if (!existing) return notFound('Lead not found');

    // Agents cannot reassign leads
    const data = { ...parsed.data };
    if (user.role === 'agent') {
      delete data.assignedToId;
    }

    const updated = await prisma.lead.update({
      where: { id, orgId: user.orgId },
      data: {
        ...data,
        budget: data.budget !== undefined ? data.budget : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        priority: true,
        budget: true,
        updatedAt: true,
        assignedTo: { select: { id: true, name: true } },
      },
    });

    return ok(updated);
  } catch (err) {
    return serverError(String(err));
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/leads/[id] — soft delete
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest, context: RouteContext) {
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

    const existing = await prisma.lead.findFirst({
      where: { id, orgId: user.orgId, deletedAt: null },
    });

    if (!existing) return notFound('Lead not found');

    await prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return ok({ deleted: true });
  } catch (err) {
    return serverError(String(err));
  }
}

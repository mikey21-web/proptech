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
import { updateSiteVisitSchema } from '@/lib/validations/site-visits';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Single Site Visit API
 *
 * Per DEBUG.md Section 5:
 * - Update status (confirmed, completed, cancelled, etc.)
 * - Agents can only access their own lead's site visits
 */

// ---------------------------------------------------------------------------
// GET /api/site-visits/[id] — Get single site visit
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

    const siteVisit = await prisma.communication.findFirst({
      where: {
        id,
        type: 'site_visit',
        deletedAt: null,
        lead: {
          orgId: user.orgId,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        type: true,
        subject: true,
        body: true,
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
            project: { select: { id: true, name: true, address: true, city: true } },
            assignedTo: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!siteVisit) {
      return notFound('Site visit not found');
    }

    // Agent-level: can only see site visits for their assigned leads
    if (user.role === 'agent' && siteVisit.lead.assignedTo?.id !== user.id) {
      return notFound('Site visit not found');
    }

    // Get other site visits for this lead
    const otherVisits = await prisma.communication.findMany({
      where: {
        leadId: siteVisit.lead.id,
        type: 'site_visit',
        id: { not: id },
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        subject: true,
        outcome: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    });

    return ok({
      siteVisit: {
        ...siteVisit,
        status: siteVisit.outcome ?? 'scheduled',
        scheduledAt: siteVisit.createdAt,
      },
      otherVisits: otherVisits.map((v) => ({
        ...v,
        status: v.outcome ?? 'scheduled',
      })),
    });
  } catch (err) {
    return serverError(String(err));
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/site-visits/[id] — Update site visit
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
    const parsed = updateSiteVisitSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }

    // Verify site visit exists and is accessible
    const existingSiteVisit = await prisma.communication.findFirst({
      where: {
        id,
        type: 'site_visit',
        deletedAt: null,
        lead: {
          orgId: user.orgId,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        userId: true,
        body: true,
        lead: {
          select: { assignedToId: true },
        },
      },
    });

    if (!existingSiteVisit) {
      return notFound('Site visit not found');
    }

    // Agent-level: can only update site visits they created
    if (user.role === 'agent' && existingSiteVisit.userId !== user.id) {
      return forbidden('You can only update site visits you created');
    }

    const data = parsed.data;

    // Build updated body
    let updatedBody = existingSiteVisit.body || '';
    if (data.notes) {
      updatedBody = data.notes;
    }
    if (data.location) {
      // Replace or add location
      updatedBody = updatedBody.replace(/Location:.*$/m, '').trim();
      updatedBody += `\nLocation: ${data.location}`;
    }
    if (data.attendees) {
      updatedBody = updatedBody.replace(/Attendees:.*$/m, '').trim();
      updatedBody += `\nAttendees: ${data.attendees}`;
    }
    if (data.outcome) {
      updatedBody = updatedBody.replace(/Outcome:.*$/m, '').trim();
      updatedBody += `\nOutcome: ${data.outcome}`;
    }

    const siteVisit = await prisma.communication.update({
      where: { id },
      data: {
        ...(data.subject !== undefined && { subject: data.subject }),
        ...(updatedBody !== existingSiteVisit.body && { body: updatedBody.trim() }),
        ...(data.status !== undefined && { outcome: data.status }),
      },
      select: {
        id: true,
        type: true,
        subject: true,
        body: true,
        outcome: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true } },
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            project: { select: { id: true, name: true, address: true, city: true } },
          },
        },
      },
    });

    return ok({
      ...siteVisit,
      status: siteVisit.outcome ?? 'scheduled',
      scheduledAt: siteVisit.createdAt,
    });
  } catch (err) {
    return serverError(String(err));
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/site-visits/[id] — Cancel/soft delete site visit
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

    // Verify site visit exists and is accessible
    const existingSiteVisit = await prisma.communication.findFirst({
      where: {
        id,
        type: 'site_visit',
        deletedAt: null,
        lead: {
          orgId: user.orgId,
          deletedAt: null,
        },
      },
      select: { id: true },
    });

    if (!existingSiteVisit) {
      return notFound('Site visit not found');
    }

    // Soft delete
    await prisma.communication.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return ok({ message: 'Site visit cancelled successfully' });
  } catch (err) {
    return serverError(String(err));
  }
}

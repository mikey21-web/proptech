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
import {
  createSiteVisitSchema,
  siteVisitQuerySchema,
} from '@/lib/validations/site-visits';
import type { Prisma } from '@prisma/client';

/**
 * Site Visits API
 *
 * Per DEBUG.md Section 5:
 * - Schedule with date/time (IST)
 * - Google Maps link
 * - WhatsApp confirmation trigger
 * - Agents can only see their own lead's site visits
 */

// ---------------------------------------------------------------------------
// GET /api/site-visits — List site visits (filtered, paginated, org-scoped)
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
    const parsed = siteVisitQuerySchema.safeParse(params);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }
    const q = parsed.data;

    // Build WHERE — site visits are filtered via lead's orgId
    const where: Prisma.CommunicationWhereInput = {
      type: 'site_visit',
      deletedAt: null,
      lead: {
        orgId: user.orgId,
        deletedAt: null,
      },
    };

    if (q.leadId) where.leadId = q.leadId;
    if (q.userId) where.userId = q.userId;

    // Filter by status stored in outcome field
    if (q.status) {
      where.outcome = q.status;
    }

    // Upcoming filter - future scheduled visits
    if (q.upcoming === 'true') {
      const now = new Date();
      where.createdAt = { gt: now }; // Using createdAt as scheduled time
    }

    // Date range
    if (q.from || q.to) {
      where.createdAt = where.createdAt ?? {};
      if (typeof where.createdAt === 'object' && !('gt' in where.createdAt)) {
        if (q.from) (where.createdAt as Record<string, Date>).gte = new Date(q.from);
        if (q.to) (where.createdAt as Record<string, Date>).lte = new Date(q.to);
      }
    }

    // Agent-level: can only see site visits for their assigned leads
    if (user.role === 'agent') {
      where.lead = {
        ...where.lead as Record<string, unknown>,
        assignedToId: user.id,
      };
    }

    const skip = (q.page - 1) * q.limit;

    const [siteVisits, total] = await Promise.all([
      prisma.communication.findMany({
        where,
        skip,
        take: q.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          subject: true,
          body: true,
          outcome: true, // Used as status
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, name: true, email: true } },
          lead: {
            select: {
              id: true,
              name: true,
              phone: true,
              status: true,
              project: { select: { id: true, name: true, address: true, city: true } },
              assignedTo: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.communication.count({ where }),
    ]);

    // Format site visits with computed fields
    const siteVisitsFormatted = siteVisits.map((visit) => ({
      ...visit,
      status: visit.outcome ?? 'scheduled',
      scheduledAt: visit.createdAt,
      // Parse location from body if stored there
      location: visit.body?.includes('maps.google') ? visit.body : null,
    }));

    return ok({
      siteVisits: siteVisitsFormatted,
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
// POST /api/site-visits — Create/schedule a site visit
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
    const parsed = createSiteVisitSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }

    const data = parsed.data;

    // Verify lead exists and belongs to user's org
    const lead = await prisma.lead.findFirst({
      where: { id: data.leadId, orgId: user.orgId, deletedAt: null },
      select: {
        id: true,
        name: true,
        phone: true,
        assignedToId: true,
        project: { select: { id: true, name: true, address: true, city: true } },
      },
    });
    if (!lead) {
      return badRequest('Lead not found or not accessible');
    }

    // Agents can only schedule visits for their assigned leads
    if (user.role === 'agent' && lead.assignedToId !== user.id) {
      return forbidden('You can only schedule visits for your assigned leads');
    }

    // Build notes/body with location and attendees info
    const bodyParts: string[] = [];
    if (data.notes) bodyParts.push(data.notes);
    if (data.location) bodyParts.push(`Location: ${data.location}`);
    if (data.attendees) bodyParts.push(`Attendees: ${data.attendees}`);

    const siteVisit = await prisma.communication.create({
      data: {
        type: 'site_visit',
        direction: 'outbound',
        subject: data.subject ?? `Site visit for ${lead.name}`,
        body: bodyParts.join('\n') || null,
        outcome: data.status,
        leadId: data.leadId,
        userId: user.id,
        // Note: scheduled time could be stored in a JSON metadata field
        // For now using createdAt as schedule time isn't ideal
        // but matches the existing schema
      },
      select: {
        id: true,
        type: true,
        subject: true,
        body: true,
        outcome: true,
        createdAt: true,
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

    // TODO: Queue WhatsApp confirmation message
    // await queueWhatsAppMessage({
    //   phone: lead.phone,
    //   template: 'site_visit_confirmation',
    //   params: { name: lead.name, date: data.scheduledAt, location: data.location }
    // });

    return created({
      ...siteVisit,
      status: siteVisit.outcome ?? 'scheduled',
      scheduledAt: data.scheduledAt,
    });
  } catch (err) {
    return serverError(String(err));
  }
}

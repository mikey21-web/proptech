import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { ok, created, badRequest, unauthorized, forbidden, serverError } from '@/lib/api-response';
import { createLeadSchema, leadQuerySchema } from '@/lib/validations/leads';
import type { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// GET /api/leads — List leads (filtered, paginated, org-scoped)
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
    const parsed = leadQuerySchema.safeParse(params);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }
    const q = parsed.data;

    // Build WHERE — always scoped to org
    const where: Prisma.LeadWhereInput = {
      orgId: user.orgId,
      deletedAt: null,
    };

    if (q.status) where.status = q.status;
    if (q.priority) where.priority = q.priority;
    if (q.agentId) where.assignedToId = q.agentId;
    if (q.projectId) where.projectId = q.projectId;
    if (q.leadSourceId) where.leadSourceId = q.leadSourceId;

    // Date range
    if (q.from || q.to) {
      where.createdAt = {};
      if (q.from) where.createdAt.gte = new Date(q.from);
      if (q.to) where.createdAt.lte = new Date(q.to);
    }

    // Free-text search on name / phone / email
    if (q.search) {
      where.OR = [
        { name: { contains: q.search, mode: 'insensitive' } },
        { phone: { contains: q.search } },
        { email: { contains: q.search, mode: 'insensitive' } },
      ];
    }

    // Agent-level: can only see own leads
    if (user.role === 'agent') {
      where.assignedToId = user.id;
    }

    const skip = (q.page - 1) * q.limit;

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: q.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          priority: true,
          budget: true,
          source: true,
          createdAt: true,
          updatedAt: true,
          assignedTo: { select: { id: true, name: true, email: true } },
          leadSource: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true } },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    return ok({
      leads,
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
// POST /api/leads — Create a lead
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
    const parsed = createLeadSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }

    const data = parsed.data;

    // Duplicate detection — check phone within same org
    const existingLead = await prisma.lead.findFirst({
      where: { orgId: user.orgId, phone: data.phone, deletedAt: null },
      select: { id: true, name: true, status: true, assignedTo: { select: { name: true } } },
    });
    if (existingLead) {
      return badRequest(
        `A lead with phone ${data.phone} already exists: "${existingLead.name}" (${existingLead.status})` +
        (existingLead.assignedTo ? ` — assigned to ${existingLead.assignedTo.name}` : ''),
      );
    }

    // Agents can only create leads assigned to themselves
    const assignedToId =
      user.role === 'agent' ? user.id : (data.assignedToId ?? user.id);

    const lead = await prisma.lead.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email ?? null,
        altPhone: data.altPhone ?? null,
        status: data.status,
        priority: data.priority,
        budget: data.budget ?? null,
        notes: data.notes ?? null,
        source: data.source ?? null,
        orgId: user.orgId,
        createdById: user.id,
        assignedToId,
        leadSourceId: data.leadSourceId ?? null,
        projectId: data.projectId ?? null,
        customerId: data.customerId ?? null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        priority: true,
        budget: true,
        source: true,
        createdAt: true,
        assignedTo: { select: { id: true, name: true } },
      },
    });

    return created(lead);
  } catch (err) {
    return serverError(String(err));
  }
}

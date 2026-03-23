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
  createCustomerSchema,
  customerQuerySchema,
} from '@/lib/validations/customers';
import type { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// GET /api/customers
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

    const params = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = customerQuerySchema.safeParse(params);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }
    const q = parsed.data;

    const where: Prisma.CustomerWhereInput = {
      orgId: user.orgId,
      deletedAt: null,
    };

    if (q.search) {
      where.OR = [
        { name: { contains: q.search, mode: 'insensitive' } },
        { phone: { contains: q.search } },
        { email: { contains: q.search, mode: 'insensitive' } },
      ];
    }

    // Agent-level: only see customers linked to agent's bookings
    if (user.role === 'agent') {
      const agentRecord = await prisma.agent.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (agentRecord) {
        where.bookings = { some: { agentId: agentRecord.id } };
      } else {
        return ok({
          customers: [],
          pagination: { page: 1, limit: q.limit, total: 0, totalPages: 0 },
        });
      }
    }

    const skip = (q.page - 1) * q.limit;

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: q.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          city: true,
          state: true,
          createdAt: true,
          _count: {
            select: {
              bookings: { where: { deletedAt: null } },
              leads: { where: { deletedAt: null } },
            },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    const data = customers.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      city: c.city,
      state: c.state,
      createdAt: c.createdAt,
      totalBookings: c._count.bookings,
      totalLeads: c._count.leads,
    }));

    return ok({
      customers: data,
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
// POST /api/customers
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
    const parsed = createCustomerSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }

    const data = parsed.data;

    // Check for duplicate phone within org
    const existing = await prisma.customer.findFirst({
      where: { orgId: user.orgId, phone: data.phone, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      return badRequest('A customer with this phone number already exists');
    }

    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email ?? null,
        altPhone: data.altPhone ?? null,
        address: data.address ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        pincode: data.pincode ?? null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        panNumber: data.panNumber ?? null,
        aadhaarNumber: data.aadhaarNumber ?? null,
        gstNumber: data.gstNumber ?? null,
        occupation: data.occupation ?? null,
        companyName: data.companyName ?? null,
        notes: data.notes ?? null,
        orgId: user.orgId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        state: true,
        createdAt: true,
      },
    });

    return created(customer);
  } catch (err) {
    return serverError(String(err));
  }
}

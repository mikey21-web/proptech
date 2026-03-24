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
  createBookingSchema,
  bookingQuerySchema,
} from '@/lib/validations/bookings';
import type { Prisma } from '@prisma/client';
import { isExpiredBlock } from '@/lib/inventory-blocks';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ---------------------------------------------------------------------------
// Booking number generator
// ---------------------------------------------------------------------------

async function generateBookingNumber(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  orgId: string,
): Promise<string> {
  // Use count inside transaction to avoid duplicate booking numbers
  const count = await tx.booking.count({ where: { orgId } });
  const seq = String(count + 1).padStart(5, '0');
  return `BK-${seq}`;
}

// ---------------------------------------------------------------------------
// Commission calculator
// ---------------------------------------------------------------------------

async function calculateCommission(
  orgId: string,
  projectId: string,
  netAmount: number,
): Promise<{ amount: number; percentage: number | null }> {
  // Try project-specific rule first, then org default
  const rule = await prisma.commissionRule.findFirst({
    where: {
      AND: [
        { structure: { orgId, isActive: true } },
        { OR: [{ projectId }, { projectId: null }] },
        { minAmount: { lte: netAmount } },
        { OR: [{ maxAmount: { gte: netAmount } }, { maxAmount: null }] },
      ],
    },
    orderBy: [{ projectId: 'desc' }, { minAmount: 'desc' }], // prefer project-specific
    include: { structure: true },
  });

  if (!rule) return { amount: 0, percentage: null };

  if (rule.structure.type === 'flat' && rule.flatAmount) {
    return { amount: Number(rule.flatAmount), percentage: null };
  }

  if (rule.percentage) {
    const pct = Number(rule.percentage);
    return { amount: (netAmount * pct) / 100, percentage: pct };
  }

  return { amount: 0, percentage: null };
}

// ---------------------------------------------------------------------------
// GET /api/bookings
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
    const parsed = bookingQuerySchema.safeParse(params);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }
    const q = parsed.data;

    const where: Prisma.BookingWhereInput = {
      orgId: user.orgId,
      deletedAt: null,
    };

    if (q.status) where.status = q.status;
    if (q.projectId) where.projectId = q.projectId;
    if (q.customerId) where.customerId = q.customerId;
    if (q.agentId) where.agentId = q.agentId;

    if (q.from || q.to) {
      where.bookingDate = {};
      if (q.from) where.bookingDate.gte = new Date(q.from);
      if (q.to) where.bookingDate.lte = new Date(q.to);
    }

    // Agent-level: only see own bookings
    if (user.role === 'agent') {
      // Find the agent record for this user
      const agentRecord = await prisma.agent.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (agentRecord) {
        where.agentId = agentRecord.id;
      } else {
        // User has agent role but no Agent record — return empty
        return ok({ bookings: [], pagination: { page: 1, limit: q.limit, total: 0, totalPages: 0 } });
      }
    }

    const skip = (q.page - 1) * q.limit;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        skip,
        take: q.limit,
        orderBy: { bookingDate: 'desc' },
        select: {
          id: true,
          bookingNumber: true,
          status: true,
          bookingDate: true,
          totalAmount: true,
          netAmount: true,
          paidAmount: true,
          balanceAmount: true,
          createdAt: true,
          customer: { select: { id: true, name: true, phone: true } },
          project: { select: { id: true, name: true } },
          agent: {
            select: {
              id: true,
              agentCode: true,
              user: { select: { name: true } },
            },
          },
          plot: { select: { id: true, plotNumber: true } },
          flat: { select: { id: true, flatNumber: true } },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    return ok({
      bookings,
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
// POST /api/bookings
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const parsed = createBookingSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }

    const data = parsed.data;

    // Validate customer belongs to same org
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, orgId: user.orgId, deletedAt: null },
    });
    if (!customer) return badRequest('Customer not found in your organization');

    // Validate project belongs to same org
    const project = await prisma.project.findFirst({
      where: { id: data.projectId, orgId: user.orgId, deletedAt: null },
    });
    if (!project) return badRequest('Project not found in your organization');

    // Validate agent if provided
    if (data.agentId) {
      const agent = await prisma.agent.findFirst({
        where: { id: data.agentId, orgId: user.orgId, isActive: true },
      });
      if (!agent) return badRequest('Agent not found or inactive');
    }

    // Calculate net amount
    const netAmount =
      data.totalAmount -
      data.discountAmount +
      data.gstAmount +
      data.stampDuty +
      data.registrationFee;

    if (netAmount <= 0) {
      return badRequest('Net amount must be positive. Check discount vs total amount.');
    }

    if (data.discountAmount > data.totalAmount) {
      return badRequest('Discount cannot exceed total amount.');
    }

    // Create booking in a serializable transaction to prevent race conditions
    const booking = await prisma.$transaction(async (tx) => {
      const bookingNumber = await generateBookingNumber(tx, user.orgId);
      // Check plot/flat availability INSIDE transaction to prevent race conditions
      if (data.plotId) {
        const plot = await tx.plot.findUnique({ where: { id: data.plotId }, select: { status: true, plotNumber: true, blockedUntil: true } });
        if (!plot) throw new Error('Plot not found');
        if (isExpiredBlock(plot.status, plot.blockedUntil)) {
          await tx.plot.update({
            where: { id: data.plotId },
            data: { status: 'available', blockedUntil: null, blockReason: null },
          });
          plot.status = 'available';
        }
        if (plot.status !== 'available') throw new Error(`Plot ${plot.plotNumber} is already ${plot.status}`);
      }
      if (data.flatId) {
        const flat = await tx.flat.findUnique({ where: { id: data.flatId }, select: { status: true, flatNumber: true, blockedUntil: true } });
        if (!flat) throw new Error('Flat not found');
        if (isExpiredBlock(flat.status, flat.blockedUntil)) {
          await tx.flat.update({
            where: { id: data.flatId },
            data: { status: 'available', blockedUntil: null, blockReason: null },
          });
          flat.status = 'available';
        }
        if (flat.status !== 'available') throw new Error(`Flat ${flat.flatNumber} is already ${flat.status}`);
      }

      const newBooking = await tx.booking.create({
        data: {
          bookingNumber,
          status: 'pending',
          bookingDate: new Date(data.bookingDate),
          totalAmount: data.totalAmount,
          discountAmount: data.discountAmount,
          netAmount,
          paidAmount: 0,
          balanceAmount: netAmount,
          gstAmount: data.gstAmount,
          stampDuty: data.stampDuty,
          registrationFee: data.registrationFee,
          remarks: data.remarks ?? null,
          orgId: user.orgId,
          customerId: data.customerId,
          projectId: data.projectId,
          plotId: data.plotId ?? null,
          flatId: data.flatId ?? null,
          agentId: data.agentId ?? null,
          createdById: user.id,
        },
        select: {
          id: true,
          bookingNumber: true,
          status: true,
          bookingDate: true,
          totalAmount: true,
          netAmount: true,
          createdAt: true,
          customer: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
        },
      });

      // Calculate and record commission if agent assigned
      if (data.agentId) {
        const commission = await calculateCommission(
          user.orgId,
          data.projectId,
          netAmount,
        );
        if (commission.amount > 0) {
          await tx.commission.create({
            data: {
              amount: commission.amount,
              percentage: commission.percentage,
              status: 'pending',
              agentId: data.agentId,
              bookingId: newBooking.id,
            },
          });
        }
      }

      // Update plot/flat status to 'booked'
      if (data.plotId) {
        await tx.plot.update({
          where: { id: data.plotId },
          data: { status: 'booked', blockedUntil: null, blockReason: null },
        });
      }
      if (data.flatId) {
        await tx.flat.update({
          where: { id: data.flatId },
          data: { status: 'booked', blockedUntil: null, blockReason: null },
        });
      }

      return newBooking;
    });

    return created(booking);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Return 409 Conflict for availability errors instead of 500
    if (message.includes('already')) {
      return new Response(
        JSON.stringify({ success: false, error: message }),
        { status: 409, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return serverError(message);
  }
}

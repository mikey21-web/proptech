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
import { updateBookingSchema } from '@/lib/validations/bookings';

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/bookings/[id]
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

    const booking = await prisma.booking.findFirst({
      where: { id, orgId: user.orgId, deletedAt: null },
      select: {
        id: true,
        bookingNumber: true,
        status: true,
        bookingDate: true,
        agreementDate: true,
        registrationDate: true,
        possessionDate: true,
        totalAmount: true,
        discountAmount: true,
        netAmount: true,
        paidAmount: true,
        balanceAmount: true,
        gstAmount: true,
        stampDuty: true,
        registrationFee: true,
        remarks: true,
        createdAt: true,
        updatedAt: true,
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            panNumber: true,
          },
        },
        project: { select: { id: true, name: true, type: true, city: true } },
        plot: {
          select: {
            id: true,
            plotNumber: true,
            area: true,
            price: true,
            status: true,
          },
        },
        flat: {
          select: {
            id: true,
            flatNumber: true,
            floor: true,
            bedrooms: true,
            area: true,
            price: true,
            status: true,
          },
        },
        agent: {
          select: {
            id: true,
            agentCode: true,
            user: { select: { name: true, email: true } },
          },
        },
        createdBy: { select: { id: true, name: true } },
        payments: {
          orderBy: { paymentDate: 'desc' },
          select: {
            id: true,
            receiptNumber: true,
            amount: true,
            mode: true,
            status: true,
            paymentDate: true,
            referenceNo: true,
          },
        },
        commissions: {
          select: {
            id: true,
            amount: true,
            percentage: true,
            status: true,
            agent: {
              select: {
                id: true,
                agentCode: true,
                user: { select: { name: true } },
              },
            },
          },
        },
        installments: {
          orderBy: { installmentNo: 'asc' },
          select: {
            id: true,
            installmentNo: true,
            amount: true,
            dueDate: true,
            paidAmount: true,
            status: true,
          },
        },
      },
    });

    if (!booking) return notFound('Booking not found');

    // Agent can only see own bookings
    if (user.role === 'agent') {
      const agentRecord = await prisma.agent.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (!agentRecord || booking.agent?.id !== agentRecord.id) {
        return notFound('Booking not found');
      }
    }

    return ok(booking);
  } catch (err) {
    return serverError(String(err));
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/bookings/[id]
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest, context: RouteContext) {
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

    const body = await req.json();
    const parsed = updateBookingSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }

    const existing = await prisma.booking.findFirst({
      where: { id, orgId: user.orgId, deletedAt: null },
      select: { id: true, status: true, paidAmount: true, netAmount: true, plotId: true, flatId: true },
    });

    if (!existing) return notFound('Booking not found');

    const data = parsed.data;

    // Build update payload
    const updateData: Record<string, unknown> = {};
    if (data.status) updateData.status = data.status;
    if (data.agreementDate !== undefined)
      updateData.agreementDate = data.agreementDate
        ? new Date(data.agreementDate)
        : null;
    if (data.registrationDate !== undefined)
      updateData.registrationDate = data.registrationDate
        ? new Date(data.registrationDate)
        : null;
    if (data.possessionDate !== undefined)
      updateData.possessionDate = data.possessionDate
        ? new Date(data.possessionDate)
        : null;
    if (data.discountAmount !== undefined)
      updateData.discountAmount = data.discountAmount;
    if (data.remarks !== undefined) updateData.remarks = data.remarks;

    // Handle cancellation side effects in a transaction
    const isCancelling =
      data.status === 'cancelled' && existing.status !== 'cancelled';

    if (isCancelling) {
      const updated = await prisma.$transaction(async (tx) => {
        // 1. Update booking status
        const booking = await tx.booking.update({
          where: { id },
          data: updateData,
          select: {
            id: true,
            bookingNumber: true,
            status: true,
            totalAmount: true,
            netAmount: true,
            paidAmount: true,
            balanceAmount: true,
            updatedAt: true,
          },
        });

        // 2. Revert plot/flat status to 'available'
        if (existing.plotId) {
          await tx.plot.update({
            where: { id: existing.plotId },
            data: { status: 'available' },
          });
        }
        if (existing.flatId) {
          await tx.flat.update({
            where: { id: existing.flatId },
            data: { status: 'available' },
          });
        }

        // 3. Cancel all pending/approved commissions for this booking
        await tx.commission.updateMany({
          where: {
            bookingId: id,
            status: { in: ['pending', 'approved'] },
          },
          data: { status: 'cancelled' },
        });

        // 4. Audit log
        await tx.auditLog.create({
          data: {
            action: 'update',
            entity: 'Booking',
            entityId: id,
            oldValues: { status: existing.status },
            newValues: { status: 'cancelled' },
            userId: user.id,
            orgId: user.orgId,
          },
        });

        return booking;
      });

      return ok(updated);
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        bookingNumber: true,
        status: true,
        totalAmount: true,
        netAmount: true,
        paidAmount: true,
        balanceAmount: true,
        updatedAt: true,
      },
    });

    return ok(updated);
  } catch (err) {
    return serverError(String(err));
  }
}

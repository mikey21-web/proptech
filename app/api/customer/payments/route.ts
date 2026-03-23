import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCustomerAuth } from '@/lib/customer';
import { ok, badRequest, serverError } from '@/lib/api-response';
import { createRazorpayOrder, verifyRazorpayPayment, getRazorpayKeyId } from '@/lib/payment';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// GET /api/customer/payments — All payments for customer's bookings
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const auth = await requireCustomerAuth();
    if (auth.error) return auth.error;

    // Get all bookings for this customer
    const bookings = await prisma.booking.findMany({
      where: {
        customerId: auth.customerId,
        orgId: auth.orgId,
        deletedAt: null,
      },
      select: {
        id: true,
        bookingNumber: true,
        netAmount: true,
        paidAmount: true,
        balanceAmount: true,
        project: { select: { name: true } },
        plot: { select: { plotNumber: true } },
        flat: { select: { flatNumber: true } },
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
            bankName: true,
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
            paidDate: true,
          },
        },
      },
    });

    // Summary calculations
    const totalDue = bookings.reduce((sum, b) => sum + Number(b.balanceAmount), 0);
    const totalPaid = bookings.reduce((sum, b) => sum + Number(b.paidAmount), 0);
    const overdue = bookings.flatMap((b) =>
      b.installments.filter((i) => i.status === 'overdue'),
    );
    const overdueAmount = overdue.reduce(
      (sum, i) => sum + Number(i.amount) - Number(i.paidAmount),
      0,
    );
    const upcoming = bookings.flatMap((b) =>
      b.installments.filter(
        (i) => i.status === 'upcoming' || i.status === 'due',
      ),
    );

    return ok({
      bookings,
      summary: {
        totalDue,
        totalPaid,
        overdueAmount,
        overdueCount: overdue.length,
        upcomingCount: upcoming.length,
      },
      razorpayKeyId: getRazorpayKeyId(),
    });
  } catch (err) {
    return serverError(String(err));
  }
}

// ---------------------------------------------------------------------------
// POST /api/customer/payments — Create payment order
// ---------------------------------------------------------------------------

const createPaymentSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  installmentId: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireCustomerAuth();
    if (auth.error) return auth.error;

    const body = await req.json();
    const parsed = createPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }

    const { bookingId, installmentId, amount } = parsed.data;

    // Verify booking belongs to this customer
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        customerId: auth.customerId,
        orgId: auth.orgId,
        deletedAt: null,
      },
      select: {
        id: true,
        bookingNumber: true,
        balanceAmount: true,
        customer: { select: { name: true, email: true, phone: true } },
        project: { select: { name: true } },
      },
    });

    if (!booking) return badRequest('Booking not found');

    if (amount > Number(booking.balanceAmount)) {
      return badRequest('Amount exceeds outstanding balance');
    }

    // Create payment order via Razorpay
    const receipt = `${booking.bookingNumber}-${Date.now()}`;
    const order = await createRazorpayOrder(amount, receipt, {
      bookingId,
      customerId: auth.customerId,
      installmentId: installmentId ?? '',
    });

    return ok({
      order,
      booking: {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        projectName: booking.project.name,
        customerName: booking.customer.name,
      },
      razorpayKeyId: getRazorpayKeyId(),
    });
  } catch (err) {
    return serverError(String(err));
  }
}

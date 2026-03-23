import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCustomerAuth } from '@/lib/customer';
import { ok, badRequest, serverError } from '@/lib/api-response';
import { verifyRazorpayPayment } from '@/lib/payment';
import { createNotification } from '@/lib/notifications';
import {
  queueEmail,
  queueNotification,
  queuePdf,
  queueWhatsAppMessage,
} from '@/lib/queue';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// POST /api/customer/payments/verify — Verify payment after gateway callback
// ---------------------------------------------------------------------------

const verifySchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
  bookingId: z.string().min(1),
  installmentId: z.string().optional(),
  amount: z.number().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireCustomerAuth();
    if (auth.error) return auth.error;

    const body = await req.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }

    const data = parsed.data;

    // Verify signature
    const isValid = await verifyRazorpayPayment({
      orderId: data.razorpayOrderId,
      paymentId: data.razorpayPaymentId,
      signature: data.razorpaySignature,
    });

    if (!isValid) {
      return badRequest('Payment verification failed. Invalid signature.');
    }

    // Verify booking belongs to customer
    const booking = await prisma.booking.findFirst({
      where: {
        id: data.bookingId,
        customerId: auth.customerId,
        orgId: auth.orgId,
        deletedAt: null,
      },
      select: {
        id: true,
        bookingNumber: true,
        paidAmount: true,
        balanceAmount: true,
        netAmount: true,
        customer: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        project: {
          select: {
            name: true,
          },
        },
        plot: {
          select: {
            plotNumber: true,
          },
        },
        flat: {
          select: {
            flatNumber: true,
          },
        },
      },
    });

    if (!booking) return badRequest('Booking not found');

    // Record payment in a transaction (read booking inside tx to prevent race)
    const result = await prisma.$transaction(async (tx) => {
      // Re-read booking inside transaction for accurate balance
      const freshBooking = await tx.booking.findUniqueOrThrow({
        where: { id: booking.id },
        select: { paidAmount: true, netAmount: true, balanceAmount: true, bookingNumber: true },
      });

      // Prevent overpayment
      if (data.amount > Number(freshBooking.balanceAmount)) {
        throw new Error('Payment amount exceeds outstanding balance');
      }

      // Generate receipt number
      const paymentCount = await tx.payment.count({
        where: { bookingId: booking.id },
      });
      const receiptNumber = `${freshBooking.bookingNumber}-R${String(paymentCount + 1).padStart(3, '0')}`;

      // Check for duplicate Razorpay payment ID
      const existingPayment = await tx.payment.findFirst({
        where: { referenceNo: data.razorpayPaymentId },
        select: { id: true },
      });
      if (existingPayment) {
        throw new Error('This payment has already been recorded');
      }

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          receiptNumber,
          amount: data.amount,
          mode: 'upi', // Razorpay online payment
          status: 'received',
          paymentDate: new Date(),
          referenceNo: data.razorpayPaymentId,
          bookingId: booking.id,
          installmentId: data.installmentId ?? null,
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          type: 'payment',
          amount: data.amount,
          description: `Online payment via Razorpay (${data.razorpayPaymentId})`,
          referenceNo: data.razorpayPaymentId,
          bookingId: booking.id,
          paymentId: payment.id,
        },
      });

      // Update booking amounts using fresh data
      const newPaid = Number(freshBooking.paidAmount) + data.amount;
      const newBalance = Number(freshBooking.netAmount) - newPaid;

      await tx.booking.update({
        where: { id: booking.id },
        data: {
          paidAmount: newPaid,
          balanceAmount: Math.max(0, newBalance),
        },
      });

      // Update installment if specified
      if (data.installmentId) {
        const installment = await tx.installment.findUnique({
          where: { id: data.installmentId },
          select: { amount: true, paidAmount: true },
        });

        if (installment) {
          const newInstPaid = Number(installment.paidAmount) + data.amount;
          const isFullyPaid = newInstPaid >= Number(installment.amount);

          await tx.installment.update({
            where: { id: data.installmentId },
            data: {
              paidAmount: newInstPaid,
              paidDate: isFullyPaid ? new Date() : null,
              status: isFullyPaid ? 'paid' : 'partially_paid',
            },
          });
        }
      }

      return { payment, receiptNumber };
    });

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3001';
    const receiptUrl = `${baseUrl}/customer/payments/${result.payment.id}/receipt`;
    const propertyDetail = booking.plot
      ? `Plot ${booking.plot.plotNumber}`
      : booking.flat
        ? `Flat ${booking.flat.flatNumber}`
        : 'Property allotment pending';

    await Promise.allSettled([
      createNotification(auth.user.id, {
        type: 'payment_received',
        title: 'Payment Received',
        body: `Your payment of ₹${data.amount.toLocaleString('en-IN')} for booking ${booking.bookingNumber} has been received.`,
        customerId: auth.customerId,
        bookingId: booking.id,
        metadata: {
          paymentId: result.payment.id,
          receiptNumber: result.receiptNumber,
        },
      }),
      queueNotification({
        userId: auth.user.id,
        type: 'payment_received',
        title: 'Payment received successfully',
        body: `Receipt ${result.receiptNumber} is ready for booking ${booking.bookingNumber}.`,
        data: {
          bookingId: booking.id,
          paymentId: result.payment.id,
          receiptNumber: result.receiptNumber,
        },
      }),
      queuePdf({
        type: 'receipt',
        bookingId: booking.id,
        paymentId: result.payment.id,
        data: {
          receiptNumber: result.receiptNumber,
          receiptUrl,
        },
      }),
      booking.customer.email
        ? queueEmail({
            to: booking.customer.email,
            subject: `Payment receipt ${result.receiptNumber}`,
            template: 'payment_receipt',
            params: {
              customerName: booking.customer.name,
              amount: data.amount,
              bookingNumber: booking.bookingNumber,
              receiptNumber: result.receiptNumber,
              receiptUrl,
              projectName: booking.project.name,
              propertyDetail,
            },
          })
        : Promise.resolve(),
      booking.customer.phone
        ? queueWhatsAppMessage({
            to: booking.customer.phone,
            templateName: 'payment_received',
            templateParams: {
              name: booking.customer.name,
              amount: data.amount.toLocaleString('en-IN'),
              bookingNumber: booking.bookingNumber,
              receiptLink: receiptUrl,
              balance: Math.max(0, Number(booking.balanceAmount) - data.amount).toLocaleString('en-IN'),
            },
            deduplicationKey: `payment:${result.payment.id}:receipt`,
            customerId: auth.customerId,
            bookingId: booking.id,
            priority: 'high',
          })
        : Promise.resolve(),
    ]);

    return ok({
      success: true,
      receiptNumber: result.receiptNumber,
      paymentId: result.payment.id,
    });
  } catch (err) {
    return serverError(String(err));
  }
}

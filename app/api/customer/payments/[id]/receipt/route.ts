import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCustomerAuth } from '@/lib/customer';
import { notFound, serverError } from '@/lib/api-response';
import { generateReceiptHtml, type PaymentReceipt } from '@/lib/payment';

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/customer/payments/[id]/receipt — Download payment receipt
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireCustomerAuth();
    if (auth.error) return auth.error;

    const { id } = await context.params;

    const payment = await prisma.payment.findFirst({
      where: {
        id,
        status: { in: ['received', 'verified'] },
        booking: {
          customerId: auth.customerId,
          orgId: auth.orgId,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        receiptNumber: true,
        amount: true,
        mode: true,
        paymentDate: true,
        referenceNo: true,
        booking: {
          select: {
            bookingNumber: true,
            customer: { select: { name: true } },
            project: { select: { name: true } },
            plot: { select: { plotNumber: true } },
            flat: { select: { flatNumber: true } },
          },
        },
      },
    });

    if (!payment) return notFound('Payment receipt not found');

    const propertyDetail = payment.booking.plot
      ? `Plot ${payment.booking.plot.plotNumber}`
      : payment.booking.flat
        ? `Flat ${payment.booking.flat.flatNumber}`
        : 'N/A';

    const receiptData: PaymentReceipt = {
      receiptNumber: payment.receiptNumber || `RCP-${payment.id.slice(-8).toUpperCase()}`,
      amount: Number(payment.amount),
      currency: 'INR',
      paymentDate: new Date(payment.paymentDate).toLocaleDateString('en-IN'),
      mode: payment.mode.replace('_', ' ').toUpperCase(),
      referenceNo: payment.referenceNo || '',
      bookingNumber: payment.booking.bookingNumber,
      customerName: payment.booking.customer.name,
      projectName: payment.booking.project.name,
      propertyDetail,
    };

    const html = generateReceiptHtml(receiptData);

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="receipt-${receiptData.receiptNumber}.html"`,
      },
    });
  } catch (err) {
    return serverError(String(err));
  }
}

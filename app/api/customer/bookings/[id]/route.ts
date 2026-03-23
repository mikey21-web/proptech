import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCustomerAuth } from '@/lib/customer';
import { ok, notFound, serverError } from '@/lib/api-response';

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/customer/bookings/[id] — Single booking detail (customer-scoped)
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireCustomerAuth();
    if (auth.error) return auth.error;

    const { id } = await context.params;

    const booking = await prisma.booking.findFirst({
      where: {
        id,
        customerId: auth.customerId,
        orgId: auth.orgId,
        deletedAt: null,
      },
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
        project: {
          select: {
            id: true,
            name: true,
            type: true,
            city: true,
            state: true,
            address: true,
            reraNumber: true,
          },
        },
        plot: {
          select: {
            id: true,
            plotNumber: true,
            area: true,
            dimensions: true,
            facing: true,
            price: true,
          },
        },
        flat: {
          select: {
            id: true,
            flatNumber: true,
            floor: true,
            bedrooms: true,
            bathrooms: true,
            area: true,
            superArea: true,
            facing: true,
            price: true,
          },
        },
        agent: {
          select: {
            id: true,
            agentCode: true,
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
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
        loans: {
          select: {
            id: true,
            loanNumber: true,
            bankName: true,
            sanctionedAmount: true,
            disbursedAmount: true,
            interestRate: true,
            status: true,
          },
        },
      },
    });

    if (!booking) return notFound('Booking not found');

    // Get documents for this customer
    const documents = await prisma.customerDocument.findMany({
      where: { customerId: auth.customerId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        documentNo: true,
        fileName: true,
        fileSize: true,
        isVerified: true,
        verifiedAt: true,
        createdAt: true,
      },
    });

    // Calculate milestones
    const milestones = [
      {
        key: 'booking',
        label: 'Booking Created',
        done: true,
        date: booking.bookingDate,
        description: 'Booking initiated and token amount received',
      },
      {
        key: 'confirmed',
        label: 'Booking Confirmed',
        done: ['confirmed', 'agreement_signed', 'registration_done', 'possession_given'].includes(booking.status),
        date: booking.status !== 'pending' ? booking.updatedAt : null,
        description: 'Booking verified and confirmed by the team',
      },
      {
        key: 'agreement',
        label: 'Agreement Signed',
        done: ['agreement_signed', 'registration_done', 'possession_given'].includes(booking.status),
        date: booking.agreementDate,
        description: 'Sale agreement executed between buyer and builder',
      },
      {
        key: 'registration',
        label: 'Registration Done',
        done: ['registration_done', 'possession_given'].includes(booking.status),
        date: booking.registrationDate,
        description: 'Property registration at sub-registrar office',
      },
      {
        key: 'possession',
        label: 'Possession Given',
        done: booking.status === 'possession_given',
        date: booking.possessionDate,
        description: 'Keys handed over — congratulations!',
      },
    ];

    // Required document checklist
    const requiredDocs = [
      { type: 'aadhaar', label: 'Aadhaar Card', required: true },
      { type: 'pan', label: 'PAN Card', required: true },
      { type: 'photo', label: 'Passport Size Photo', required: true },
      { type: 'bank_statement', label: 'Bank Statement (6 months)', required: false },
      { type: 'salary_slip', label: 'Salary Slip (3 months)', required: false },
      { type: 'itr', label: 'Income Tax Return', required: false },
      { type: 'agreement', label: 'Signed Agreement', required: true },
    ];

    const documentChecklist = requiredDocs.map((req) => {
      const uploaded = documents.find((d) => d.type === req.type);
      return {
        ...req,
        uploaded: !!uploaded,
        verified: uploaded?.isVerified ?? false,
        document: uploaded ?? null,
      };
    });

    return ok({
      booking,
      milestones,
      documentChecklist,
      documents,
    });
  } catch (err) {
    return serverError(String(err));
  }
}

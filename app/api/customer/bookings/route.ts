import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCustomerAuth } from '@/lib/customer';
import { ok, serverError } from '@/lib/api-response';

// ---------------------------------------------------------------------------
// GET /api/customer/bookings — Customer's own bookings only
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const auth = await requireCustomerAuth();
    if (auth.error) return auth.error;

    const bookings = await prisma.booking.findMany({
      where: {
        customerId: auth.customerId,
        orgId: auth.orgId,
        deletedAt: null,
      },
      orderBy: { bookingDate: 'desc' },
      select: {
        id: true,
        bookingNumber: true,
        status: true,
        bookingDate: true,
        agreementDate: true,
        registrationDate: true,
        possessionDate: true,
        totalAmount: true,
        netAmount: true,
        paidAmount: true,
        balanceAmount: true,
        createdAt: true,
        project: {
          select: {
            id: true,
            name: true,
            type: true,
            city: true,
          },
        },
        plot: {
          select: {
            id: true,
            plotNumber: true,
            area: true,
            facing: true,
          },
        },
        flat: {
          select: {
            id: true,
            flatNumber: true,
            floor: true,
            bedrooms: true,
            area: true,
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
        _count: {
          select: {
            payments: true,
            installments: true,
          },
        },
      },
    });

    // Calculate progress for each booking
    const enriched = bookings.map((b) => {
      const milestones = [
        { key: 'booking', label: 'Booking', done: true },
        {
          key: 'confirmed',
          label: 'Confirmed',
          done: ['confirmed', 'agreement_signed', 'registration_done', 'possession_given'].includes(b.status),
        },
        {
          key: 'agreement',
          label: 'Agreement',
          done: ['agreement_signed', 'registration_done', 'possession_given'].includes(b.status),
          date: b.agreementDate,
        },
        {
          key: 'registration',
          label: 'Registration',
          done: ['registration_done', 'possession_given'].includes(b.status),
          date: b.registrationDate,
        },
        {
          key: 'possession',
          label: 'Possession',
          done: b.status === 'possession_given',
          date: b.possessionDate,
        },
      ];

      const completedSteps = milestones.filter((m) => m.done).length;
      const progressPercent = Math.round(
        (completedSteps / milestones.length) * 100,
      );

      const nextMilestone = milestones.find((m) => !m.done) || null;

      return {
        ...b,
        milestones,
        progressPercent,
        nextMilestone,
      };
    });

    return ok({ bookings: enriched });
  } catch (err) {
    return serverError(String(err));
  }
}

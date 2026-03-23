import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  getWizardSession,
  deleteWizardSession,
} from '@/lib/booking-wizard-session';
import { step7ConfirmSchema } from '@/lib/validations/booking-wizard';
import { queueWhatsAppMessage } from '@/lib/queue';
import { isExpiredBlock } from '@/lib/inventory-blocks';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth([
      'super_admin',
      'admin',
      'sales_manager',
      'backoffice',
      'agent',
    ]);
    if (!auth.authorized)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = auth.user!;

    const { sessionId, data } = await req.json();

    // Validate step 7 data
    const confirmData = step7ConfirmSchema.parse(data);

    // Get wizard session
    const wizardSession = await getWizardSession(sessionId);
    if (!wizardSession)
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 410 },
      );

    if (wizardSession.metadata?.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify all steps completed
    if (wizardSession.step !== 7)
      return NextResponse.json(
        { error: 'Must complete all steps before confirmation' },
        { status: 422 },
      );

    // Get plot with latest data
    const plot = await prisma.plot.findFirst({
      where: { id: wizardSession.plotId },
    });

    if (!plot)
      return NextResponse.json(
        { error: 'Plot is no longer available' },
        { status: 422 },
      );

    if (isExpiredBlock(plot.status, plot.blockedUntil)) {
      await prisma.plot.update({
        where: { id: wizardSession.plotId! },
        data: { status: 'available', blockedUntil: null, blockReason: null },
      });
      plot.status = 'available';
    }

    if (plot.status !== 'available') {
      return NextResponse.json(
        { error: 'Plot is no longer available' },
        { status: 422 },
      );
    }

    // Get or create customer
    const pricingData = (wizardSession as any).step4Data;
    const installmentData = (wizardSession as any).step5Data;
    const netAmount = pricingData.netAmount;
    const bookingNumber = `BK-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;

    const booking = await prisma.$transaction(async (tx) => {
      let customerId = wizardSession.customerId;
      if (!customerId) {
        const customerData = (wizardSession as any).step2Data;
        const customer = await tx.customer.create({
          data: {
            ...customerData,
            orgId: user.orgId,
          },
        });
        customerId = customer.id;
      }

      const createdBooking = await tx.booking.create({
        data: {
          bookingNumber,
          bookingDate: new Date(),
          totalAmount: pricingData.basePrice,
          discountAmount: pricingData.discountAmount || 0,
          netAmount,
          gstAmount: pricingData.gstAmount || 0,
          stampDuty: pricingData.stampDuty || 0,
          registrationFee: pricingData.registrationFee || 0,
          status: 'pending',
          remarks: confirmData.remarks,
          orgId: user.orgId,
          customerId,
          projectId: wizardSession.projectId,
          plotId: wizardSession.plotId!,
          agentId: confirmData.agentId,
          createdById: user.id,
        },
      });

      await tx.plot.update({
        where: { id: wizardSession.plotId! },
        data: { status: 'booked', blockedUntil: null, blockReason: null },
      });

      for (const installment of installmentData.installments) {
        await tx.installment.create({
          data: {
            bookingId: createdBooking.id,
            installmentNo: installment.installmentNo,
            amount: installment.amount,
            dueDate: new Date(installment.dueDate),
            status: 'upcoming',
          },
        });
      }

      if (confirmData.agentId) {
        const commissionStructure = await tx.commissionStructure.findFirst({
          where: {
            orgId: user.orgId,
            isDefault: true,
            deletedAt: null,
          },
        });

        if (commissionStructure) {
          const commissionRule = await tx.commissionRule.findFirst({
            where: {
              structureId: commissionStructure.id,
              minAmount: { lte: netAmount },
              OR: [{ maxAmount: null }, { maxAmount: { gte: netAmount } }],
            },
          });

          if (commissionRule) {
            const commissionAmount = commissionRule.percentage
              ? (Number(netAmount) * Number(commissionRule.percentage)) / 100
              : Number(commissionRule.flatAmount || 0);

            await tx.commission.create({
              data: {
                amount: commissionAmount,
                percentage: commissionRule.percentage,
                status: 'pending',
                agentId: confirmData.agentId,
                bookingId: createdBooking.id,
              },
            });
          }
        }
      }

      return createdBooking;
    });

    // Queue WhatsApp notifications (after transaction commit)
    const customerData = (wizardSession as any).step2Data || {};
    await queueWhatsAppMessage({
      to: customerData.phone || '0000000000',
      templateName: 'booking_confirmation',
      templateParams: {
        name: customerData.name || 'Customer',
        bookingNumber,
        property: `Plot ${plot.plotNumber}`,
        amount: String(netAmount),
        portalLink: process.env.NEXTAUTH_URL || '',
      },
      deduplicationKey: `booking:${booking.id}:created`,
      bookingId: booking.id,
    });

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'status_change',
        title: 'Booking Confirmed',
        description: `Booking ${bookingNumber} confirmed for plot ${plot.plotNumber}`,
        userId: user.id,
        metadata: {
          bookingId: booking.id,
          plotNumber: plot.plotNumber,
        },
      },
    });

    // Clean up wizard session
    await deleteWizardSession(sessionId);

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      bookingNumber,
      message: 'Booking confirmed successfully',
    });
  } catch (error: any) {
    console.error('Booking confirmation error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 },
      );
    }

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Booking number conflict, please try again' },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: 'Booking confirmation failed' },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth([
      'super_admin',
      'admin',
      'sales_manager',
      'backoffice',
      'agent',
    ]);
    if (!auth.authorized)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = auth.user!;

    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get('bookingId');

    if (!bookingId)
      return NextResponse.json(
        { error: 'Booking ID required' },
        { status: 400 },
      );

    // Get booking with all details
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        orgId: user.orgId,
        deletedAt: null,
      },
      include: {
        customer: true,
        plot: true,
        installments: true,
        payments: true,
        commissions: true,
      },
    });

    if (!booking)
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    return NextResponse.json(booking);
  } catch (error) {
    console.error('Fetch booking error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking' },
      { status: 500 },
    );
  }
}

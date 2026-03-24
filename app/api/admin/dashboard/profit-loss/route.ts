import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { requireAuth } = await import('@/lib/auth');
    const { prisma } = await import('@/lib/prisma');
    const { Decimal } = await import('@prisma/client/runtime/library');

    const auth = await requireAuth(['super_admin', 'admin', 'sales_manager']);
    if (!auth.authorized)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = auth.user!;

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : new Date();

    const orgId = user.orgId;

    const paymentsReceived = await prisma.payment.aggregate({
      where: {
        booking: { orgId },
        paymentDate: { gte: startDate, lte: endDate },
        status: 'received',
      },
      _sum: { amount: true },
    });

    const gstCollected = await prisma.booking.aggregate({
      where: { orgId, bookingDate: { gte: startDate, lte: endDate } },
      _sum: { gstAmount: true },
    });

    const totalPaymentsReceived = paymentsReceived._sum.amount || new Decimal(0);
    const totalGSTReceived = gstCollected._sum.gstAmount || new Decimal(0);
    const grossRevenue = totalPaymentsReceived.plus(totalGSTReceived);

    const discounts = await prisma.booking.aggregate({
      where: { orgId, bookingDate: { gte: startDate, lte: endDate } },
      _sum: { discountAmount: true },
    });

    const commissionsPaid = await prisma.commission.aggregate({
      where: {
        booking: { orgId },
        status: 'paid',
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    const totalDiscount = discounts._sum.discountAmount || new Decimal(0);
    const totalCommissionsPaid = commissionsPaid._sum.amount || new Decimal(0);
    const totalExpenses = totalDiscount.plus(totalCommissionsPaid);
    const netProfit = grossRevenue.minus(totalExpenses);
    const profitMargin =
      grossRevenue.toNumber() > 0
        ? (netProfit.toNumber() / grossRevenue.toNumber()) * 100
        : 0;

    const outstanding = await prisma.booking.aggregate({
      where: { orgId, bookingDate: { gte: startDate, lte: endDate } },
      _sum: { balanceAmount: true },
    });

    const outstandingAmount = outstanding._sum.balanceAmount || new Decimal(0);
    const cashFlow = totalPaymentsReceived.minus(totalExpenses);

    return NextResponse.json({
      period: `${startDate.toISOString()} to ${endDate.toISOString()}`,
      revenue: { totalPaymentsReceived, totalGSTReceived, grossRevenue },
      expenses: { totalDiscount, commissionsPaid: totalCommissionsPaid, totalExpenses },
      netProfit,
      profitMargin: parseFloat(profitMargin.toFixed(2)),
      outstandingAmount,
      cashFlow,
    });
  } catch (error) {
    console.error('P&L report error:', error);
    return NextResponse.json({ error: 'Failed to fetch P&L report' }, { status: 500 });
  }
}

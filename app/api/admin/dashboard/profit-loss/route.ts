import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface ProfitAndLossReport {
  period: string;
  revenue: {
    totalPaymentsReceived: Decimal;
    totalGSTReceived: Decimal;
    grossRevenue: Decimal;
  };
  expenses: {
    totalDiscount: Decimal;
    commissionsPaid: Decimal;
    totalExpenses: Decimal;
  };
  netProfit: Decimal;
  profitMargin: number; // percentage
  outstandingAmount: Decimal;
  cashFlow: Decimal;
}

export async function GET(req: NextRequest) {
  try {
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

    // Revenue: Total payments received
    const paymentsReceived = await prisma.payment.aggregate({
      where: {
        booking: { orgId },
        paymentDate: { gte: startDate, lte: endDate },
        status: 'received',
      },
      _sum: { amount: true },
    });

    // Revenue: Total GST collected
    const gstCollected = await prisma.booking.aggregate({
      where: {
        orgId,
        bookingDate: { gte: startDate, lte: endDate },
      },
      _sum: { gstAmount: true },
    });

    const totalPaymentsReceived =
      paymentsReceived._sum.amount || new Decimal(0);
    const totalGSTReceived = gstCollected._sum.gstAmount || new Decimal(0);
    const grossRevenue = totalPaymentsReceived.plus(totalGSTReceived);

    // Expenses: Total discounts given
    const discounts = await prisma.booking.aggregate({
      where: {
        orgId,
        bookingDate: { gte: startDate, lte: endDate },
      },
      _sum: { discountAmount: true },
    });

    // Expenses: Commissions paid out
    const commissionsPaid = await prisma.commission.aggregate({
      where: {
        booking: { orgId },
        status: 'paid',
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });

    const totalDiscount = discounts._sum.discountAmount || new Decimal(0);
    const totalCommissionsPaid =
      commissionsPaid._sum.amount || new Decimal(0);
    const totalExpenses = totalDiscount.plus(totalCommissionsPaid);

    // Net profit
    const netProfit = grossRevenue.minus(totalExpenses);

    // Profit margin
    const profitMargin =
      grossRevenue.toNumber() > 0
        ? (netProfit.toNumber() / grossRevenue.toNumber()) * 100
        : 0;

    // Outstanding amount (receivable)
    const outstanding = await prisma.booking.aggregate({
      where: {
        orgId,
        bookingDate: { gte: startDate, lte: endDate },
      },
      _sum: { balanceAmount: true },
    });

    const outstandingAmount =
      outstanding._sum.balanceAmount || new Decimal(0);

    // Cash flow (received - expenses)
    const cashFlow = totalPaymentsReceived.minus(totalExpenses);

    const report: ProfitAndLossReport = {
      period: `${startDate.toISOString()} to ${endDate.toISOString()}`,
      revenue: {
        totalPaymentsReceived,
        totalGSTReceived,
        grossRevenue,
      },
      expenses: {
        totalDiscount,
        commissionsPaid: totalCommissionsPaid,
        totalExpenses,
      },
      netProfit,
      profitMargin: parseFloat(profitMargin.toFixed(2)),
      outstandingAmount,
      cashFlow,
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error('P&L report error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch P&L report' },
      { status: 500 },
    );
  }
}

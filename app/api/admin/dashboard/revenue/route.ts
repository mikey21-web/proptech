import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

export const dynamic = 'force-dynamic';

interface RevenueReport {
  period: string;
  totalRevenue: Decimal;
  byAgent: Array<{
    agentId: string;
    agentName: string;
    bookings: number;
    revenue: Decimal;
  }>;
  byProject: Array<{
    projectId: string;
    projectName: string;
    bookings: number;
    revenue: Decimal;
  }>;
  daily: Array<{
    date: string;
    revenue: Decimal;
    bookings: number;
  }>;
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

    // Total revenue
    const totalRevenue = await prisma.payment.aggregate({
      where: {
        booking: { orgId },
        paymentDate: { gte: startDate, lte: endDate },
        status: 'received',
      },
      _sum: { amount: true },
    });

    // Revenue by agent
    const agentRevenue = await prisma.agent.findMany({
      where: {
        orgId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        user: true,
        bookings: {
          where: {
            bookingDate: { gte: startDate, lte: endDate },
          },
        },
      },
    });

    const byAgent = await Promise.all(
      agentRevenue.map(async (agent) => {
        const revenue = await prisma.payment.aggregate({
          where: {
            booking: { agentId: agent.id },
            paymentDate: { gte: startDate, lte: endDate },
            status: 'received',
          },
          _sum: { amount: true },
        });

        return {
          agentId: agent.id,
          agentName: agent.user.name,
          bookings: agent.bookings.length,
          revenue: revenue._sum.amount || new Decimal(0),
        };
      }),
    );

    // Revenue by project
    const projects = await prisma.project.findMany({
      where: {
        orgId,
        deletedAt: null,
      },
    });

    const byProject = await Promise.all(
      projects.map(async (project) => {
        const bookings = await prisma.booking.count({
          where: {
            projectId: project.id,
            bookingDate: { gte: startDate, lte: endDate },
          },
        });

        const revenue = await prisma.payment.aggregate({
          where: {
            booking: {
              projectId: project.id,
            },
            paymentDate: { gte: startDate, lte: endDate },
            status: 'received',
          },
          _sum: { amount: true },
        });

        return {
          projectId: project.id,
          projectName: project.name,
          bookings,
          revenue: revenue._sum.amount || new Decimal(0),
        };
      }),
    );

    // Daily revenue
    const dailyPayments = await prisma.payment.groupBy({
      by: ['paymentDate'],
      where: {
        booking: { orgId },
        paymentDate: { gte: startDate, lte: endDate },
        status: 'received',
      },
      _sum: { amount: true },
      _count: true,
      orderBy: { paymentDate: 'asc' },
    });

    const daily = dailyPayments.map((p) => ({
      date: p.paymentDate.toISOString().split('T')[0],
      revenue: p._sum.amount || new Decimal(0),
      bookings: p._count,
    }));

    const report: RevenueReport = {
      period: `${startDate.toISOString()} to ${endDate.toISOString()}`,
      totalRevenue: totalRevenue._sum.amount || new Decimal(0),
      byAgent: byAgent.sort((a, b) => b.revenue.cmp(a.revenue)),
      byProject: byProject.sort((a, b) => b.revenue.cmp(a.revenue)),
      daily,
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error('Revenue report error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revenue report' },
      { status: 500 },
    );
  }
}

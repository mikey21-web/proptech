import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { ok, unauthorized, forbidden, serverError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// GET /api/admin/dashboard — Executive dashboard KPIs & data
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(['super_admin', 'admin']);
    if (!auth.authorized) {
      return auth.status === 401
        ? unauthorized(auth.error)
        : forbidden(auth.error);
    }
    const user = auth.user!;
    const orgId = user.orgId;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Parallel data fetches
    const [
      totalRevenue,
      monthRevenue,
      lastMonthRevenue,
      totalBookings,
      monthBookings,
      totalLeads,
      convertedLeads,
      agentCount,
      activeAgentCount,
      projectCount,
      recentBookings,
      topAgents,
      leadsByStatus,
      projectInventory,
      monthlyRevenueRaw,
      totalOutstanding,
    ] = await Promise.all([
      // Total revenue = sum of confirmed payments (not booking value)
      prisma.payment.aggregate({
        where: { booking: { orgId, deletedAt: null }, status: 'received', deletedAt: null },
        _sum: { amount: true },
      }),
      // This month revenue = payments received this month
      prisma.payment.aggregate({
        where: {
          booking: { orgId, deletedAt: null },
          status: 'received',
          deletedAt: null,
          paymentDate: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      // Last month revenue = payments received last month
      prisma.payment.aggregate({
        where: {
          booking: { orgId, deletedAt: null },
          status: 'received',
          deletedAt: null,
          paymentDate: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
        _sum: { amount: true },
      }),
      // Total bookings
      prisma.booking.count({
        where: { orgId, deletedAt: null, status: { notIn: ['cancelled', 'refunded'] } },
      }),
      // This month bookings
      prisma.booking.count({
        where: {
          orgId,
          deletedAt: null,
          status: { notIn: ['cancelled', 'refunded'] },
          bookingDate: { gte: startOfMonth },
        },
      }),
      // Total leads
      prisma.lead.count({ where: { orgId, deletedAt: null } }),
      // Converted leads
      prisma.lead.count({ where: { orgId, deletedAt: null, status: 'won' } }),
      // All agents
      prisma.agent.count({ where: { orgId, deletedAt: null } }),
      // Active agents
      prisma.agent.count({ where: { orgId, deletedAt: null, isActive: true } }),
      // Projects
      prisma.project.count({ where: { orgId, deletedAt: null } }),
      // Recent 10 bookings
      prisma.booking.findMany({
        where: { orgId, deletedAt: null },
        orderBy: { bookingDate: 'desc' },
        take: 10,
        select: {
          id: true,
          bookingNumber: true,
          status: true,
          bookingDate: true,
          netAmount: true,
          customer: { select: { name: true, phone: true } },
          project: { select: { name: true } },
          agent: { select: { user: { select: { name: true } } } },
          plot: { select: { plotNumber: true } },
          flat: { select: { flatNumber: true } },
        },
      }),
      // Top agents (this month by booking count)
      prisma.agent.findMany({
        where: { orgId, deletedAt: null, isActive: true },
        select: {
          id: true,
          agentCode: true,
          user: { select: { name: true, image: true } },
          bookings: {
            where: {
              deletedAt: null,
              status: { notIn: ['cancelled', 'refunded'] },
              bookingDate: { gte: startOfMonth },
            },
            select: { netAmount: true },
          },
          commissions: {
            where: { status: 'paid' },
            select: { amount: true },
          },
        },
      }),
      // Leads by status (for funnel)
      prisma.lead.groupBy({
        by: ['status'],
        where: { orgId, deletedAt: null },
        _count: true,
      }),
      // Project inventory
      prisma.project.findMany({
        where: { orgId, deletedAt: null },
        select: {
          id: true,
          name: true,
          status: true,
          totalUnits: true,
          plots: {
            where: { deletedAt: null },
            select: { status: true, price: true },
          },
          flats: {
            where: { deletedAt: null },
            select: { status: true, price: true },
          },
        },
      }),
      // Monthly revenue (last 12 months) — based on actual payments
      prisma.payment.findMany({
        where: {
          booking: { orgId, deletedAt: null },
          status: 'received',
          deletedAt: null,
          paymentDate: {
            gte: new Date(now.getFullYear() - 1, now.getMonth(), 1),
          },
        },
        select: { paymentDate: true, amount: true },
      }),
      // Outstanding balance = sum of balanceAmount on active bookings
      prisma.booking.aggregate({
        where: { orgId, deletedAt: null, status: { notIn: ['cancelled', 'refunded'] } },
        _sum: { balanceAmount: true },
      }),
    ]);

    // Process top agents
    const agentLeaderboard = topAgents
      .map((a) => ({
        id: a.id,
        name: a.user.name,
        image: a.user.image,
        agentCode: a.agentCode,
        bookingsThisMonth: a.bookings.length,
        revenueThisMonth: a.bookings.reduce((s, b) => s + Number(b.netAmount), 0),
        totalCommission: a.commissions.reduce((s, c) => s + Number(c.amount), 0),
      }))
      .sort((a, b) => b.revenueThisMonth - a.revenueThisMonth)
      .slice(0, 10);

    // Process lead funnel
    const funnelOrder = ['new', 'contacted', 'qualified', 'negotiation', 'site_visit', 'proposal_sent', 'won', 'lost', 'junk'] as const;
    const statusCounts = new Map(leadsByStatus.map((s) => [s.status, s._count]));
    const leadFunnel = funnelOrder.map((status) => ({
      status: status as string,
      count: statusCounts.get(status as any) || 0,
    }));

    // Process monthly revenue (from actual payments, not bookings)
    const revenueByMonth = new Map<string, number>();
    monthlyRevenueRaw.forEach((p) => {
      const d = p.paymentDate;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      revenueByMonth.set(key, (revenueByMonth.get(key) || 0) + Number(p.amount));
    });

    // Generate 12 months of data
    const revenueChart: Array<{ month: string; revenue: number; target: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      revenueChart.push({
        month: key,
        revenue: revenueByMonth.get(key) || 0,
        target: 1_00_00_000, // Default target: 1 Cr/month
      });
    }

    // Process project inventory
    const inventory = projectInventory.map((p) => {
      const allUnits = [...p.plots, ...p.flats];
      return {
        id: p.id,
        name: p.name,
        status: p.status,
        totalUnits: p.totalUnits || allUnits.length,
        available: allUnits.filter((u) => u.status === 'available').length,
        booked: allUnits.filter((u) => u.status === 'booked').length,
        sold: allUnits.filter((u) => u.status === 'sold').length,
        blocked: allUnits.filter((u) => u.status === 'blocked').length,
        avgPrice:
          allUnits.length > 0
            ? allUnits.reduce((s, u) => s + Number(u.price), 0) / allUnits.length
            : 0,
      };
    });

    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    return ok({
      kpis: {
        totalRevenue: Number(totalRevenue._sum.amount || 0),
        monthRevenue: Number(monthRevenue._sum.amount || 0),
        lastMonthRevenue: Number(lastMonthRevenue._sum.amount || 0),
        totalOutstanding: Number(totalOutstanding._sum.balanceAmount || 0),
        totalBookings,
        monthBookings,
        totalLeads,
        convertedLeads,
        conversionRate,
        agentCount,
        activeAgentCount,
        projectCount,
      },
      revenueChart,
      leadFunnel,
      agentLeaderboard,
      recentBookings,
      inventory,
    });
  } catch (err) {
    return serverError(String(err));
  }
}

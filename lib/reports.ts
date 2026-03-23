/**
 * Report generation & export utilities
 * Provides server-side report data aggregation and client-side export helpers.
 */

import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DateRange {
  from: string; // ISO date
  to: string;   // ISO date
}

export interface LeadReportData {
  totalLeads: number;
  newLeads: number;
  convertedLeads: number;
  lostLeads: number;
  conversionRate: number;
  sourceBreakdown: Array<{ source: string; count: number; percentage: number }>;
  statusBreakdown: Array<{ status: string; count: number; percentage: number }>;
  priorityBreakdown: Array<{ priority: string; count: number }>;
  lostReasons: Array<{ reason: string; count: number }>;
  monthlyTrend: Array<{ month: string; leads: number; converted: number }>;
}

export interface BookingReportData {
  totalBookings: number;
  avgBookingValue: number;
  totalRevenue: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentCollectionRate: number;
  statusBreakdown: Array<{ status: string; count: number; amount: number }>;
  monthlyTrend: Array<{ month: string; bookings: number; revenue: number }>;
  projectBreakdown: Array<{ project: string; bookings: number; revenue: number }>;
}

export interface AgentReportData {
  totalAgents: number;
  activeAgents: number;
  agents: Array<{
    id: string;
    name: string;
    agentCode: string;
    bookings: number;
    revenue: number;
    conversionRate: number;
    commissionEarned: number;
    commissionPending: number;
  }>;
}

export interface FinancialReportData {
  totalRevenue: number;
  revenueTarget: number;
  collectedAmount: number;
  outstandingAmount: number;
  overdueAmount: number;
  refundedAmount: number;
  commissionPaid: number;
  commissionPending: number;
  monthlyRevenue: Array<{ month: string; revenue: number; collected: number; target: number }>;
  paymentModeBreakdown: Array<{ mode: string; count: number; amount: number }>;
}

export interface ProjectReportData {
  projects: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    totalUnits: number;
    availableUnits: number;
    bookedUnits: number;
    soldUnits: number;
    blockedUnits: number;
    totalRevenue: number;
    avgPricePerSqft: number;
    absorptionRate: number;
  }>;
}

// ---------------------------------------------------------------------------
// Report generators (server-side)
// ---------------------------------------------------------------------------

export async function generateLeadReport(
  orgId: string,
  dateRange?: DateRange,
): Promise<LeadReportData> {
  const dateFilter: Prisma.LeadWhereInput = {};
  if (dateRange) {
    dateFilter.createdAt = {
      gte: new Date(dateRange.from),
      lte: new Date(dateRange.to),
    };
  }

  const where: Prisma.LeadWhereInput = {
    orgId,
    deletedAt: null,
    ...dateFilter,
  };

  const [
    totalLeads,
    newLeads,
    convertedLeads,
    lostLeads,
    allLeads,
  ] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.count({ where: { ...where, status: 'new' } }),
    prisma.lead.count({ where: { ...where, status: 'won' } }),
    prisma.lead.count({ where: { ...where, status: 'lost' } }),
    prisma.lead.findMany({
      where,
      select: {
        status: true,
        priority: true,
        source: true,
        notes: true,
        createdAt: true,
      },
    }),
  ]);

  // Source breakdown
  const sourceMap = new Map<string, number>();
  allLeads.forEach((l) => {
    const src = l.source || 'Unknown';
    sourceMap.set(src, (sourceMap.get(src) || 0) + 1);
  });
  const sourceBreakdown = Array.from(sourceMap.entries())
    .map(([source, count]) => ({
      source,
      count,
      percentage: totalLeads > 0 ? (count / totalLeads) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Status breakdown
  const statusMap = new Map<string, number>();
  allLeads.forEach((l) => statusMap.set(l.status, (statusMap.get(l.status) || 0) + 1));
  const statusBreakdown = Array.from(statusMap.entries())
    .map(([status, count]) => ({
      status,
      count,
      percentage: totalLeads > 0 ? (count / totalLeads) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Priority breakdown
  const priorityMap = new Map<string, number>();
  allLeads.forEach((l) => priorityMap.set(l.priority, (priorityMap.get(l.priority) || 0) + 1));
  const priorityBreakdown = Array.from(priorityMap.entries())
    .map(([priority, count]) => ({ priority, count }));

  // Monthly trend
  const monthMap = new Map<string, { leads: number; converted: number }>();
  allLeads.forEach((l) => {
    const key = `${l.createdAt.getFullYear()}-${String(l.createdAt.getMonth() + 1).padStart(2, '0')}`;
    const entry = monthMap.get(key) || { leads: 0, converted: 0 };
    entry.leads++;
    if (l.status === 'won') entry.converted++;
    monthMap.set(key, entry);
  });
  const monthlyTrend = Array.from(monthMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    totalLeads,
    newLeads,
    convertedLeads,
    lostLeads,
    conversionRate: totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0,
    sourceBreakdown,
    statusBreakdown,
    priorityBreakdown,
    lostReasons: [], // Would need a dedicated field; placeholder
    monthlyTrend,
  };
}

export async function generateBookingReport(
  orgId: string,
  dateRange?: DateRange,
): Promise<BookingReportData> {
  const dateFilter: Prisma.BookingWhereInput = {};
  if (dateRange) {
    dateFilter.bookingDate = {
      gte: new Date(dateRange.from),
      lte: new Date(dateRange.to),
    };
  }

  const where: Prisma.BookingWhereInput = {
    orgId,
    deletedAt: null,
    ...dateFilter,
  };

  const bookings = await prisma.booking.findMany({
    where,
    select: {
      status: true,
      totalAmount: true,
      netAmount: true,
      paidAmount: true,
      balanceAmount: true,
      bookingDate: true,
      project: { select: { name: true } },
    },
  });

  const totalBookings = bookings.length;
  const totalRevenue = bookings.reduce((s, b) => s + Number(b.netAmount), 0);
  const paidAmount = bookings.reduce((s, b) => s + Number(b.paidAmount), 0);
  const outstandingAmount = bookings.reduce((s, b) => s + Number(b.balanceAmount), 0);
  const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;
  const paymentCollectionRate = totalRevenue > 0 ? (paidAmount / totalRevenue) * 100 : 0;

  // Status breakdown
  const statusMap = new Map<string, { count: number; amount: number }>();
  bookings.forEach((b) => {
    const entry = statusMap.get(b.status) || { count: 0, amount: 0 };
    entry.count++;
    entry.amount += Number(b.netAmount);
    statusMap.set(b.status, entry);
  });
  const statusBreakdown = Array.from(statusMap.entries())
    .map(([status, data]) => ({ status, ...data }));

  // Monthly trend
  const monthMap = new Map<string, { bookings: number; revenue: number }>();
  bookings.forEach((b) => {
    const d = b.bookingDate;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const entry = monthMap.get(key) || { bookings: 0, revenue: 0 };
    entry.bookings++;
    entry.revenue += Number(b.netAmount);
    monthMap.set(key, entry);
  });
  const monthlyTrend = Array.from(monthMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Project breakdown
  const projMap = new Map<string, { bookings: number; revenue: number }>();
  bookings.forEach((b) => {
    const pName = b.project?.name || 'Unknown';
    const entry = projMap.get(pName) || { bookings: 0, revenue: 0 };
    entry.bookings++;
    entry.revenue += Number(b.netAmount);
    projMap.set(pName, entry);
  });
  const projectBreakdown = Array.from(projMap.entries())
    .map(([project, data]) => ({ project, ...data }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    totalBookings,
    avgBookingValue,
    totalRevenue,
    paidAmount,
    outstandingAmount,
    paymentCollectionRate,
    statusBreakdown,
    monthlyTrend,
    projectBreakdown,
  };
}

export async function generateAgentReport(
  orgId: string,
  dateRange?: DateRange,
): Promise<AgentReportData> {
  const agents = await prisma.agent.findMany({
    where: { orgId, deletedAt: null },
    select: {
      id: true,
      agentCode: true,
      isActive: true,
      user: { select: { name: true } },
      bookings: {
        where: {
          deletedAt: null,
          ...(dateRange
            ? {
                bookingDate: {
                  gte: new Date(dateRange.from),
                  lte: new Date(dateRange.to),
                },
              }
            : {}),
        },
        select: { netAmount: true },
      },
      commissions: {
        where: dateRange
          ? {
              createdAt: {
                gte: new Date(dateRange.from),
                lte: new Date(dateRange.to),
              },
            }
          : {},
        select: { amount: true, status: true },
      },
    },
  });

  // For conversion rate, count leads assigned to each agent
  const agentUserIds = agents.map((a) => a.id);
  const leadCounts = await prisma.lead.groupBy({
    by: ['assignedToId'],
    where: {
      orgId,
      deletedAt: null,
      ...(dateRange
        ? {
            createdAt: {
              gte: new Date(dateRange.from),
              lte: new Date(dateRange.to),
            },
          }
        : {}),
    },
    _count: true,
  });

  const wonLeadCounts = await prisma.lead.groupBy({
    by: ['assignedToId'],
    where: {
      orgId,
      deletedAt: null,
      status: 'won',
      ...(dateRange
        ? {
            createdAt: {
              gte: new Date(dateRange.from),
              lte: new Date(dateRange.to),
            },
          }
        : {}),
    },
    _count: true,
  });

  const leadMap = new Map(leadCounts.map((l) => [l.assignedToId, l._count]));
  const wonMap = new Map(wonLeadCounts.map((l) => [l.assignedToId, l._count]));

  const agentData = agents.map((a) => {
    const revenue = a.bookings.reduce((s, b) => s + Number(b.netAmount), 0);
    const commissionEarned = a.commissions
      .filter((c) => c.status === 'paid')
      .reduce((s, c) => s + Number(c.amount), 0);
    const commissionPending = a.commissions
      .filter((c) => c.status === 'pending' || c.status === 'approved')
      .reduce((s, c) => s + Number(c.amount), 0);
    const totalLeads = leadMap.get(a.id) || 0;
    const wonLeads = wonMap.get(a.id) || 0;

    return {
      id: a.id,
      name: a.user.name,
      agentCode: a.agentCode,
      bookings: a.bookings.length,
      revenue,
      conversionRate: totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0,
      commissionEarned,
      commissionPending,
    };
  });

  return {
    totalAgents: agents.length,
    activeAgents: agents.filter((a) => a.isActive).length,
    agents: agentData.sort((a, b) => b.revenue - a.revenue),
  };
}

export async function generateFinancialReport(
  orgId: string,
  dateRange?: DateRange,
): Promise<FinancialReportData> {
  const bookingWhere: Prisma.BookingWhereInput = {
    orgId,
    deletedAt: null,
    ...(dateRange
      ? {
          bookingDate: {
            gte: new Date(dateRange.from),
            lte: new Date(dateRange.to),
          },
        }
      : {}),
  };

  const [bookings, payments, refunds, commissions] = await Promise.all([
    prisma.booking.findMany({
      where: bookingWhere,
      select: {
        netAmount: true,
        paidAmount: true,
        balanceAmount: true,
        bookingDate: true,
      },
    }),
    prisma.payment.findMany({
      where: {
        booking: bookingWhere,
        deletedAt: null,
        status: 'received',
      },
      select: { amount: true, mode: true },
    }),
    prisma.refund.findMany({
      where: {
        booking: bookingWhere,
        status: 'completed',
      },
      select: { amount: true },
    }),
    prisma.commission.findMany({
      where: {
        booking: bookingWhere,
      },
      select: { amount: true, status: true },
    }),
  ]);

  // totalRevenue = total booking value (net), collectedAmount = actual payments received
  const totalRevenue = bookings.reduce((s, b) => s + Number(b.netAmount), 0);
  const collectedAmount = payments.reduce((s, p) => s + Number(p.amount), 0);
  const outstandingAmount = bookings.reduce((s, b) => s + Number(b.balanceAmount), 0);
  const refundedAmount = refunds.reduce((s, r) => s + Number(r.amount), 0);
  const commissionPaid = commissions
    .filter((c) => c.status === 'paid')
    .reduce((s, c) => s + Number(c.amount), 0);
  const commissionPending = commissions
    .filter((c) => c.status === 'pending' || c.status === 'approved')
    .reduce((s, c) => s + Number(c.amount), 0);

  // Calculate overdue from installments
  const overdueInstallments = await prisma.installment.findMany({
    where: {
      booking: bookingWhere,
      status: 'overdue',
    },
    select: { amount: true, paidAmount: true },
  });
  const overdueAmount = overdueInstallments.reduce(
    (s, i) => s + Number(i.amount) - Number(i.paidAmount),
    0,
  );

  // Monthly revenue
  const monthMap = new Map<string, { revenue: number; collected: number }>();
  bookings.forEach((b) => {
    const d = b.bookingDate;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const entry = monthMap.get(key) || { revenue: 0, collected: 0 };
    entry.revenue += Number(b.netAmount);
    entry.collected += Number(b.paidAmount);
    monthMap.set(key, entry);
  });
  const monthlyRevenue = Array.from(monthMap.entries())
    .map(([month, data]) => ({ month, ...data, target: 0 }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Payment mode breakdown
  const modeMap = new Map<string, { count: number; amount: number }>();
  payments.forEach((p) => {
    const entry = modeMap.get(p.mode) || { count: 0, amount: 0 };
    entry.count++;
    entry.amount += Number(p.amount);
    modeMap.set(p.mode, entry);
  });
  const paymentModeBreakdown = Array.from(modeMap.entries())
    .map(([mode, data]) => ({ mode, ...data }))
    .sort((a, b) => b.amount - a.amount);

  return {
    totalRevenue,
    revenueTarget: 0, // Set from org configuration
    collectedAmount,
    outstandingAmount,
    overdueAmount,
    refundedAmount,
    commissionPaid,
    commissionPending,
    monthlyRevenue,
    paymentModeBreakdown,
  };
}

export async function generateProjectReport(
  orgId: string,
): Promise<ProjectReportData> {
  const projects = await prisma.project.findMany({
    where: { orgId, deletedAt: null },
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      totalUnits: true,
      plots: {
        where: { deletedAt: null },
        select: { status: true, price: true, pricePerSqft: true, area: true },
      },
      flats: {
        where: { deletedAt: null },
        select: { status: true, price: true, pricePerSqft: true, area: true },
      },
      bookings: {
        where: { deletedAt: null },
        select: { netAmount: true },
      },
    },
  });

  const projectData = projects.map((p) => {
    const allUnits = [...p.plots, ...p.flats];
    const totalUnits = p.totalUnits || allUnits.length;
    const availableUnits = allUnits.filter((u) => u.status === 'available').length;
    const bookedUnits = allUnits.filter((u) => u.status === 'booked').length;
    const soldUnits = allUnits.filter((u) => u.status === 'sold').length;
    const blockedUnits = allUnits.filter((u) => u.status === 'blocked').length;
    const totalRevenue = p.bookings.reduce((s, b) => s + Number(b.netAmount), 0);

    const pricesPerSqft = allUnits
      .filter((u) => u.pricePerSqft)
      .map((u) => Number(u.pricePerSqft));
    const avgPricePerSqft =
      pricesPerSqft.length > 0
        ? pricesPerSqft.reduce((s, p) => s + p, 0) / pricesPerSqft.length
        : 0;

    const absorbedUnits = bookedUnits + soldUnits;
    const absorptionRate = totalUnits > 0 ? (absorbedUnits / totalUnits) * 100 : 0;

    return {
      id: p.id,
      name: p.name,
      type: p.type,
      status: p.status,
      totalUnits,
      availableUnits,
      bookedUnits,
      soldUnits,
      blockedUnits,
      totalRevenue,
      avgPricePerSqft,
      absorptionRate,
    };
  });

  return { projects: projectData };
}

// ---------------------------------------------------------------------------
// CSV export helper (client-side)
// ---------------------------------------------------------------------------

export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h];
      const str = String(val ?? '');
      return str.includes(',') ? `"${str}"` : str;
    }).join(','),
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

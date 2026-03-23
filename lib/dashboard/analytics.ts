import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

export interface DashboardMetrics {
  leadsThisMonth: number;
  bookingsThisMonth: number;
  amountReceivedThisMonth: Decimal;
  callsThisMonth: number;
  tasksCompletedThisMonth: number;
  overdueLead: number;
  pendingCommissions: Decimal;
  totalOutstandingBalance: Decimal;
}

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  leadsAssigned: number;
  callsMade: number;
  siteVisitsScheduled: number;
  bookingsClosedThisMonth: number;
  revenueGeneratedThisMonth: Decimal;
  commissionEarned: Decimal;
  commissionPending: Decimal;
}

export interface FinancialReport {
  period: string;
  totalBookingAmount: Decimal;
  totalPaymentsReceived: Decimal;
  totalOutstanding: Decimal;
  totalDiscount: Decimal;
  totalGST: Decimal;
  totalRegistrationFees: Decimal;
  netRevenue: Decimal;
  averageBookingAmount: Decimal;
}

export interface PaymentAnalytics {
  totalBookings: number;
  paidBookings: number;
  partiallyPaidBookings: number;
  unpaidBookings: number;
  outstandingBalance: Decimal;
  overdueBalance: Decimal;
  daysOverdueDistribution: {
    '0-7': number;
    '7-30': number;
    '30+': number;
  };
}

export interface CommissionReport {
  period: string;
  totalCommissionAmount: Decimal;
  pendingCommission: Decimal;
  approvedCommission: Decimal;
  paidCommission: Decimal;
  clawedBackCommission: Decimal;
  topAgentId: string;
  topAgentName: string;
  topAgentCommission: Decimal;
}

/**
 * Get dashboard overview metrics
 */
export async function getDashboardMetrics(
  orgId: string,
  month: Date = new Date(),
): Promise<DashboardMetrics> {
  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  // Leads this month
  const leadsThisMonth = await prisma.lead.count({
    where: {
      orgId,
      createdAt: { gte: startOfMonth, lte: endOfMonth },
    },
  });

  // Bookings this month
  const bookingsThisMonth = await prisma.booking.count({
    where: {
      orgId,
      bookingDate: { gte: startOfMonth, lte: endOfMonth },
      status: 'confirmed',
    },
  });

  // Amount received this month
  const amountReceived = await prisma.payment.aggregate({
    where: {
      booking: { orgId },
      paymentDate: { gte: startOfMonth, lte: endOfMonth },
      status: 'received',
    },
    _sum: { amount: true },
  });

  // Calls this month
  const callsThisMonth = await prisma.communication.count({
    where: {
      lead: { orgId },
      type: 'call',
      createdAt: { gte: startOfMonth, lte: endOfMonth },
    },
  });

  // Tasks completed this month
  const tasksCompletedThisMonth = await prisma.task.count({
    where: {
      lead: { orgId },
      status: 'completed',
      completedAt: { gte: startOfMonth, lte: endOfMonth },
    },
  });

  // Overdue installments
  const now = new Date();
  const overdueInstallments = await prisma.installment.count({
    where: {
      booking: { orgId },
      dueDate: { lt: now },
      status: { in: ['due', 'overdue'] },
    },
  });

  // Pending commissions
  const pendingCommissions = await prisma.commission.aggregate({
    where: {
      booking: { orgId },
      status: 'pending',
    },
    _sum: { amount: true },
  });

  // Total outstanding balance
  const totalOutstanding = await prisma.booking.aggregate({
    where: {
      orgId,
      status: { in: ['pending', 'confirmed'] },
    },
    _sum: { balanceAmount: true },
  });

  return {
    leadsThisMonth,
    bookingsThisMonth,
    amountReceivedThisMonth: amountReceived._sum.amount || new Decimal(0),
    callsThisMonth,
    tasksCompletedThisMonth,
    overdueLead: overdueInstallments,
    pendingCommissions: pendingCommissions._sum.amount || new Decimal(0),
    totalOutstandingBalance: totalOutstanding._sum.balanceAmount || new Decimal(0),
  };
}

/**
 * Get agent performance metrics
 */
export async function getAgentPerformance(
  orgId: string,
  month: Date = new Date(),
): Promise<AgentPerformance[]> {
  const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  const agents = await prisma.agent.findMany({
    where: {
      orgId,
      isActive: true,
      deletedAt: null,
    },
    include: {
      user: true,
      bookings: true,
      commissions: true,
    },
  });

  const performance: AgentPerformance[] = [];

  for (const agent of agents) {
    // Leads assigned
    const leadsAssigned = await prisma.lead.count({
      where: {
        orgId,
        assignedToId: agent.userId,
      },
    });

    // Calls made
    const callsMade = await prisma.communication.count({
      where: {
        user: { id: agent.userId },
        type: 'call',
      },
    });

    // Site visits
    const siteVisitsScheduled = await prisma.communication.count({
      where: {
        user: { id: agent.userId },
        type: 'site_visit',
      },
    });

    // Bookings this month
    const bookingsClosedThisMonth = await prisma.booking.count({
      where: {
        agentId: agent.id,
        bookingDate: { gte: startOfMonth, lte: endOfMonth },
        status: 'confirmed',
      },
    });

    // Revenue this month
    const revenueThisMonth = await prisma.payment.aggregate({
      where: {
        booking: { agentId: agent.id },
        paymentDate: { gte: startOfMonth, lte: endOfMonth },
        status: 'received',
      },
      _sum: { amount: true },
    });

    // Commission earned (all time)
    const commissionEarned = await prisma.commission.aggregate({
      where: {
        agentId: agent.id,
        status: { in: ['approved', 'paid'] },
      },
      _sum: { amount: true },
    });

    // Commission pending
    const commissionPending = await prisma.commission.aggregate({
      where: {
        agentId: agent.id,
        status: 'pending',
      },
      _sum: { amount: true },
    });

    performance.push({
      agentId: agent.id,
      agentName: agent.user.name,
      leadsAssigned,
      callsMade,
      siteVisitsScheduled,
      bookingsClosedThisMonth,
      revenueGeneratedThisMonth: revenueThisMonth._sum.amount || new Decimal(0),
      commissionEarned: commissionEarned._sum.amount || new Decimal(0),
      commissionPending: commissionPending._sum.amount || new Decimal(0),
    });
  }

  return performance.sort((a, b) =>
    b.revenueGeneratedThisMonth.toNumber() - a.revenueGeneratedThisMonth.toNumber(),
  );
}

/**
 * Get financial report for period
 */
export async function getFinancialReport(
  orgId: string,
  startDate: Date,
  endDate: Date,
): Promise<FinancialReport> {
  // Total booking amount
  const totalBookingAmount = await prisma.booking.aggregate({
    where: {
      orgId,
      bookingDate: { gte: startDate, lte: endDate },
    },
    _sum: { totalAmount: true },
  });

  // Total payments received
  const totalPaymentsReceived = await prisma.payment.aggregate({
    where: {
      booking: { orgId },
      paymentDate: { gte: startDate, lte: endDate },
      status: 'received',
    },
    _sum: { amount: true },
  });

  // Total outstanding
  const totalOutstanding = await prisma.booking.aggregate({
    where: {
      orgId,
      bookingDate: { gte: startDate, lte: endDate },
    },
    _sum: { balanceAmount: true },
  });

  // Total discounts
  const totalDiscounts = await prisma.booking.aggregate({
    where: {
      orgId,
      bookingDate: { gte: startDate, lte: endDate },
    },
    _sum: { discountAmount: true },
  });

  // Total GST
  const totalGST = await prisma.booking.aggregate({
    where: {
      orgId,
      bookingDate: { gte: startDate, lte: endDate },
    },
    _sum: { gstAmount: true },
  });

  // Total registration fees
  const totalRegistrationFees = await prisma.booking.aggregate({
    where: {
      orgId,
      bookingDate: { gte: startDate, lte: endDate },
    },
    _sum: { registrationFee: true },
  });

  const bookingAmount = totalBookingAmount._sum.totalAmount || new Decimal(0);
  const paymentsReceived = totalPaymentsReceived._sum.amount || new Decimal(0);
  const netRevenue = paymentsReceived
    .plus(totalGST._sum.gstAmount || new Decimal(0))
    .minus(totalDiscounts._sum.discountAmount || new Decimal(0));

  return {
    period: `${startDate.toISOString()} to ${endDate.toISOString()}`,
    totalBookingAmount: bookingAmount,
    totalPaymentsReceived: paymentsReceived,
    totalOutstanding: totalOutstanding._sum.balanceAmount || new Decimal(0),
    totalDiscount: totalDiscounts._sum.discountAmount || new Decimal(0),
    totalGST: totalGST._sum.gstAmount || new Decimal(0),
    totalRegistrationFees: totalRegistrationFees._sum.registrationFee || new Decimal(0),
    netRevenue,
    averageBookingAmount:
      bookingAmount.toNumber() > 0
        ? new Decimal(bookingAmount.toNumber() / (
            await prisma.booking.count({
              where: {
                orgId,
                bookingDate: { gte: startDate, lte: endDate },
              },
            }) || 1
          ))
        : new Decimal(0),
  };
}

/**
 * Get payment analytics
 */
export async function getPaymentAnalytics(
  orgId: string,
): Promise<PaymentAnalytics> {
  const totalBookings = await prisma.booking.count({
    where: { orgId },
  });

  const paidBookings = await prisma.booking.count({
    where: {
      orgId,
      balanceAmount: { equals: new Decimal(0) },
    },
  });

  const partiallyPaidBookings = await prisma.booking.count({
    where: {
      orgId,
      NOT: { balanceAmount: { equals: new Decimal(0) } },
      paidAmount: { gt: new Decimal(0) },
    },
  });

  const unpaidBookings = totalBookings - paidBookings - partiallyPaidBookings;

  // Outstanding balance
  const outstandingBalance = await prisma.booking.aggregate({
    where: { orgId },
    _sum: { balanceAmount: true },
  });

  // Overdue balance
  const now = new Date();
  const overdueInstallments = await prisma.installment.aggregate({
    where: {
      booking: { orgId },
      dueDate: { lt: now },
      status: { in: ['due', 'overdue'] },
    },
    _sum: { amount: true },
  });

  // Days overdue distribution
  const days0to7 = await prisma.installment.count({
    where: {
      booking: { orgId },
      dueDate: {
        gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        lte: now,
      },
      status: { in: ['due', 'overdue'] },
    },
  });

  const days7to30 = await prisma.installment.count({
    where: {
      booking: { orgId },
      dueDate: {
        gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      },
      status: { in: ['due', 'overdue'] },
    },
  });

  const days30plus = await prisma.installment.count({
    where: {
      booking: { orgId },
      dueDate: { lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
      status: { in: ['due', 'overdue'] },
    },
  });

  return {
    totalBookings,
    paidBookings,
    partiallyPaidBookings,
    unpaidBookings,
    outstandingBalance: outstandingBalance._sum.balanceAmount || new Decimal(0),
    overdueBalance: overdueInstallments._sum.amount || new Decimal(0),
    daysOverdueDistribution: {
      '0-7': days0to7,
      '7-30': days7to30,
      '30+': days30plus,
    },
  };
}

/**
 * Get commission report
 */
export async function getCommissionReport(
  orgId: string,
  startDate: Date,
  endDate: Date,
): Promise<CommissionReport> {
  // Total commission
  const totalCommission = await prisma.commission.aggregate({
    where: {
      booking: { orgId },
      createdAt: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true },
  });

  // Pending
  const pendingCommission = await prisma.commission.aggregate({
    where: {
      booking: { orgId },
      status: 'pending',
      createdAt: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true },
  });

  // Approved
  const approvedCommission = await prisma.commission.aggregate({
    where: {
      booking: { orgId },
      status: 'approved',
      createdAt: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true },
  });

  // Paid
  const paidCommission = await prisma.commission.aggregate({
    where: {
      booking: { orgId },
      status: 'paid',
      createdAt: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true },
  });

  // Clawed back
  const clawedBackCommission = await prisma.commission.aggregate({
    where: {
      booking: { orgId },
      status: 'clawed_back',
      createdAt: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true },
  });

  // Top agent - fetch all commissions and calculate
  const agentCommissions = await prisma.commission.groupBy({
    by: ['agentId'],
    where: {
      booking: { orgId },
      createdAt: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
    take: 1,
  });

  let topAgentId = '';
  let topAgentName = 'N/A';
  let topAgentCommissionAmount = new Decimal(0);

  if (agentCommissions.length > 0 && agentCommissions[0].agentId) {
    topAgentId = agentCommissions[0].agentId;
    topAgentCommissionAmount = agentCommissions[0]._sum.amount || new Decimal(0);

    const agent = await prisma.agent.findUnique({
      where: { id: topAgentId },
      include: { user: true },
    });
    if (agent) {
      topAgentName = agent.user.name;
    }
  }

  return {
    period: `${startDate.toISOString()} to ${endDate.toISOString()}`,
    totalCommissionAmount: totalCommission._sum.amount || new Decimal(0),
    pendingCommission: pendingCommission._sum.amount || new Decimal(0),
    approvedCommission: approvedCommission._sum.amount || new Decimal(0),
    paidCommission: paidCommission._sum.amount || new Decimal(0),
    clawedBackCommission: clawedBackCommission._sum.amount || new Decimal(0),
    topAgentId,
    topAgentName,
    topAgentCommission: topAgentCommissionAmount,
  };
}

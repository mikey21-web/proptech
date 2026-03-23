import { prisma } from '@/lib/prisma';
import { queueEmail, queueWhatsAppMessage } from '@/lib/queue';
import { triggerWebhook } from './webhook-dispatcher';
import { WebhookEventType } from './types';
import { releaseExpiredInventoryBlocks } from '@/lib/inventory-blocks';

export async function cronReleaseExpiredBlocks(): Promise<{ plotsReleased: number; flatsReleased: number; totalReleased: number; processedAt: string; }> {
  const result = await releaseExpiredInventoryBlocks();
  console.log(
    `[CRON] Block expiry: released ${result.plotsReleased} plots and ${result.flatsReleased} flats`,
  );
  return result;
}

/**
 * CRON JOB 1: Overdue Detection
 * Runs daily - detects overdue installments and sends reminders
 */
export async function cronOverdueDetection(): Promise<void> {
  const now = new Date();

  // Find all overdue installments (dueDate < today)
  const overdueInstallments = await prisma.installment.findMany({
    where: {
      dueDate: { lt: now },
      status: { in: ['upcoming', 'due'] },
      deletedAt: null,
    },
    include: {
      booking: {
        include: {
          customer: true,
          project: true,
          plot: true,
        },
      },
    },
  });

  for (const installment of overdueInstallments) {
    // Update status to overdue
    await prisma.installment.update({
      where: { id: installment.id },
      data: { status: 'overdue' },
    });

    // Send WhatsApp notification to customer
    await queueWhatsAppMessage({
      to: installment.booking.customer.phone,
      templateName: 'payment_overdue',
      templateParams: {
        name: installment.booking.customer.name,
        amount: installment.amount.toString(),
        bookingNumber: installment.booking.bookingNumber,
        dueDate: installment.dueDate.toISOString().split('T')[0],
        supportPhone: process.env.SUPPORT_PHONE || 'Contact office',
      },
      deduplicationKey: `installment:${installment.id}:overdue:${now.toDateString()}`,
      customerId: installment.booking.customerId,
      bookingId: installment.bookingId,
      installmentId: installment.id,
      priority: 'high',
    });

    if (installment.booking.customer.email) {
      await queueEmail({
        to: installment.booking.customer.email,
        subject: `Payment overdue for booking ${installment.booking.bookingNumber}`,
        template: 'payment_overdue',
        params: {
          customerName: installment.booking.customer.name,
          bookingNumber: installment.booking.bookingNumber,
          amount: Number(installment.amount),
          dueDate: installment.dueDate.toISOString().split('T')[0],
          projectName: installment.booking.project.name,
          supportPhone: process.env.SUPPORT_PHONE || 'Contact office',
        },
      });
    }

    // Trigger webhook
    await triggerWebhook(
      WebhookEventType.PAYMENT_OVERDUE,
      installment.booking.orgId,
      installment.id,
      'Installment',
      {
        bookingId: installment.bookingId,
        installmentNo: installment.installmentNo,
        dueDate: installment.dueDate,
        amount: installment.amount,
      },
    );

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'status_change',
        title: 'Installment Overdue',
        description: `Installment #${installment.installmentNo} for booking ${installment.booking.bookingNumber} is now overdue`,
        metadata: {
          bookingId: installment.bookingId,
          installmentId: installment.id,
          daysOverdue: Math.floor(
            (now.getTime() - installment.dueDate.getTime()) / (1000 * 60 * 60 * 24),
          ),
        },
      },
    });
  }

  console.log(
    `[CRON] Overdue detection: Found ${overdueInstallments.length} overdue installments`,
  );
}

/**
 * CRON JOB 2: Payment Reminders (3 days before due date)
 * Runs daily - sends reminder 3 days before installment due date
 */
export async function cronPaymentReminders(): Promise<void> {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // Find installments due in 3 days
  const upcomingInstallments = await prisma.installment.findMany({
    where: {
      dueDate: {
        gte: threeDaysFromNow,
        lte: new Date(threeDaysFromNow.getTime() + 1000 * 60 * 60 * 24),
      },
      status: 'upcoming',
      deletedAt: null,
    },
    include: {
      booking: {
        include: {
          customer: true,
          project: true,
        },
      },
    },
  });

  for (const installment of upcomingInstallments) {
    // Queue reminder (only once per installment per 24h period)
    const deduplicationKey = `installment:${installment.id}:reminder:${now.toDateString()}`;

    await queueWhatsAppMessage({
      to: installment.booking.customer.phone,
      templateName: 'payment_reminder_3_days',
      templateParams: {
        name: installment.booking.customer.name,
        amount: installment.amount.toString(),
        bookingNumber: installment.booking.bookingNumber,
        dueDate: installment.dueDate.toISOString().split('T')[0],
        bankDetails: process.env.BANK_DETAILS || 'Contact office for details',
        upiId: process.env.UPI_ID || 'N/A',
      },
      deduplicationKey,
      customerId: installment.booking.customerId,
      bookingId: installment.bookingId,
      installmentId: installment.id,
      priority: 'high',
    });

    if (installment.booking.customer.email) {
      await queueEmail({
        to: installment.booking.customer.email,
        subject: `Upcoming installment reminder for ${installment.booking.bookingNumber}`,
        template: 'payment_reminder',
        params: {
          customerName: installment.booking.customer.name,
          bookingNumber: installment.booking.bookingNumber,
          amount: Number(installment.amount),
          dueDate: installment.dueDate.toISOString().split('T')[0],
          projectName: installment.booking.project.name,
          bankDetails: process.env.BANK_DETAILS || 'Contact office for details',
          upiId: process.env.UPI_ID || 'N/A',
        },
      });
    }

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'follow_up',
        title: 'Payment Reminder Sent',
        description: `3-day reminder sent for installment #${installment.installmentNo}`,
        metadata: {
          bookingId: installment.bookingId,
          installmentId: installment.id,
          type: '3_day_reminder',
        },
      },
    });
  }

  console.log(
    `[CRON] Payment reminders: Sent ${upcomingInstallments.length} reminders`,
  );
}

/**
 * CRON JOB 3: Lead Follow-up
 * Runs daily - identifies leads not contacted in 7+ days and flags them
 */
export async function cronLeadFollowUp(): Promise<void> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Find leads not contacted in 7+ days
  const staleLeads = await prisma.lead.findMany({
    where: {
      status: { notIn: ['won', 'lost', 'junk'] },
      updatedAt: { lt: sevenDaysAgo },
      assignedToId: { not: null },
      deletedAt: null,
    },
    include: {
      assignedTo: {
        select: { id: true, name: true, phone: true },
      },
    },
  });

  for (const lead of staleLeads) {
    // Mark lead as high priority for follow-up
    await prisma.lead.update({
      where: { id: lead.id },
      data: { priority: 'urgent' },
    });

    // Queue notification to assigned agent
    if (lead.assignedTo?.phone) {
      await queueWhatsAppMessage({
        to: lead.assignedTo.phone,
        templateName: 'agent_assigned',
        templateParams: {
          leadName: lead.name,
          leadPhone: lead.phone,
          source: lead.source || 'CRM',
          interest: lead.projectId || 'General inquiry',
        },
        deduplicationKey: `lead:${lead.id}:followup:${now.toDateString()}`,
        priority: 'high',
      });
    }

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'follow_up',
        title: 'Lead Requires Follow-up',
        description: `Lead ${lead.name} not contacted for 7+ days`,
        leadId: lead.id,
        userId: lead.assignedToId || undefined,
        metadata: {
          leadId: lead.id,
          daysSinceLast: Math.floor(
            (now.getTime() - lead.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
          ),
        },
      },
    });
  }

  console.log(
    `[CRON] Lead follow-up: Flagged ${staleLeads.length} leads for follow-up`,
  );
}

/**
 * CRON JOB 4: Weekly Reports
 * Runs weekly (Monday 9 AM IST) - sends manager weekly performance summary
 */
export async function cronWeeklyReports(): Promise<void> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Get all organizations
  const organizations = await prisma.organization.findMany({
    include: {
      users: {
        where: {
          userRoles: {
            some: { role: { name: 'sales_manager' } },
          },
        },
      },
    },
  });

  for (const org of organizations) {
    // Calculate metrics for the past week
    const leadsCreated = await prisma.lead.count({
      where: {
        orgId: org.id,
        createdAt: { gte: sevenDaysAgo },
      },
    });

    const bookingsCreated = await prisma.booking.count({
      where: {
        orgId: org.id,
        createdAt: { gte: sevenDaysAgo },
      },
    });

    const paymentsReceived = await prisma.payment.aggregate({
      where: {
        booking: { orgId: org.id },
        paymentDate: { gte: sevenDaysAgo },
        status: 'received',
      },
      _sum: { amount: true },
    });

    // Send report to managers via email/WhatsApp
    const managers = org.users;
    for (const manager of managers) {
      if (!manager.phone) continue;

      await queueWhatsAppMessage({
        to: manager.phone,
        templateName: 'weekly_report_summary',
        templateParams: {
          managerName: manager.name || 'Manager',
          leadsCreated: String(leadsCreated),
          bookingsCreated: String(bookingsCreated),
          paymentsReceived: paymentsReceived._sum.amount?.toString() || '0',
          reportPeriod: `${sevenDaysAgo.toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]}`,
        },
        deduplicationKey: `org:${org.id}:weekly_report:${now.toDateString()}`,
        priority: 'normal',
      });
    }

    console.log(
      `[CRON] Weekly report for ${org.name}: ${leadsCreated} leads, ${bookingsCreated} bookings, Rs ${paymentsReceived._sum.amount || 0} payments`,
    );
  }
}

/**
 * CRON JOB 5: Commission Settlement
 * Runs monthly - processes pending commissions for approved bookings
 */
export async function cronCommissionSettlement(): Promise<void> {
  const now = new Date();

  // Find all confirmed bookings (30+ days) with pending commissions
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const pendingCommissions = await prisma.commission.findMany({
    where: {
      status: 'pending',
      booking: {
        status: 'confirmed',
        bookingDate: { lte: thirtyDaysAgo },
      },
    },
    include: {
      booking: {
        include: { agent: true },
      },
      agent: true,
    },
  });

  for (const commission of pendingCommissions) {
    // Auto-approve commission if booking is stable (30+ days confirmed)
    await prisma.commission.update({
      where: { id: commission.id },
      data: {
        status: 'approved',
        approvedAt: now,
      },
    });

    // Trigger webhook
    await triggerWebhook(
      WebhookEventType.COMMISSION_APPROVED,
      commission.booking.orgId,
      commission.id,
      'Commission',
      {
        agentId: commission.agentId,
        bookingId: commission.bookingId,
        amount: commission.amount,
        percentage: commission.percentage,
      },
    );

    // Create activity log — resolve Agent -> User relationship
    let userId: string | undefined;
    if (commission.agentId) {
      const agent = await prisma.agent.findUnique({
        where: { id: commission.agentId },
        select: { userId: true },
      });
      userId = agent?.userId;
    }

    await prisma.activity.create({
      data: {
        type: 'status_change',
        title: 'Commission Approved',
        description: `Commission of Rs ${commission.amount} approved for booking ${commission.booking.bookingNumber}`,
        userId,
        metadata: {
          commissionId: commission.id,
          amount: commission.amount.toString(),
          bookingId: commission.booking.id,
        },
      },
    });
  }

  console.log(
    `[CRON] Commission settlement: Approved ${pendingCommissions.length} commissions`,
  );
}

export async function runAllCronJobs(): Promise<void> {
  console.log('[CRON] Starting scheduled jobs...');

  try {
    await cronReleaseExpiredBlocks();
  } catch (error) {
    console.error('[CRON] Block expiry failed:', error);
  }

  try {
    await cronOverdueDetection();
  } catch (error) {
    console.error('[CRON] Overdue detection failed:', error);
  }

  try {
    await cronPaymentReminders();
  } catch (error) {
    console.error('[CRON] Payment reminders failed:', error);
  }

  try {
    await cronLeadFollowUp();
  } catch (error) {
    console.error('[CRON] Lead follow-up failed:', error);
  }

  try {
    await cronWeeklyReports();
  } catch (error) {
    console.error('[CRON] Weekly reports failed:', error);
  }

  try {
    await cronCommissionSettlement();
  } catch (error) {
    console.error('[CRON] Commission settlement failed:', error);
  }

  console.log('[CRON] Scheduled jobs completed');
}

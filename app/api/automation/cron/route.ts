export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import {
  cronReleaseExpiredBlocks,
  cronOverdueDetection,
  cronPaymentReminders,
  cronLeadFollowUp,
  cronWeeklyReports,
  cronCommissionSettlement,
} from '@/lib/automation/cron-jobs';
import { processWebhookRetries } from '@/lib/automation/webhook-dispatcher';

// This endpoint can be called by an external cron service (e.g., EasyCron, Vercel Cron)
// OR via internal health check systems

export async function POST(req: NextRequest) {
  // Verify authorization (either from session or via secret header)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || !authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.substring(7);
  if (token !== cronSecret) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
  }

  const { jobType } = await req.json();

  try {
    const results: Record<string, any> = {};

    if (!jobType || jobType === 'all') {
      // Run all jobs
      console.log('[API] Running all cron jobs...');

      results.blockExpiry = await (async () => await cronReleaseExpiredBlocks())();
      results.overdueDetection = await (async () =>
        await cronOverdueDetection())();
      results.paymentReminders = await (async () =>
        await cronPaymentReminders())();
      results.leadFollowUp = await (async () => await cronLeadFollowUp())();
      results.weeklyReports = await (async () => await cronWeeklyReports())();
      results.commissionSettlement = await (async () =>
        await cronCommissionSettlement())();
      results.webhookRetries = await (async () =>
        await processWebhookRetries())();
    } else {
      // Run specific job
      switch (jobType) {
        case 'overdue_detection':
          results.overdueDetection = await cronOverdueDetection();
          break;
        case 'block_expiry':
          results.blockExpiry = await cronReleaseExpiredBlocks();
          break;
        case 'payment_reminders':
          results.paymentReminders = await cronPaymentReminders();
          break;
        case 'lead_followup':
          results.leadFollowUp = await cronLeadFollowUp();
          break;
        case 'weekly_reports':
          results.weeklyReports = await cronWeeklyReports();
          break;
        case 'commission_settlement':
          results.commissionSettlement = await cronCommissionSettlement();
          break;
        case 'webhook_retries':
          results.webhookRetries = await processWebhookRetries();
          break;
        default:
          return NextResponse.json(
            { error: 'Unknown job type' },
            { status: 400 },
          );
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error('[API] Cron job error:', error);
    return NextResponse.json(
      { error: 'Cron job failed', details: String(error) },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  // Health check endpoint
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (action === 'health') {
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      crons: [
        'block_expiry',
        'overdue_detection',
        'payment_reminders',
        'lead_followup',
        'weekly_reports',
        'commission_settlement',
        'webhook_retries',
      ],
    });
  }

  return NextResponse.json(
    { error: 'Use POST to trigger cron jobs' },
    { status: 400 },
  );
}

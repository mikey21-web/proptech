import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  getDashboardMetrics,
  getAgentPerformance,
  getFinancialReport,
  getPaymentAnalytics,
  getCommissionReport,
} from '@/lib/dashboard/analytics';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(['super_admin', 'admin', 'sales_manager']);
    if (!auth.authorized)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = auth.user!;

    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view') || 'overview';
    const month = searchParams.get('month')
      ? new Date(searchParams.get('month')!)
      : new Date();
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : new Date(month.getFullYear(), month.getMonth(), 1);
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : new Date(month.getFullYear(), month.getMonth() + 1, 0);

    const orgId = user.orgId;

    let response: any = {};

    // Overview dashboard
    if (view === 'overview' || view === 'all') {
      const metrics = await getDashboardMetrics(orgId, month);
      response.metrics = metrics;
    }

    // Agent performance
    if (view === 'agents' || view === 'all') {
      const agentPerformance = await getAgentPerformance(orgId, month);
      response.agentPerformance = agentPerformance;
    }

    // Financial reports
    if (view === 'financial' || view === 'all') {
      const financial = await getFinancialReport(orgId, startDate, endDate);
      response.financial = financial;
    }

    // Payment analytics
    if (view === 'payments' || view === 'all') {
      const payments = await getPaymentAnalytics(orgId);
      response.payments = payments;
    }

    // Commission reports
    if (view === 'commissions' || view === 'all') {
      const commissions = await getCommissionReport(orgId, startDate, endDate);
      response.commissions = commissions;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 },
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { ok, badRequest, unauthorized, forbidden, serverError } from '@/lib/api-response';
import {
  generateLeadReport,
  generateBookingReport,
  generateAgentReport,
  generateFinancialReport,
  generateProjectReport,
  type DateRange,
} from '@/lib/reports';

// ---------------------------------------------------------------------------
// GET /api/admin/reports?type=lead|booking|agent|financial|project
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

    const type = req.nextUrl.searchParams.get('type');
    if (!type || !['lead', 'booking', 'agent', 'financial', 'project'].includes(type)) {
      return badRequest('Query param "type" must be one of: lead, booking, agent, financial, project');
    }

    const from = req.nextUrl.searchParams.get('from');
    const to = req.nextUrl.searchParams.get('to');
    const dateRange: DateRange | undefined =
      from && to ? { from, to } : undefined;

    let data;
    switch (type) {
      case 'lead':
        data = await generateLeadReport(orgId, dateRange);
        break;
      case 'booking':
        data = await generateBookingReport(orgId, dateRange);
        break;
      case 'agent':
        data = await generateAgentReport(orgId, dateRange);
        break;
      case 'financial':
        data = await generateFinancialReport(orgId, dateRange);
        break;
      case 'project':
        data = await generateProjectReport(orgId);
        break;
      default:
        return badRequest('Invalid report type');
    }

    return ok({ type, dateRange, report: data });
  } catch (err) {
    return serverError(String(err));
  }
}

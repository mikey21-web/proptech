import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  ok,
  badRequest,
  unauthorized,
  forbidden,
  serverError,
} from '@/lib/api-response';
import { bulkApproveCommissions } from '@/lib/commission-engine';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// POST /api/commissions/bulk — Bulk approve commissions
// ---------------------------------------------------------------------------

const bulkApproveSchema = z.object({
  action: z.literal('approve'),
  commissionIds: z.array(z.string()).min(1, 'At least one commission ID required').max(100, 'Maximum 100 commissions per request'),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth([
      'super_admin',
      'admin',
      'sales_manager',
    ]);
    if (!auth.authorized) {
      return auth.status === 401
        ? unauthorized(auth.error)
        : forbidden(auth.error);
    }
    const user = auth.user!;

    const body = await req.json();
    const parsed = bulkApproveSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }

    const { commissionIds } = parsed.data;

    const result = await bulkApproveCommissions(
      commissionIds,
      user.id,
      user.orgId,
    );

    return ok({
      approved: result.approved,
      failed: result.failed,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (err) {
    return serverError(String(err));
  }
}

import { NextRequest } from 'next/server';
import { ok, unauthorized, forbidden, serverError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const [{ requireAuth }, { prisma }] = await Promise.all([
      import('@/lib/auth'),
      import('@/lib/prisma'),
    ]);

    const auth = await requireAuth(['super_admin', 'admin']);
    if (!auth.authorized) {
      return auth.status === 401 ? unauthorized(auth.error) : forbidden(auth.error);
    }
    const orgId = auth.user!.orgId;

    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '100', 10);

    const logs = await prisma.auditLog.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 500),
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        oldValues: true,
        newValues: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return ok(logs);
  } catch (err) {
    return serverError(String(err));
  }
}

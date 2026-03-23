import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { ok, unauthorized, forbidden, serverError } from '@/lib/api-response';

// ---------------------------------------------------------------------------
// GET /api/agents — List agents with team & commission info
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
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

    const includeInactive =
      req.nextUrl.searchParams.get('includeInactive') === 'true';

    const agents = await prisma.agent.findMany({
      where: {
        orgId: user.orgId,
        deletedAt: null,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        agentCode: true,
        isActive: true,
        reraNumber: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            image: true,
            status: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            leader: {
              select: {
                id: true,
                user: { select: { name: true } },
              },
            },
          },
        },
        _count: {
          select: {
            bookings: { where: { deletedAt: null } },
            commissions: true,
          },
        },
        commissions: {
          where: { status: 'paid' },
          select: { amount: true },
        },
      },
    });

    const data = agents.map((a) => ({
      id: a.id,
      agentCode: a.agentCode,
      isActive: a.isActive,
      reraNumber: a.reraNumber,
      createdAt: a.createdAt,
      name: a.user.name,
      email: a.user.email,
      phone: a.user.phone,
      image: a.user.image,
      userId: a.user.id,
      userStatus: a.user.status,
      team: a.team
        ? {
            id: a.team.id,
            name: a.team.name,
            leaderName: a.team.leader?.user?.name ?? null,
          }
        : null,
      totalBookings: a._count.bookings,
      totalCommissions: a._count.commissions,
      paidCommission: a.commissions.reduce(
        (sum, c) => sum + Number(c.amount),
        0,
      ),
    }));

    return ok(data);
  } catch (err) {
    return serverError(String(err));
  }
}

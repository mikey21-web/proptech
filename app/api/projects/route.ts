export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { ok, unauthorized, serverError } from '@/lib/api-response';
import { releaseExpiredInventoryBlocks } from '@/lib/inventory-blocks';

// ---------------------------------------------------------------------------
// GET /api/projects — List projects the current user can access
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(); // any authenticated user
    if (!auth.authorized) {
      return unauthorized(auth.error);
    }
    const user = auth.user!;
    await releaseExpiredInventoryBlocks();

    const status = req.nextUrl.searchParams.get('status') ?? undefined;
    const type = req.nextUrl.searchParams.get('type') ?? undefined;

    const projects = await prisma.project.findMany({
      where: {
        orgId: user.orgId,
        deletedAt: null,
        ...(status ? { status: status as never } : {}),
        ...(type ? { type: type as never } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        status: true,
        city: true,
        state: true,
        totalUnits: true,
        launchDate: true,
        completionDate: true,
        reraNumber: true,
        brochureUrl: true,
        createdAt: true,
        _count: {
          select: {
            plots: { where: { status: 'available', deletedAt: null } },
            flats: { where: { status: 'available', deletedAt: null } },
            bookings: { where: { deletedAt: null } },
          },
        },
      },
    });

    // Flatten counts for cleaner API
    const data = projects.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      type: p.type,
      status: p.status,
      city: p.city,
      state: p.state,
      totalUnits: p.totalUnits,
      launchDate: p.launchDate,
      completionDate: p.completionDate,
      reraNumber: p.reraNumber,
      brochureUrl: p.brochureUrl,
      createdAt: p.createdAt,
      availablePlots: p._count.plots,
      availableFlats: p._count.flats,
      totalBookings: p._count.bookings,
    }));

    return ok(data);
  } catch (err) {
    return serverError(String(err));
  }
}

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, serverError } from '@/lib/api-response';
import { releaseExpiredInventoryBlocks } from '@/lib/inventory-blocks';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function getPublicOrgId(): Promise<string | null> {
  const envId = process.env.PUBLIC_ORG_ID;
  if (envId) return envId;
  const org = await prisma.organization.findFirst({ select: { id: true } });
  return org?.id ?? null;
}

// GET /api/public/projects — List all active projects for public browsing
export async function GET(req: NextRequest) {
  try {
    const orgId = await getPublicOrgId();
    if (!orgId) return ok([]);

    await releaseExpiredInventoryBlocks();

    const type = req.nextUrl.searchParams.get('type') ?? undefined;
    const city = req.nextUrl.searchParams.get('city') ?? undefined;

    const projects = await prisma.project.findMany({
      where: {
        orgId,
        deletedAt: null,
        status: { not: 'cancelled' },
        ...(type ? { type: type as never } : {}),
        ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        status: true,
        description: true,
        address: true,
        city: true,
        state: true,
        totalUnits: true,
        totalArea: true,
        launchDate: true,
        completionDate: true,
        reraNumber: true,
        images: {
          where: { isPrimary: true },
          select: { url: true, caption: true },
          take: 1,
        },
        amenities: { select: { name: true, icon: true } },
        plots: {
          where: { deletedAt: null },
          select: { status: true, price: true },
        },
        flats: {
          where: { deletedAt: null },
          select: { status: true, price: true, bedrooms: true },
        },
      },
    });

    const data = projects.map((p) => {
      const allUnits = [...p.plots, ...p.flats];
      const prices = allUnits.map((u) => Number(u.price)).filter(Boolean);
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        type: p.type,
        status: p.status,
        description: p.description,
        address: p.address,
        city: p.city,
        state: p.state,
        totalUnits: p.totalUnits || allUnits.length,
        totalArea: p.totalArea ? Number(p.totalArea) : null,
        launchDate: p.launchDate,
        completionDate: p.completionDate,
        reraNumber: p.reraNumber,
        primaryImage: p.images[0]?.url ?? null,
        amenities: p.amenities,
        available: allUnits.filter((u) => u.status === 'available').length,
        booked: allUnits.filter((u) => u.status === 'booked' || u.status === 'sold').length,
        minPrice: prices.length ? Math.min(...prices) : null,
        maxPrice: prices.length ? Math.max(...prices) : null,
        configurations: [...new Set(p.flats.map((f) => f.bedrooms).filter(Boolean))].sort(),
      };
    });

    return ok(data);
  } catch (err) {
    return serverError(String(err));
  }
}

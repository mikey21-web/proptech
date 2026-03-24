import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, notFound, serverError } from '@/lib/api-response';
import { releaseExpiredInventoryBlocks } from '@/lib/inventory-blocks';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function getPublicOrgId(): Promise<string | null> {
  const envId = process.env.PUBLIC_ORG_ID;
  if (envId) return envId;
  const org = await prisma.organization.findFirst({ select: { id: true } });
  return org?.id ?? null;
}

// GET /api/public/projects/[slug] — Full project detail for buyer view
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const orgId = await getPublicOrgId();
    if (!orgId) return notFound('Project not found');

    await releaseExpiredInventoryBlocks();

    const project = await prisma.project.findFirst({
      where: { slug: params.slug, orgId, deletedAt: null },
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
        pincode: true,
        latitude: true,
        longitude: true,
        totalUnits: true,
        totalArea: true,
        launchDate: true,
        completionDate: true,
        reraNumber: true,
        brochureUrl: true,
        sitePlanUrl: true,
        sitePlanWidth: true,
        sitePlanHeight: true,
        images: { orderBy: { sortOrder: 'asc' }, select: { url: true, caption: true, isPrimary: true } },
        amenities: { select: { name: true, icon: true, description: true } },
        plots: {
          where: { deletedAt: null },
          orderBy: { plotNumber: 'asc' },
          select: {
            id: true,
            plotNumber: true,
            area: true,
            dimensions: true,
            facing: true,
            price: true,
            pricePerSqft: true,
            status: true,
            coordinates: true,
          },
        },
        flats: {
          where: { deletedAt: null },
          orderBy: [{ floor: 'asc' }, { flatNumber: 'asc' }],
          select: {
            id: true,
            flatNumber: true,
            floor: true,
            bedrooms: true,
            bathrooms: true,
            area: true,
            superArea: true,
            facing: true,
            price: true,
            pricePerSqft: true,
            status: true,
            coordinates: true,
          },
        },
      },
    });

    if (!project) return notFound('Project not found');

    // Sanitize: hide blockedUntil, blockReason from public (treated as unavailable)
    const sanitizeStatus = (status: string) => {
      if (status === 'blocked') return 'reserved';
      return status;
    };

    return ok({
      ...project,
      totalArea: project.totalArea ? Number(project.totalArea) : null,
      latitude: project.latitude ? Number(project.latitude) : null,
      longitude: project.longitude ? Number(project.longitude) : null,
      plots: project.plots.map((p) => ({
        ...p,
        area: Number(p.area),
        price: Number(p.price),
        pricePerSqft: p.pricePerSqft ? Number(p.pricePerSqft) : null,
        status: sanitizeStatus(p.status),
      })),
      flats: project.flats.map((f) => ({
        ...f,
        area: Number(f.area),
        superArea: f.superArea ? Number(f.superArea) : null,
        price: Number(f.price),
        pricePerSqft: f.pricePerSqft ? Number(f.pricePerSqft) : null,
        status: sanitizeStatus(f.status),
      })),
    });
  } catch (err) {
    return serverError(String(err));
  }
}

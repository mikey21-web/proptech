export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  ok,
  created,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  serverError,
} from '@/lib/api-response';
import { createProjectSchema, updateProjectSchema, updateUnitStatusSchema } from '@/lib/validations/projects';
import { releaseExpiredInventoryBlocks, resolveBlockedUntil } from '@/lib/inventory-blocks';

// ---------------------------------------------------------------------------
// GET /api/admin/projects — List projects with full inventory
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(['super_admin', 'admin']);
    if (!auth.authorized) {
      return auth.status === 401 ? unauthorized(auth.error) : forbidden(auth.error);
    }
    const orgId = auth.user!.orgId;
    await releaseExpiredInventoryBlocks();

    const projectId = req.nextUrl.searchParams.get('projectId');

    if (projectId) {
      // Single project with full details
      const project = await prisma.project.findFirst({
        where: { id: projectId, orgId, deletedAt: null },
        include: {
          plots: { where: { deletedAt: null }, orderBy: { plotNumber: 'asc' } },
          flats: { where: { deletedAt: null }, orderBy: [{ floor: 'asc' }, { flatNumber: 'asc' }] },
          amenities: true,
          images: { orderBy: { sortOrder: 'asc' } },
          _count: {
            select: { bookings: { where: { deletedAt: null } } },
          },
        },
      });
      if (!project) return notFound('Project not found');
      return ok(project);
    }

    // List all projects
    const projects = await prisma.project.findMany({
      where: { orgId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        status: true,
        city: true,
        totalUnits: true,
        launchDate: true,
        completionDate: true,
        reraNumber: true,
        createdAt: true,
        plots: {
          where: { deletedAt: null },
          select: { status: true },
        },
        flats: {
          where: { deletedAt: null },
          select: { status: true },
        },
        _count: {
          select: {
            bookings: { where: { deletedAt: null } },
          },
        },
      },
    });

    const data = projects.map((p) => {
      const allUnits = [...p.plots, ...p.flats];
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        type: p.type,
        status: p.status,
        city: p.city,
        totalUnits: p.totalUnits || allUnits.length,
        launchDate: p.launchDate,
        completionDate: p.completionDate,
        reraNumber: p.reraNumber,
        createdAt: p.createdAt,
        available: allUnits.filter((u) => u.status === 'available').length,
        booked: allUnits.filter((u) => u.status === 'booked').length,
        sold: allUnits.filter((u) => u.status === 'sold').length,
        blocked: allUnits.filter((u) => u.status === 'blocked').length,
        totalBookings: p._count.bookings,
      };
    });

    return ok(data);
  } catch (err) {
    return serverError(String(err));
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/projects — Create a new project
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(['super_admin', 'admin']);
    if (!auth.authorized) {
      return auth.status === 401 ? unauthorized(auth.error) : forbidden(auth.error);
    }
    const orgId = auth.user!.orgId;

    const body = await req.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }
    const { name, description, type, address, city, state, pincode,
      totalArea, totalUnits, launchDate, completionDate, reraNumber } = parsed.data;

    // Generate slug
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Check unique slug in org
    const existing = await prisma.project.findFirst({
      where: { orgId, slug, deletedAt: null },
    });
    if (existing) return badRequest('A project with this name already exists');

    const project = await prisma.$transaction(async (tx) => {
      const newProject = await tx.project.create({
        data: {
          name,
          slug,
          description: description || null,
          type: type || 'residential',
          status: 'upcoming',
          address: address || null,
          city: city || null,
          state: state || null,
          pincode: pincode || null,
          totalArea: totalArea || null,
          totalUnits: totalUnits || null,
          launchDate: launchDate ? new Date(launchDate) : null,
          completionDate: completionDate ? new Date(completionDate) : null,
          reraNumber: reraNumber || null,
          orgId,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'create',
          entity: 'Project',
          entityId: newProject.id,
          newValues: { name, type, city },
          userId: auth.user!.id,
          orgId,
        },
      });

      return newProject;
    });

    return created(project);
  } catch (err) {
    return serverError(String(err));
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/admin/projects — Update project or unit status
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(['super_admin', 'admin']);
    if (!auth.authorized) {
      return auth.status === 401 ? unauthorized(auth.error) : forbidden(auth.error);
    }
    const orgId = auth.user!.orgId;

    const body = await req.json();

    // Update unit status (from floor plan editor)
    if (body.unitId && body.unitType && body.newStatus) {
      const unitParsed = updateUnitStatusSchema.safeParse(body);
      if (!unitParsed.success) {
        return badRequest(unitParsed.error.issues.map((i) => i.message).join(', '));
      }
      const { unitId, unitType, newStatus, blockedUntil, holdMinutes, blockReason } = unitParsed.data;
      const blockExpiry = newStatus === 'blocked'
        ? resolveBlockedUntil({ blockedUntil, holdMinutes })
        : null;
      const unitUpdate = {
        status: newStatus,
        blockedUntil: newStatus === 'blocked' ? blockExpiry : null,
        blockReason: newStatus === 'blocked' ? blockReason ?? null : null,
      };

      if (unitType === 'plot') {
        const updated = await prisma.$transaction(async (tx) => {
          const plot = await tx.plot.findFirst({
            where: { id: unitId, project: { orgId } },
          });
          if (!plot) return null;

          const result = await tx.plot.update({
            where: { id: unitId },
            data: unitUpdate,
          });

          await tx.auditLog.create({
            data: {
              action: 'update',
              entity: 'Plot',
              entityId: unitId,
              oldValues: {
                status: plot.status,
                blockedUntil: plot.blockedUntil,
                blockReason: plot.blockReason,
              },
              newValues: unitUpdate,
              userId: auth.user!.id,
              orgId,
            },
          });

          return result;
        });
        if (!updated) return notFound('Plot not found');
        return ok(updated);
      }

      if (unitType === 'flat') {
        const updated = await prisma.$transaction(async (tx) => {
          const flat = await tx.flat.findFirst({
            where: { id: unitId, project: { orgId } },
          });
          if (!flat) return null;

          const result = await tx.flat.update({
            where: { id: unitId },
            data: unitUpdate,
          });

          await tx.auditLog.create({
            data: {
              action: 'update',
              entity: 'Flat',
              entityId: unitId,
              oldValues: {
                status: flat.status,
                blockedUntil: flat.blockedUntil,
                blockReason: flat.blockReason,
              },
              newValues: unitUpdate,
              userId: auth.user!.id,
              orgId,
            },
          });

          return result;
        });
        if (!updated) return notFound('Flat not found');
        return ok(updated);
      }

      return badRequest('unitType must be "plot" or "flat"');
    }

    // Update project details
    if (body.projectId) {
      const projParsed = updateProjectSchema.safeParse(body);
      if (!projParsed.success) {
        return badRequest(projParsed.error.issues.map((i) => i.message).join(', '));
      }
      const { projectId, ...updates } = projParsed.data;
      const project = await prisma.project.findFirst({
        where: { id: projectId, orgId, deletedAt: null },
      });
      if (!project) return notFound('Project not found');

      const allowedFields = [
        'name', 'description', 'type', 'status', 'address', 'city', 'state',
        'pincode', 'totalArea', 'totalUnits', 'launchDate', 'completionDate', 'reraNumber',
        'sitePlanUrl', 'sitePlanWidth', 'sitePlanHeight',
      ];
      const safeUpdates: Record<string, unknown> = {};
      for (const key of allowedFields) {
        if (updates[key] !== undefined) {
          safeUpdates[key] = updates[key];
        }
      }

      // Handle date conversions
      if (safeUpdates.launchDate) safeUpdates.launchDate = new Date(safeUpdates.launchDate as string);
      if (safeUpdates.completionDate) safeUpdates.completionDate = new Date(safeUpdates.completionDate as string);

      const updated = await prisma.project.update({
        where: { id: projectId },
        data: safeUpdates,
      });

      await prisma.auditLog.create({
        data: {
          action: 'update',
          entity: 'Project',
          entityId: projectId,
          newValues: safeUpdates as any,
          userId: auth.user!.id,
          orgId,
        },
      });

      return ok(updated);
    }

    return badRequest('Either projectId or (unitId + unitType + newStatus) is required');
  } catch (err) {
    return serverError(String(err));
  }
}

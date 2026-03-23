import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { ok, badRequest, unauthorized, forbidden, notFound, serverError } from '@/lib/api-response';
import { z } from 'zod';

const updateCoordinatesSchema = z.object({
  unitId: z.string().min(1),
  unitType: z.enum(['plot', 'flat']),
  coordinates: z.array(z.array(z.number()).length(2)).min(3, 'At least 3 points required for a polygon'),
});

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(['super_admin', 'admin']);
    if (!auth.authorized) {
      return auth.status === 401 ? unauthorized(auth.error) : forbidden(auth.error);
    }
    const orgId = auth.user!.orgId;

    const body = await req.json();
    const parsed = updateCoordinatesSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }

    const { unitId, unitType, coordinates } = parsed.data;

    if (unitType === 'plot') {
      const plot = await prisma.plot.findFirst({
        where: { id: unitId, project: { orgId } },
      });
      if (!plot) return notFound('Plot not found');

      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.plot.update({
          where: { id: unitId },
          data: { coordinates },
        });

        await tx.auditLog.create({
          data: {
            action: 'update',
            entity: 'Plot',
            entityId: unitId,
            oldValues: { coordinates: plot.coordinates },
            newValues: { coordinates },
            userId: auth.user!.id,
            orgId,
          },
        });

        return result;
      });

      return ok(updated);
    }

    if (unitType === 'flat') {
      const flat = await prisma.flat.findFirst({
        where: { id: unitId, project: { orgId } },
      });
      if (!flat) return notFound('Flat not found');

      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.flat.update({
          where: { id: unitId },
          data: { coordinates },
        });

        await tx.auditLog.create({
          data: {
            action: 'update',
            entity: 'Flat',
            entityId: unitId,
            oldValues: { coordinates: flat.coordinates },
            newValues: { coordinates },
            userId: auth.user!.id,
            orgId,
          },
        });

        return result;
      });

      return ok(updated);
    }

    return badRequest('unitType must be "plot" or "flat"');
  } catch (err) {
    return serverError(String(err));
  }
}

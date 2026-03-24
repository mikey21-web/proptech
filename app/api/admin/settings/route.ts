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
  serverError,
} from '@/lib/api-response';
import { settingsActionSchema } from '@/lib/validations/settings';

// ---------------------------------------------------------------------------
// GET /api/admin/settings — Org settings, roles, commission structures
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(['super_admin', 'admin']);
    if (!auth.authorized) {
      return auth.status === 401 ? unauthorized(auth.error) : forbidden(auth.error);
    }
    const orgId = auth.user!.orgId;

    const section = req.nextUrl.searchParams.get('section') || 'all';

    const result: Record<string, unknown> = {};

    if (section === 'all' || section === 'organization') {
      result.organization = await prisma.organization.findUnique({
        where: { id: orgId },
        select: {
          id: true,
          name: true,
          domain: true,
          logo: true,
          address: true,
          phone: true,
          email: true,
          gstNumber: true,
          reraNumber: true,
          website: true,
          settings: true,
        },
      });
    }

    if (section === 'all' || section === 'roles') {
      result.roles = await prisma.role.findMany({
        where: { orgId, deletedAt: null },
        include: {
          rolePermissions: {
            include: { permission: true },
          },
          _count: { select: { userRoles: true } },
        },
        orderBy: { name: 'asc' },
      });
    }

    if (section === 'all' || section === 'permissions') {
      result.permissions = await prisma.permission.findMany({
        orderBy: [{ resource: 'asc' }, { action: 'asc' }],
      });
    }

    if (section === 'all' || section === 'users') {
      result.users = await prisma.user.findMany({
        where: { orgId, deletedAt: null },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          image: true,
          userRoles: {
            select: {
              role: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    }

    if (section === 'all' || section === 'commissions') {
      result.commissionStructures = await prisma.commissionStructure.findMany({
        where: { orgId, deletedAt: null },
        include: {
          rules: {
            include: { project: { select: { id: true, name: true } } },
            orderBy: { minAmount: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return ok(result);
  } catch (err) {
    return serverError(String(err));
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/settings — Update settings or create commission rules
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(['super_admin', 'admin']);
    if (!auth.authorized) {
      return auth.status === 401 ? unauthorized(auth.error) : forbidden(auth.error);
    }
    const orgId = auth.user!.orgId;

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'update_org': {
        const { name, address, phone, email, gstNumber, reraNumber, website, logo, settings: orgSettings } = body;
        const updated = await prisma.organization.update({
          where: { id: orgId },
          data: {
            ...(name && { name }),
            ...(address !== undefined && { address }),
            ...(phone !== undefined && { phone }),
            ...(email !== undefined && { email }),
            ...(gstNumber !== undefined && { gstNumber }),
            ...(reraNumber !== undefined && { reraNumber }),
            ...(website !== undefined && { website }),
            ...(logo !== undefined && { logo }),
            ...(orgSettings !== undefined && { settings: orgSettings }),
          },
        });
        await prisma.auditLog.create({
          data: {
            action: 'update',
            entity: 'Organization',
            entityId: orgId,
            newValues: body,
            userId: auth.user!.id,
            orgId,
          },
        });
        return ok(updated);
      }

      case 'assign_role': {
        const { userId, roleId } = body;
        if (!userId || !roleId) return badRequest('userId and roleId are required');

        // Verify user belongs to org
        const targetUser = await prisma.user.findFirst({
          where: { id: userId, orgId },
        });
        if (!targetUser) return badRequest('User not found in your organization');

        // Check if only super_admin can assign super_admin/admin
        const targetRole = await prisma.role.findFirst({
          where: { id: roleId, orgId },
        });
        if (!targetRole) return badRequest('Role not found');

        if (
          (targetRole.name === 'super_admin' || targetRole.name === 'admin') &&
          auth.user!.role !== 'super_admin'
        ) {
          return forbidden('Only super_admin can assign admin roles');
        }

        const userRole = await prisma.userRole.upsert({
          where: { userId_roleId: { userId, roleId } },
          create: { userId, roleId },
          update: {},
        });

        await prisma.auditLog.create({
          data: {
            action: 'update',
            entity: 'UserRole',
            entityId: userRole.id,
            newValues: { userId, roleId, roleName: targetRole.name },
            userId: auth.user!.id,
            orgId,
          },
        });
        return ok(userRole);
      }

      case 'remove_role': {
        const { userId: rmUserId, roleId: rmRoleId } = body;
        if (!rmUserId || !rmRoleId) return badRequest('userId and roleId are required');

        // Only super_admin can remove admin/super_admin roles
        const roleToRemove = await prisma.role.findUnique({ where: { id: rmRoleId } });
        if (
          roleToRemove &&
          (roleToRemove.name === 'super_admin' || roleToRemove.name === 'admin') &&
          auth.user!.role !== 'super_admin'
        ) {
          return forbidden('Only super_admin can remove admin roles');
        }

        // Prevent removing your own super_admin role
        if (rmUserId === auth.user!.id && roleToRemove?.name === 'super_admin') {
          return badRequest('Cannot remove your own super_admin role');
        }

        await prisma.userRole.deleteMany({
          where: { userId: rmUserId, roleId: rmRoleId },
        });

        await prisma.auditLog.create({
          data: {
            action: 'delete',
            entity: 'UserRole',
            entityId: `${rmUserId}-${rmRoleId}`,
            oldValues: { userId: rmUserId, roleId: rmRoleId },
            userId: auth.user!.id,
            orgId,
          },
        });
        return ok({ removed: true });
      }

      case 'create_commission_structure': {
        const { name: csName, type: csType, isDefault } = body;
        if (!csName) return badRequest('Commission structure name is required');

        const structure = await prisma.commissionStructure.create({
          data: {
            name: csName,
            type: csType || 'percentage',
            isDefault: isDefault || false,
            isActive: true,
            orgId,
          },
        });

        await prisma.auditLog.create({
          data: {
            action: 'create',
            entity: 'CommissionStructure',
            entityId: structure.id,
            newValues: { name: csName, type: csType },
            userId: auth.user!.id,
            orgId,
          },
        });
        return created(structure);
      }

      case 'add_commission_rule': {
        const { structureId, minAmount, maxAmount, percentage, flatAmount, projectId, description } = body;
        if (!structureId) return badRequest('structureId is required');

        const structure = await prisma.commissionStructure.findFirst({
          where: { id: structureId, orgId },
        });
        if (!structure) return badRequest('Commission structure not found');

        const rule = await prisma.commissionRule.create({
          data: {
            minAmount: minAmount || 0,
            maxAmount: maxAmount || null,
            percentage: percentage || null,
            flatAmount: flatAmount || null,
            description: description || null,
            structureId,
            projectId: projectId || null,
          },
        });
        return created(rule);
      }

      case 'update_configuration': {
        const { key, value, configType } = body;
        if (!key || value === undefined) return badRequest('key and value are required');

        const config = await prisma.configuration.upsert({
          where: { orgId_key: { orgId, key } },
          create: { key, value: String(value), type: configType || 'string', orgId },
          update: { value: String(value), type: configType || 'string' },
        });
        return ok(config);
      }

      default:
        return badRequest('Unknown action. Valid: update_org, assign_role, remove_role, create_commission_structure, add_commission_rule, update_configuration');
    }
  } catch (err) {
    return serverError(String(err));
  }
}

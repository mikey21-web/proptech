export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import {
  ok,
  created,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  serverError,
} from '@/lib/api-response';
import { createAgentSchema, updateAgentSchema } from '@/lib/validations/team';

// ---------------------------------------------------------------------------
// GET /api/admin/team — List all agents with details
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(['super_admin', 'admin']);
    if (!auth.authorized) {
      return auth.status === 401 ? unauthorized(auth.error) : forbidden(auth.error);
    }
    const orgId = auth.user!.orgId;

    const includeInactive = req.nextUrl.searchParams.get('includeInactive') === 'true';

    const agents = await prisma.agent.findMany({
      where: {
        orgId,
        deletedAt: null,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        agentCode: true,
        isActive: true,
        reraNumber: true,
        panNumber: true,
        bankAccount: true,
        ifscCode: true,
        bankName: true,
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
        team: { select: { id: true, name: true } },
        _count: {
          select: {
            bookings: { where: { deletedAt: null } },
            commissions: true,
          },
        },
        commissions: {
          select: { amount: true, status: true },
        },
      },
    });

    const data = agents.map((a) => ({
      id: a.id,
      agentCode: a.agentCode,
      isActive: a.isActive,
      reraNumber: a.reraNumber,
      panNumber: a.panNumber,
      bankAccount: a.bankAccount,
      ifscCode: a.ifscCode,
      bankName: a.bankName,
      createdAt: a.createdAt,
      name: a.user.name,
      email: a.user.email,
      phone: a.user.phone,
      image: a.user.image,
      userId: a.user.id,
      userStatus: a.user.status,
      team: a.team,
      totalBookings: a._count.bookings,
      totalCommissions: a._count.commissions,
      paidCommission: a.commissions
        .filter((c) => c.status === 'paid')
        .reduce((s, c) => s + Number(c.amount), 0),
      pendingCommission: a.commissions
        .filter((c) => c.status === 'pending' || c.status === 'approved')
        .reduce((s, c) => s + Number(c.amount), 0),
    }));

    return ok(data);
  } catch (err) {
    return serverError(String(err));
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/team — Create a new agent
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(['super_admin', 'admin']);
    if (!auth.authorized) {
      return auth.status === 401 ? unauthorized(auth.error) : forbidden(auth.error);
    }
    const orgId = auth.user!.orgId;

    const body = await req.json();
    const parsed = createAgentSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }
    const { name, email, phone, password, agentCode, reraNumber, panNumber, bankAccount, ifscCode, bankName } = parsed.data;

    // Check unique email
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return badRequest('Email already in use');

    // Check unique agent code
    const existingAgent = await prisma.agent.findUnique({ where: { agentCode } });
    if (existingAgent) return badRequest('Agent code already in use');

    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          name,
          email,
          phone: phone || null,
          password: password ? await bcrypt.hash(password, 12) : null,
          status: 'active',
          orgId,
        },
      });

      // Assign agent role
      const agentRole = await tx.role.findFirst({
        where: { orgId, name: 'agent' },
      });
      if (agentRole) {
        await tx.userRole.create({
          data: { userId: user.id, roleId: agentRole.id },
        });
      }

      // Create agent record
      const agent = await tx.agent.create({
        data: {
          agentCode,
          reraNumber: reraNumber || null,
          panNumber: panNumber || null,
          bankAccount: bankAccount || null,
          ifscCode: ifscCode || null,
          bankName: bankName || null,
          isActive: true,
          userId: user.id,
          orgId,
        },
        select: {
          id: true,
          agentCode: true,
          isActive: true,
          user: { select: { id: true, name: true, email: true } },
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          action: 'create',
          entity: 'Agent',
          entityId: agent.id,
          newValues: { agentCode, name, email },
          userId: auth.user!.id,
          orgId,
        },
      });

      return agent;
    });

    return created(result);
  } catch (err) {
    return serverError(String(err));
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/admin/team — Update agent (toggle active, edit details)
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(['super_admin', 'admin']);
    if (!auth.authorized) {
      return auth.status === 401 ? unauthorized(auth.error) : forbidden(auth.error);
    }
    const orgId = auth.user!.orgId;

    const body = await req.json();
    const parsed = updateAgentSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }
    const { agentId, isActive, reraNumber, panNumber, bankAccount, ifscCode, bankName, name, phone } = parsed.data;

    const agent = await prisma.agent.findFirst({
      where: { id: agentId, orgId, deletedAt: null },
    });
    if (!agent) return notFound('Agent not found');

    const result = await prisma.$transaction(async (tx) => {
      // Update agent fields
      const agentUpdate: Record<string, unknown> = {};
      if (isActive !== undefined) agentUpdate.isActive = isActive;
      if (reraNumber !== undefined) agentUpdate.reraNumber = reraNumber;
      if (panNumber !== undefined) agentUpdate.panNumber = panNumber;
      if (bankAccount !== undefined) agentUpdate.bankAccount = bankAccount;
      if (ifscCode !== undefined) agentUpdate.ifscCode = ifscCode;
      if (bankName !== undefined) agentUpdate.bankName = bankName;

      const updated = await tx.agent.update({
        where: { id: agentId },
        data: agentUpdate,
        select: {
          id: true,
          agentCode: true,
          isActive: true,
          user: { select: { id: true, name: true, email: true } },
        },
      });

      // Update user fields if provided
      if (name || phone) {
        const userUpdate: Record<string, unknown> = {};
        if (name) userUpdate.name = name;
        if (phone) userUpdate.phone = phone;
        await tx.user.update({
          where: { id: agent.userId },
          data: userUpdate,
        });
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          action: 'update',
          entity: 'Agent',
          entityId: agentId,
          newValues: body,
          userId: auth.user!.id,
          orgId,
        },
      });

      return updated;
    });

    return ok(result);
  } catch (err) {
    return serverError(String(err));
  }
}

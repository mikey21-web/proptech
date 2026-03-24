export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { ok, forbidden, serverError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth([
      'super_admin',
      'admin',
      'sales_manager',
      'backoffice',
      'agent',
    ]);
    if (!auth.authorized) {
      return auth.status === 401
        ? new Response(JSON.stringify({ success: false, error: auth.error }), { status: 401, headers: { 'Content-Type': 'application/json' } })
        : new Response(JSON.stringify({ success: false, error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
    const user = auth.user!;
    const q = req.nextUrl.searchParams.get('q')?.trim() || '';
    const type = req.nextUrl.searchParams.get('type') || 'all';

    if (!q || q.length < 2) {
      return new Response(JSON.stringify({ success: true, data: { leads: [], bookings: [], customers: [], agents: [], projects: [] } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const qLower = q.toLowerCase();
    const results: Record<string, any[]> = { leads: [], bookings: [], customers: [], agents: [], projects: [] };

    if (type === 'all' || type === 'leads') {
      const leads = await prisma.lead.findMany({
        where: {
          orgId: user.orgId,
          deletedAt: null,
          ...(user.role === 'agent' ? { assignedToId: user.id } : {}),
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: { id: true, name: true, phone: true, email: true, status: true, priority: true },
      });
      results.leads = leads;
    }

    if (type === 'all' || type === 'customers') {
      const customers = await prisma.customer.findMany({
        where: {
          orgId: user.orgId,
          deletedAt: null,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: { id: true, name: true, phone: true, email: true },
      });
      results.customers = customers;
    }

    if (type === 'all' || type === 'bookings') {
      const bookings = await prisma.booking.findMany({
        where: {
          orgId: user.orgId,
          deletedAt: null,
          ...(user.role === 'agent' ? { agentId: (user as any).agentId } : {}),
          OR: [
            { bookingNumber: { contains: q, mode: 'insensitive' } },
            { customer: { name: { contains: q, mode: 'insensitive' } } },
          ],
        },
        take: 5,
        select: {
          id: true,
          bookingNumber: true,
          status: true,
          netAmount: true,
          customer: { select: { name: true } },
          project: { select: { name: true } },
        },
      });
      results.bookings = bookings;
    }

    if ((type === 'all' || type === 'agents') && ['super_admin', 'admin', 'sales_manager'].includes(user.role)) {
      const agents = await prisma.agent.findMany({
        where: {
          orgId: user.orgId,
          deletedAt: null,
          OR: [
            { agentCode: { contains: q, mode: 'insensitive' } },
            { user: { name: { contains: q, mode: 'insensitive' } } },
            { user: { email: { contains: q, mode: 'insensitive' } } },
          ],
        },
        take: 5,
        select: {
          id: true,
          agentCode: true,
          user: { select: { name: true, email: true } },
        },
      });
      results.agents = agents;
    }

    if ((type === 'all' || type === 'projects') && ['super_admin', 'admin', 'sales_manager', 'agent'].includes(user.role)) {
      const projects = await prisma.project.findMany({
        where: {
          orgId: user.orgId,
          deletedAt: null,
          name: { contains: q, mode: 'insensitive' },
        },
        take: 5,
        select: { id: true, name: true, type: true, status: true },
      });
      results.projects = projects;
    }

    return new Response(JSON.stringify({ success: true, data: results, query: q }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCustomerAuth } from '@/lib/customer';
import { ok, notFound, serverError } from '@/lib/api-response';

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/customer/tickets/[id] — Single ticket detail
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const auth = await requireCustomerAuth();
    if (auth.error) return auth.error;

    const { id } = await context.params;

    // Verify the ticket belongs to the customer's leads
    const customerLeads = await prisma.lead.findMany({
      where: {
        customerId: auth.customerId,
        orgId: auth.orgId,
        deletedAt: null,
      },
      select: { id: true },
    });

    const leadIds = customerLeads.map((l) => l.id);

    const ticket = await prisma.task.findFirst({
      where: {
        id,
        OR: [
          { leadId: { in: leadIds } },
          { creatorId: auth.user.id },
        ],
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
        createdAt: true,
        completedAt: true,
        assignee: {
          select: { name: true, email: true },
        },
        lead: {
          select: {
            communications: {
              orderBy: { createdAt: 'desc' },
              take: 20,
              select: {
                id: true,
                type: true,
                direction: true,
                subject: true,
                body: true,
                createdAt: true,
                user: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!ticket) return notFound('Ticket not found');

    return ok(ticket);
  } catch (err) {
    return serverError(String(err));
  }
}

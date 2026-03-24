export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCustomerAuth } from '@/lib/customer';
import { ok, badRequest, created, serverError } from '@/lib/api-response';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// GET /api/customer/messages — Communications & support tickets
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const auth = await requireCustomerAuth();
    if (auth.error) return auth.error;

    // Get leads linked to this customer (for communications)
    const customerLeads = await prisma.lead.findMany({
      where: {
        customerId: auth.customerId,
        orgId: auth.orgId,
        deletedAt: null,
      },
      select: { id: true },
    });

    const leadIds = customerLeads.map((l) => l.id);

    // Fetch communications from linked leads
    const messages = leadIds.length > 0
      ? await prisma.communication.findMany({
          where: {
            leadId: { in: leadIds },
            deletedAt: null,
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            type: true,
            direction: true,
            subject: true,
            body: true,
            createdAt: true,
            user: {
              select: {
                name: true,
                image: true,
              },
            },
          },
        })
      : [];

    // Fetch tasks as "tickets" (tasks linked to customer's leads)
    const tickets = leadIds.length > 0
      ? await prisma.task.findMany({
          where: {
            leadId: { in: leadIds },
            deletedAt: null,
          },
          orderBy: { createdAt: 'desc' },
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
              select: { name: true },
            },
          },
        })
      : [];

    // Notifications (recent activities for this user)
    const notifications = await prisma.activity.findMany({
      where: {
        userId: auth.user.id,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        metadata: true,
        createdAt: true,
      },
    });

    return ok({
      messages,
      tickets,
      notifications,
    });
  } catch (err) {
    return serverError(String(err));
  }
}

// ---------------------------------------------------------------------------
// POST /api/customer/messages — Submit a query/ticket
// ---------------------------------------------------------------------------

const submitTicketSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  bookingId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireCustomerAuth();
    if (auth.error) return auth.error;

    const body = await req.json();
    const parsed = submitTicketSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }

    const data = parsed.data;

    // If booking specified, verify ownership
    let leadId: string | undefined;
    if (data.bookingId) {
      const booking = await prisma.booking.findFirst({
        where: {
          id: data.bookingId,
          customerId: auth.customerId,
          orgId: auth.orgId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!booking) return badRequest('Booking not found');
    }

    // Find a lead for this customer to attach the ticket
    const lead = await prisma.lead.findFirst({
      where: {
        customerId: auth.customerId,
        orgId: auth.orgId,
        deletedAt: null,
      },
      select: { id: true, assignedToId: true },
    });

    leadId = lead?.id;

    // Create the ticket as a Task
    const ticket = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        status: 'pending',
        priority: data.priority as 'low' | 'medium' | 'high',
        leadId: leadId ?? null,
        assigneeId: lead?.assignedToId ?? auth.user.id,
        creatorId: auth.user.id,
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        createdAt: true,
      },
    });

    return created(ticket);
  } catch (err) {
    return serverError(String(err));
  }
}

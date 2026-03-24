export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  ok,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  serverError,
} from '@/lib/api-response';
import { updateNotificationSchema } from '@/lib/validations/notifications';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Single Notification API
 *
 * Per DEBUG.md Section 12:
 * - Mark individual notifications as read
 * - Access control based on user/lead/org
 */

// ---------------------------------------------------------------------------
// GET /api/notifications/[id] — Get single notification
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest, context: RouteContext) {
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
        ? unauthorized(auth.error)
        : forbidden(auth.error);
    }
    const user = auth.user!;
    const { id } = await context.params;

    const notification = await prisma.activity.findFirst({
      where: {
        id,
        OR: [
          // Activities assigned to this user
          { userId: user.id },
          // Activities for leads accessible to this user
          {
            lead: {
              orgId: user.orgId,
              deletedAt: null,
              ...(user.role === 'agent' && { assignedToId: user.id }),
            },
          },
          // General org notifications
          {
            userId: null,
            leadId: null,
            metadata: {
              path: ['orgId'],
              equals: user.orgId,
            },
          },
        ],
      },
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            status: true,
            priority: true,
            assignedTo: { select: { id: true, name: true } },
            project: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!notification) {
      return notFound('Notification not found');
    }

    const metadata = notification.metadata as any;
    return ok({
      ...notification,
      isRead: metadata?.isRead ?? false,
      priority: metadata?.priority ?? 'normal',
      actionUrl: metadata?.actionUrl,
      readAt: metadata?.readAt,
      expiresAt: metadata?.expiresAt,
      isExpired:
        metadata?.expiresAt && new Date(metadata.expiresAt) < new Date(),
    });
  } catch (err) {
    return serverError(String(err));
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/notifications/[id] — Update notification (mark as read)
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest, context: RouteContext) {
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
        ? unauthorized(auth.error)
        : forbidden(auth.error);
    }
    const user = auth.user!;
    const { id } = await context.params;

    const body = await req.json();
    const parsed = updateNotificationSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }

    // Verify notification exists and is accessible
    const existingNotification = await prisma.activity.findFirst({
      where: {
        id,
        OR: [
          { userId: user.id },
          {
            lead: {
              orgId: user.orgId,
              deletedAt: null,
              ...(user.role === 'agent' && { assignedToId: user.id }),
            },
          },
          {
            userId: null,
            leadId: null,
            metadata: {
              path: ['orgId'],
              equals: user.orgId,
            },
          },
        ],
      },
      select: { id: true, metadata: true },
    });

    if (!existingNotification) {
      return notFound('Notification not found');
    }

    const data = parsed.data;
    const currentMetadata = existingNotification.metadata as any;

    // Build updated metadata
    const updatedMetadata = {
      ...currentMetadata,
      ...(data.metadata && typeof data.metadata === 'object' ? data.metadata : {}),
    };

    const notification = await prisma.activity.update({
      where: { id },
      data: { metadata: updatedMetadata },
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true } },
      },
    });

    const metadata = notification.metadata as any;
    return ok({
      ...notification,
      isRead: metadata?.isRead ?? false,
      priority: metadata?.priority ?? 'normal',
      actionUrl: metadata?.actionUrl,
      readAt: metadata?.readAt,
      expiresAt: metadata?.expiresAt,
    });
  } catch (err) {
    return serverError(String(err));
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/notifications/[id] — Delete notification (admin only)
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    // Only admin+ can delete notifications
    const auth = await requireAuth(['super_admin', 'admin']);
    if (!auth.authorized) {
      return auth.status === 401
        ? unauthorized(auth.error)
        : forbidden(auth.error);
    }
    const user = auth.user!;
    const { id } = await context.params;

    // Verify notification exists and is accessible
    const existingNotification = await prisma.activity.findFirst({
      where: {
        id,
        OR: [
          { userId: user.id },
          {
            lead: {
              orgId: user.orgId,
              deletedAt: null,
            },
          },
          {
            userId: null,
            leadId: null,
            metadata: {
              path: ['orgId'],
              equals: user.orgId,
            },
          },
        ],
      },
      select: { id: true },
    });

    if (!existingNotification) {
      return notFound('Notification not found');
    }

    // Hard delete activity/notification
    await prisma.activity.delete({
      where: { id },
    });

    return ok({ message: 'Notification deleted successfully' });
  } catch (err) {
    return serverError(String(err));
  }
}
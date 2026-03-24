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
import {
  createNotificationSchema,
  notificationQuerySchema,
  bulkUpdateNotificationsSchema,
} from '@/lib/validations/notifications';
import type { Prisma } from '@prisma/client';

/**
 * Notifications API
 *
 * Per DEBUG.md Section 12: Real-time notifications
 * Using Activity model with metadata for notification features like read status
 */

// ---------------------------------------------------------------------------
// GET /api/notifications — List notifications (filtered, paginated, user-scoped)
// ---------------------------------------------------------------------------

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
        ? unauthorized(auth.error)
        : forbidden(auth.error);
    }
    const user = auth.user!;

    // Parse query params
    const params = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = notificationQuerySchema.safeParse(params);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }
    const q = parsed.data;

    // Build WHERE - notifications are org-scoped via lead or user
    const where: Prisma.ActivityWhereInput = {
      OR: [
        // Activities assigned to this user
        { userId: user.id },
        // Activities for leads accessible to this user (org-scoped)
        {
          lead: {
            orgId: user.orgId,
            deletedAt: null,
            // Agent-level: only their assigned leads
            ...(user.role === 'agent' && { assignedToId: user.id }),
          },
        },
        // General org notifications (no specific user/lead)
        {
          userId: null,
          leadId: null,
          // Store orgId in metadata for general notifications
          metadata: {
            path: ['orgId'],
            equals: user.orgId,
          },
        },
      ],
    };

    if (q.type) where.type = q.type;
    if (q.userId) where.userId = q.userId;
    if (q.leadId) where.leadId = q.leadId;

    // Filter by priority (stored in metadata)
    if (q.priority) {
      where.metadata = {
        path: ['priority'],
        equals: q.priority,
      };
    }

    // Unread only filter
    if (q.unreadOnly === 'true') {
      where.metadata = {
        path: ['isRead'],
        not: true,
      };
    }

    // Date range on createdAt
    if (q.from || q.to) {
      where.createdAt = {};
      if (q.from) where.createdAt.gte = new Date(q.from);
      if (q.to) where.createdAt.lte = new Date(q.to);
    }

    const skip = (q.page - 1) * q.limit;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.activity.findMany({
        where,
        skip,
        take: q.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          title: true,
          description: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, name: true } },
          lead: {
            select: {
              id: true,
              name: true,
              phone: true,
              status: true,
              project: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.activity.count({ where }),
      prisma.activity.count({
        where: {
          ...where,
          metadata: {
            path: ['isRead'],
            not: true,
          },
        },
      }),
    ]);

    // Format notifications with computed fields
    const notificationsFormatted = notifications.map((notif) => {
      const metadata = notif.metadata as any;
      return {
        ...notif,
        isRead: metadata?.isRead ?? false,
        priority: metadata?.priority ?? 'normal',
        actionUrl: metadata?.actionUrl,
        readAt: metadata?.readAt,
        expiresAt: metadata?.expiresAt,
        // Check if expired
        isExpired:
          metadata?.expiresAt && new Date(metadata.expiresAt) < new Date(),
      };
    });

    return ok({
      notifications: notificationsFormatted,
      pagination: {
        page: q.page,
        limit: q.limit,
        total,
        totalPages: Math.ceil(total / q.limit),
      },
      unreadCount,
    });
  } catch (err) {
    return serverError(String(err));
  }
}

// ---------------------------------------------------------------------------
// POST /api/notifications — Create a notification
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const parsed = createNotificationSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }

    const data = parsed.data;

    // If linked to a lead, verify lead exists and belongs to user's org
    if (data.leadId) {
      const lead = await prisma.lead.findFirst({
        where: { id: data.leadId, orgId: user.orgId, deletedAt: null },
        select: { id: true },
      });
      if (!lead) {
        return badRequest('Lead not found or not accessible');
      }
    }

    // If targeting a specific user, verify user exists in same org
    if (data.userId) {
      const targetUser = await prisma.user.findFirst({
        where: { id: data.userId, orgId: user.orgId, deletedAt: null },
        select: { id: true },
      });
      if (!targetUser) {
        return badRequest('Target user not found or not in your organization');
      }
    }

    // Build metadata for notification features
    const metadata = {
      isRead: false,
      priority: data.priority,
      createdBy: user.id,
      orgId: user.orgId,
    };

    const notification = await prisma.activity.create({
      data: {
        type: data.type,
        title: data.title,
        description: data.description ?? null,
        leadId: data.leadId ?? null,
        userId: data.userId ?? null,
        metadata,
      },
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        metadata: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true } },
      },
    });

    const notifMetadata = (notification.metadata || {}) as Record<string, any>;
    return created({
      ...notification,
      isRead: notifMetadata.isRead ?? false,
      priority: data.priority,
      actionUrl: notifMetadata.actionUrl ?? null,
    });
  } catch (err) {
    return serverError(String(err));
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/notifications — Bulk update notifications (mark as read)
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest) {
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

    const body = await req.json();
    const parsed = bulkUpdateNotificationsSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }

    const data = parsed.data;

    // Verify all notifications are accessible to the user
    const notifications = await prisma.activity.findMany({
      where: {
        id: { in: data.notificationIds },
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

    if (notifications.length !== data.notificationIds.length) {
      return badRequest('Some notifications not found or not accessible');
    }

    // Update each notification's metadata
    const updates = notifications.map((notif) => {
      const currentMetadata = notif.metadata as any;
      const updatedMetadata = {
        ...currentMetadata,
        ...(data.metadata && typeof data.metadata === 'object' ? data.metadata : {}),
      };

      return prisma.activity.update({
        where: { id: notif.id },
        data: { metadata: updatedMetadata },
      });
    });

    await Promise.all(updates);

    return ok({
      message: `${data.notificationIds.length} notifications updated successfully`,
      updated: data.notificationIds.length,
    });
  } catch (err) {
    return serverError(String(err));
  }
}
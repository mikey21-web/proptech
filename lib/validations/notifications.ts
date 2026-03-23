import { z } from 'zod';

/**
 * Notifications validation schemas
 *
 * Per DEBUG.md Section 12: Real-time notifications
 * Uses Activity model as notification system with metadata for read status
 */

// Activity type for notifications
export const notificationTypeSchema = z.enum([
  'call',
  'email',
  'meeting',
  'site_visit',
  'follow_up',
  'note',
  'status_change',
  'document_upload',
  'other',
]);

export const notificationPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);

// Create notification schema
export const createNotificationSchema = z.object({
  type: notificationTypeSchema.default('other'),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  leadId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
  priority: notificationPrioritySchema.default('normal'),
});

// Update notification schema — Activity model has no isRead/readAt, use metadata field instead
export const updateNotificationSchema = z.object({
  metadata: z.record(z.string(), z.any()).optional(),
});

// Query params schema
export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: notificationTypeSchema.optional(),
  userId: z.string().cuid().optional(),
  leadId: z.string().cuid().optional(),
  unreadOnly: z.enum(['true', 'false']).optional(),
  priority: notificationPrioritySchema.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

// Bulk mark as read schema
export const bulkUpdateNotificationsSchema = z.object({
  notificationIds: z.array(z.string().cuid()).min(1).max(50),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type UpdateNotificationInput = z.infer<typeof updateNotificationSchema>;
export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;
export type BulkUpdateNotificationsInput = z.infer<typeof bulkUpdateNotificationsSchema>;
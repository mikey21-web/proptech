import { z } from 'zod';

/**
 * Task validation schemas
 *
 * Per DEBUG.md Section 4: Tasks should have due dates in IST,
 * overdue calculation, and proper assignment.
 */

// Status and Priority enums matching Prisma schema
export const taskStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'cancelled',
]);

export const taskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

// Create task schema
export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  status: taskStatusSchema.default('pending'),
  priority: taskPrioritySchema.default('medium'),
  dueDate: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid date format',
    })
    .optional(),
  leadId: z.string().cuid().optional(),
  assigneeId: z.string().cuid().optional(),
});

// Update task schema
export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  dueDate: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid date format',
    })
    .optional()
    .nullable(),
  leadId: z.string().cuid().optional().nullable(),
  assigneeId: z.string().cuid().optional().nullable(),
});

// Query params schema
export const taskQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  assigneeId: z.string().cuid().optional(),
  leadId: z.string().cuid().optional(),
  search: z.string().max(100).optional(),
  overdue: z.enum(['true', 'false']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskQueryInput = z.infer<typeof taskQuerySchema>;

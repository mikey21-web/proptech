import { z } from 'zod';

// ---------------------------------------------------------------------------
// Create project
// ---------------------------------------------------------------------------

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(255),
  description: z.string().optional().nullable(),
  type: z.enum(['residential', 'commercial', 'mixed', 'plot']).optional().default('residential'),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  pincode: z.string().max(10).optional().nullable(),
  totalArea: z.number().positive().optional().nullable(),
  totalUnits: z.number().int().positive().optional().nullable(),
  launchDate: z.string().optional().nullable(),
  completionDate: z.string().optional().nullable(),
  reraNumber: z.string().max(50).optional().nullable(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

// ---------------------------------------------------------------------------
// Update project
// ---------------------------------------------------------------------------

export const updateProjectSchema = z.object({
  projectId: z.string().cuid('Valid project ID is required'),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  type: z.enum(['residential', 'commercial', 'mixed', 'plot']).optional(),
  status: z.enum(['upcoming', 'under_construction', 'ready_to_move', 'completed', 'on_hold', 'cancelled']).optional(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  pincode: z.string().max(10).optional().nullable(),
  totalArea: z.number().positive().optional().nullable(),
  totalUnits: z.number().int().positive().optional().nullable(),
  launchDate: z.string().optional().nullable(),
  completionDate: z.string().optional().nullable(),
  reraNumber: z.string().max(50).optional().nullable(),
  sitePlanUrl: z.string().optional().nullable(),
  sitePlanWidth: z.number().int().positive().optional().nullable(),
  sitePlanHeight: z.number().int().positive().optional().nullable(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

// ---------------------------------------------------------------------------
// Update unit status (from floor plan editor)
// ---------------------------------------------------------------------------

export const updateUnitStatusSchema = z.object({
  unitId: z.string().cuid('Valid unit ID is required'),
  unitType: z.enum(['plot', 'flat']),
  newStatus: z.enum(['available', 'booked', 'sold', 'blocked']),
  blockedUntil: z.string().datetime().optional().nullable(),
  holdMinutes: z.number().int().positive().max(7 * 24 * 60).optional().nullable(),
  blockReason: z.string().max(255).optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.newStatus === 'blocked' && !data.blockedUntil && !data.holdMinutes) {
    return;
  }

  if (data.newStatus !== 'blocked' && (data.blockedUntil || data.holdMinutes || data.blockReason)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Block metadata can only be set when status is blocked',
      path: ['newStatus'],
    });
  }
});

export type UpdateUnitStatusInput = z.infer<typeof updateUnitStatusSchema>;

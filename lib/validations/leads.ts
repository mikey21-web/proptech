import { z } from 'zod';

// ---------------------------------------------------------------------------
// Create lead
// ---------------------------------------------------------------------------

export const createLeadSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  phone: z
    .string()
    .min(1, 'Phone is required')
    .max(15)
    .regex(/^(\+91)?[6-9]\d{9}$/, 'Invalid Indian mobile number (10 digits starting with 6-9)'),
  email: z.string().email('Invalid email').optional().nullable(),
  altPhone: z.string().max(15).regex(/^(\+91)?[6-9]\d{9}$/, 'Invalid phone number').optional().nullable(),
  status: z
    .enum([
      'new',
      'contacted',
      'qualified',
      'negotiation',
      'site_visit',
      'proposal_sent',
      'won',
      'lost',
      'junk',
    ])
    .optional()
    .default('new'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  budget: z.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  assignedToId: z.string().cuid().optional().nullable(),
  leadSourceId: z.string().cuid().optional().nullable(),
  projectId: z.string().cuid().optional().nullable(),
  customerId: z.string().cuid().optional().nullable(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;

// ---------------------------------------------------------------------------
// Update lead
// ---------------------------------------------------------------------------

export const updateLeadSchema = createLeadSchema.partial();

export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

// ---------------------------------------------------------------------------
// Query params
// ---------------------------------------------------------------------------

export const leadQuerySchema = z.object({
  status: z
    .enum([
      'new',
      'contacted',
      'qualified',
      'negotiation',
      'site_visit',
      'proposal_sent',
      'won',
      'lost',
      'junk',
    ])
    .optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  agentId: z.string().cuid().optional(),
  projectId: z.string().cuid().optional(),
  leadSourceId: z.string().cuid().optional(),
  search: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type LeadQuery = z.infer<typeof leadQuerySchema>;

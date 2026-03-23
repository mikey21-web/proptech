import { z } from 'zod';

/**
 * Site Visits validation schemas
 *
 * Per DEBUG.md Section 5: Site Visits
 * - Schedule with date/time
 * - Google Maps link
 * - WhatsApp confirmation
 */

export const siteVisitStatusSchema = z.enum([
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
  'rescheduled',
]);

// Create site visit schema
export const createSiteVisitSchema = z.object({
  leadId: z.string().cuid('Invalid lead ID'),
  projectId: z.string().cuid('Invalid project ID').optional(),
  scheduledAt: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format',
    }),
  status: siteVisitStatusSchema.default('scheduled'),
  subject: z.string().max(200).optional(), // e.g., "Initial site visit"
  notes: z.string().max(2000).optional(),
  location: z.string().max(500).optional(), // Address or Google Maps link
  attendees: z.string().max(200).optional(), // Who is attending
});

// Update site visit schema
export const updateSiteVisitSchema = z.object({
  scheduledAt: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format',
    })
    .optional(),
  status: siteVisitStatusSchema.optional(),
  subject: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  location: z.string().max(500).optional().nullable(),
  attendees: z.string().max(200).optional().nullable(),
  outcome: z.string().max(500).optional().nullable(), // Visit outcome
});

// Query params schema
export const siteVisitQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  leadId: z.string().cuid().optional(),
  projectId: z.string().cuid().optional(),
  status: siteVisitStatusSchema.optional(),
  userId: z.string().cuid().optional(),
  upcoming: z.enum(['true', 'false']).optional(), // Future visits only
  from: z.string().optional(),
  to: z.string().optional(),
});

export type CreateSiteVisitInput = z.infer<typeof createSiteVisitSchema>;
export type UpdateSiteVisitInput = z.infer<typeof updateSiteVisitSchema>;
export type SiteVisitQueryInput = z.infer<typeof siteVisitQuerySchema>;

import { z } from 'zod';

/**
 * Call Logs validation schemas
 *
 * Per DEBUG.md Section 3: Call Logs
 * - Manual logging with duration and outcome
 * - AI transcription placeholder
 * - Lead lastContacted update
 */

// Communication type for calls
export const communicationDirectionSchema = z.enum(['inbound', 'outbound']);

export const callOutcomeSchema = z.string().optional();

// Create call log schema
export const createCallLogSchema = z.object({
  leadId: z.string().cuid('Invalid lead ID'),
  direction: communicationDirectionSchema.default('outbound'),
  duration: z.number().int().min(0).optional(), // duration in seconds
  outcome: callOutcomeSchema.optional(),
  subject: z.string().max(200).optional(),
  body: z.string().max(5000).optional(), // call notes
  phoneNumber: z.string().max(20).optional(), // which number was called
});

// Update call log schema
export const updateCallLogSchema = z.object({
  direction: communicationDirectionSchema.optional(),
  duration: z.number().int().min(0).optional(),
  outcome: callOutcomeSchema.optional(),
  subject: z.string().max(200).optional(),
  body: z.string().max(5000).optional().nullable(),
});

// Query params schema
export const callLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  leadId: z.string().cuid().optional(),
  direction: communicationDirectionSchema.optional(),
  outcome: callOutcomeSchema.optional(),
  userId: z.string().cuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type CreateCallLogInput = z.infer<typeof createCallLogSchema>;
export type UpdateCallLogInput = z.infer<typeof updateCallLogSchema>;
export type CallLogQueryInput = z.infer<typeof callLogQuerySchema>;

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Create agent
// ---------------------------------------------------------------------------

export const createAgentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email'),
  phone: z.string().max(15).regex(/^(\+91)?[6-9]\d{9}$/, 'Invalid Indian mobile number').optional().nullable(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional().nullable(),
  agentCode: z.string().min(1, 'Agent code is required').max(20),
  reraNumber: z.string().max(50).optional().nullable(),
  panNumber: z.string().max(10).regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN format').optional().nullable(),
  bankAccount: z.string().max(20).optional().nullable(),
  ifscCode: z.string().max(11).regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC format').optional().nullable(),
  bankName: z.string().max(100).optional().nullable(),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;

// ---------------------------------------------------------------------------
// Update agent
// ---------------------------------------------------------------------------

export const updateAgentSchema = z.object({
  agentId: z.string().cuid('Valid agent ID is required'),
  isActive: z.boolean().optional(),
  name: z.string().min(1).max(255).optional(),
  phone: z.string().max(15).regex(/^(\+91)?[6-9]\d{9}$/, 'Invalid Indian mobile number').optional().nullable(),
  reraNumber: z.string().max(50).optional().nullable(),
  panNumber: z.string().max(10).regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN format').optional().nullable(),
  bankAccount: z.string().max(20).optional().nullable(),
  ifscCode: z.string().max(11).regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC format').optional().nullable(),
  bankName: z.string().max(100).optional().nullable(),
});

export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;

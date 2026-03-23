import { z } from 'zod';

// ---------------------------------------------------------------------------
// Create customer
// ---------------------------------------------------------------------------

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  phone: z.string().min(1, 'Phone is required').max(20),
  email: z.string().email('Invalid email').optional().nullable(),
  altPhone: z.string().max(20).optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  pincode: z.string().max(10).optional().nullable(),
  dateOfBirth: z.string().datetime().optional().nullable(),
  panNumber: z.string().max(10).optional().nullable(),
  aadhaarNumber: z.string().max(12).optional().nullable(),
  gstNumber: z.string().max(15).optional().nullable(),
  occupation: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

// ---------------------------------------------------------------------------
// Update customer
// ---------------------------------------------------------------------------

export const updateCustomerSchema = createCustomerSchema.partial();

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

// ---------------------------------------------------------------------------
// Query params
// ---------------------------------------------------------------------------

export const customerQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type CustomerQuery = z.infer<typeof customerQuerySchema>;

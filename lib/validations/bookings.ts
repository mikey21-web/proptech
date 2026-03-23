import { z } from 'zod';

// ---------------------------------------------------------------------------
// Create booking
// ---------------------------------------------------------------------------

export const createBookingSchema = z.object({
  customerId: z.string().cuid('Valid customer ID is required'),
  projectId: z.string().cuid('Valid project ID is required'),
  plotId: z.string().cuid().optional().nullable(),
  flatId: z.string().cuid().optional().nullable(),
  agentId: z.string().cuid().optional().nullable(),
  bookingDate: z.string().datetime(),
  totalAmount: z.number().positive('Total amount must be positive'),
  netAmount: z.number().positive('Net amount is required'),
  discountAmount: z.number().min(0).optional().default(0),
  gstAmount: z.number().min(0).optional().default(0),
  stampDuty: z.number().min(0).optional().default(0),
  registrationFee: z.number().min(0).optional().default(0),
  remarks: z.string().optional().nullable(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

// ---------------------------------------------------------------------------
// Update booking
// ---------------------------------------------------------------------------

export const updateBookingSchema = z.object({
  status: z
    .enum([
      'pending',
      'confirmed',
      'agreement_signed',
      'registration_done',
      'possession_given',
      'cancelled',
      'refunded',
    ])
    .optional(),
  agreementDate: z.string().datetime().optional().nullable(),
  registrationDate: z.string().datetime().optional().nullable(),
  possessionDate: z.string().datetime().optional().nullable(),
  discountAmount: z.number().min(0).optional(),
  remarks: z.string().optional().nullable(),
});

export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;

// ---------------------------------------------------------------------------
// Query params
// ---------------------------------------------------------------------------

export const bookingQuerySchema = z.object({
  status: z
    .enum([
      'pending',
      'confirmed',
      'agreement_signed',
      'registration_done',
      'possession_given',
      'cancelled',
      'refunded',
    ])
    .optional(),
  projectId: z.string().cuid().optional(),
  customerId: z.string().cuid().optional(),
  agentId: z.string().cuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type BookingQuery = z.infer<typeof bookingQuerySchema>;

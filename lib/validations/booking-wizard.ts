import { z } from 'zod';

export const bookingWizardSessionSchema = z.object({
  sessionId: z.string().cuid(),
  step: z.number().min(1).max(7),
  plotId: z.string().cuid().optional(),
  projectId: z.string().cuid(),
  customerId: z.string().cuid().optional(),
  coApplicantData: z.any().optional(),
  pricingData: z.any().optional(),
  installmentSchedule: z.any().optional(),
  documentsUploaded: z.array(z.string()).default([]),
  createdAt: z.date(),
  expiresAt: z.date(),
  status: z.enum(['draft', 'confirmed']).default('draft'),
});

// Step 1: Plot Selection
export const step1PlotSelectionSchema = z.object({
  plotId: z.string().cuid('Plot must be selected'),
  projectId: z.string().cuid('Project must be selected'),
});

export type Step1PlotSelection = z.infer<typeof step1PlotSelectionSchema>;

// Step 2: Customer Details (New or Existing)
export const step2CustomerDetailsSchema = z.object({
  customerId: z.string().cuid().optional(), // existing customer
  // OR new customer details:
  name: z.string().min(3, 'Name must be at least 3 characters'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
  email: z.string().email().optional(),
  altPhone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number').optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits').optional(),
  dateOfBirth: z.string().optional(),
  panNumber: z.string().optional(),
  aadhaarNumber: z.string().optional(),
  occupation: z.string().optional(),
  companyName: z.string().optional(),
});

export type Step2CustomerDetails = z.infer<typeof step2CustomerDetailsSchema>;

// Step 3: Co-Applicant (Optional)
export const step3CoApplicantSchema = z.object({
  isApplicable: z.boolean(),
  name: z.string().min(3).optional(),
  relation: z.string().optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  email: z.string().email().optional(),
  aadhaarNumber: z.string().optional(),
  panNumber: z.string().optional(),
});

export type Step3CoApplicant = z.infer<typeof step3CoApplicantSchema>;

// Step 4: Pricing & Payment Plan
export const step4PricingSchema = z.object({
  basePrice: z.number().positive('Price must be positive'),
  discountAmount: z.number().min(0).default(0),
  gstAmount: z.number().min(0).default(0),
  stampDuty: z.number().min(0).default(0),
  registrationFee: z.number().min(0).default(0),
  netAmount: z.number().positive(),
  paymentPlanType: z.enum(['full_payment', 'installment']),
  downPaymentAmount: z.number().min(0).optional(), // if installment
  numberOfInstallments: z.number().min(1).max(120).optional(), // if installment
  installmentFrequency: z.enum(['monthly', 'quarterly', 'semi_annual']).optional(),
});

export type Step4Pricing = z.infer<typeof step4PricingSchema>;

// Step 5: Installment Schedule
export const installmentItemSchema = z.object({
  installmentNo: z.number().min(1),
  dueDate: z.date(),
  amount: z.number().positive(),
  status: z.enum(['upcoming', 'due', 'overdue', 'paid', 'partially_paid', 'waived', 'cancelled']).default('upcoming'),
});

export const step5InstallmentScheduleSchema = z.object({
  installments: z.array(installmentItemSchema).min(1),
  totalAmount: z.number().positive(),
});

export type Step5InstallmentSchedule = z.infer<typeof step5InstallmentScheduleSchema>;

// Step 6: Document Upload
export const step6DocumentSchema = z.object({
  documentId: z.string().cuid(),
  type: z.enum(['aadhaar', 'pan', 'passport', 'driving_license', 'voter_id', 'bank_statement', 'salary_slip', 'itr', 'property_document', 'agreement', 'receipt', 'photo', 'other']),
  fileUrl: z.string().url(),
  fileName: z.string(),
  fileSize: z.number().max(10 * 1024 * 1024), // 10MB
});

export const step6DocumentsUploadSchema = z.object({
  documents: z.array(step6DocumentSchema),
});

export type Step6DocumentsUpload = z.infer<typeof step6DocumentsUploadSchema>;

// Step 7: Review & Confirm
export const step7ConfirmSchema = z.object({
  agentId: z.string().cuid().optional(),
  remarks: z.string().optional(),
  termsAccepted: z.boolean().refine((val) => val === true, 'Must accept terms'),
});

export type Step7Confirm = z.infer<typeof step7ConfirmSchema>;

// Full booking review (all steps combined)
export const bookingReviewSchema = z.object({
  plot: z.object({
    id: z.string(),
    plotNumber: z.string(),
    area: z.number(),
    price: z.number(),
    facing: z.string().optional(),
  }),
  customer: z.object({
    id: z.string().optional(),
    name: z.string(),
    phone: z.string(),
    email: z.string().optional(),
  }),
  coApplicant: z.any().optional(),
  pricing: step4PricingSchema,
  installments: z.array(installmentItemSchema),
  documents: z.array(step6DocumentSchema),
});

export type BookingReview = z.infer<typeof bookingReviewSchema>;

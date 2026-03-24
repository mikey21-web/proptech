export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireCustomerAuth } from '@/lib/customer';
import { ok, badRequest, created, serverError } from '@/lib/api-response';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// GET /api/customer/documents — Customer's uploaded documents
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const auth = await requireCustomerAuth();
    if (auth.error) return auth.error;

    const documents = await prisma.customerDocument.findMany({
      where: { customerId: auth.customerId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        documentNo: true,
        fileUrl: true,
        fileName: true,
        fileSize: true,
        isVerified: true,
        verifiedAt: true,
        expiryDate: true,
        createdAt: true,
      },
    });

    // Required documents checklist
    const required = [
      { type: 'aadhaar', label: 'Aadhaar Card', required: true },
      { type: 'pan', label: 'PAN Card', required: true },
      { type: 'photo', label: 'Passport Photo', required: true },
      { type: 'bank_statement', label: 'Bank Statement', required: false },
      { type: 'salary_slip', label: 'Salary Slip', required: false },
      { type: 'itr', label: 'Income Tax Return', required: false },
    ];

    const checklist = required.map((r) => {
      const doc = documents.find((d) => d.type === r.type);
      return {
        ...r,
        uploaded: !!doc,
        verified: doc?.isVerified ?? false,
        document: doc ?? null,
      };
    });

    const totalRequired = required.filter((r) => r.required).length;
    const uploadedRequired = checklist.filter(
      (c) => c.required && c.uploaded,
    ).length;

    return ok({
      documents,
      checklist,
      summary: {
        total: documents.length,
        verified: documents.filter((d) => d.isVerified).length,
        pending: documents.filter((d) => !d.isVerified).length,
        requiredCompleted: uploadedRequired,
        requiredTotal: totalRequired,
      },
    });
  } catch (err) {
    return serverError(String(err));
  }
}

// ---------------------------------------------------------------------------
// POST /api/customer/documents — Upload document metadata
// ---------------------------------------------------------------------------

const uploadDocSchema = z.object({
  type: z.enum([
    'aadhaar',
    'pan',
    'passport',
    'driving_license',
    'voter_id',
    'bank_statement',
    'salary_slip',
    'itr',
    'property_document',
    'agreement',
    'receipt',
    'photo',
    'other',
  ]),
  documentNo: z.string().optional(),
  fileUrl: z.string().url('Valid file URL is required'),
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z
    .number()
    .max(5 * 1024 * 1024, 'File must be under 5MB')
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireCustomerAuth();
    if (auth.error) return auth.error;

    const body = await req.json();
    const parsed = uploadDocSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }

    const data = parsed.data;

    // Validate file extension
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = data.fileName.toLowerCase().slice(data.fileName.lastIndexOf('.'));
    if (!allowedExtensions.includes(ext)) {
      return badRequest('Only PDF, JPG, and PNG files are allowed');
    }

    const document = await prisma.customerDocument.create({
      data: {
        type: data.type,
        documentNo: data.documentNo ?? null,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize ?? null,
        isVerified: false,
        customerId: auth.customerId,
      },
      select: {
        id: true,
        type: true,
        fileName: true,
        fileSize: true,
        isVerified: true,
        createdAt: true,
      },
    });

    return created(document);
  } catch (err) {
    return serverError(String(err));
  }
}

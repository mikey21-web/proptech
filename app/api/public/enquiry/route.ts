import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, badRequest, serverError } from '@/lib/api-response';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const enquirySchema = z.object({
  name: z.string().min(2, 'Name is required'),
  phone: z.string().min(10, 'Valid phone number required'),
  email: z.string().email('Valid email required').optional().or(z.literal('')),
  message: z.string().optional(),
  projectSlug: z.string().optional(),
  unitId: z.string().optional(),
  unitType: z.enum(['plot', 'flat']).optional(),
  source: z.string().default('website'),
});

async function getPublicOrgId(): Promise<string | null> {
  const envId = process.env.PUBLIC_ORG_ID;
  if (envId) return envId;
  const org = await prisma.organization.findFirst({ select: { id: true } });
  return org?.id ?? null;
}

// POST /api/public/enquiry — Submit a buyer enquiry (creates a lead)
export async function POST(req: NextRequest) {
  try {
    const orgId = await getPublicOrgId();
    if (!orgId) return badRequest('Service unavailable');

    const body = await req.json();
    const parsed = enquirySchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues.map((i) => i.message).join(', '));
    }

    const { name, phone, email, message, projectSlug, unitId, unitType, source } = parsed.data;

    // Resolve project if slug given
    let projectId: string | null = null;
    if (projectSlug) {
      const project = await prisma.project.findFirst({
        where: { slug: projectSlug, orgId, deletedAt: null },
        select: { id: true },
      });
      projectId = project?.id ?? null;
    }

    // Build notes from unit interest
    let notes = message || '';
    if (unitId && unitType) {
      notes = `Interested in ${unitType} unit ID: ${unitId}. ${notes}`.trim();
    }

    // Find a default lead source for "website"
    const leadSource = await prisma.leadSource.findFirst({
      where: { orgId, name: { contains: 'website', mode: 'insensitive' } },
      select: { id: true },
    });

    const lead = await prisma.lead.create({
      data: {
        name,
        phone,
        email: email || null,
        status: 'new',
        priority: 'medium',
        source: source,
        leadSourceId: leadSource?.id ?? null,
        projectId,
        notes: notes || null,
        orgId,
      },
    });

    return ok({ id: lead.id, message: 'Thank you! Our team will contact you shortly.' });
  } catch (err) {
    return serverError(String(err));
  }
}

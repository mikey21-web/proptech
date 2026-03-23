import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { WebhookEvent } from '@prisma/client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.nativeEnum(WebhookEvent)).min(1),
  secret: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  retryPolicy: z.object({
    maxRetries: z.number().min(0).max(10),
    backoffMs: z.number().min(100),
  }).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(['super_admin', 'admin']);
    if (!auth.authorized)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = auth.user!;

    // Get all webhooks for this organization
    const webhooks = await prisma.webhook.findMany({
      where: {
        orgId: user.orgId,
        deletedAt: null,
      },
      select: {
        id: true,
        url: true,
        event: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(webhooks);
  } catch (error) {
    console.error('Fetch webhooks error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhooks' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(['super_admin', 'admin']);
    if (!auth.authorized)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = auth.user!;

    const body = await req.json();
    const data = createWebhookSchema.parse(body);

    // Create webhook
    const webhook = await prisma.webhook.create({
      data: {
        url: data.url,
        event: data.events[0],
        secret: data.secret,
        headers: data.headers as Record<string, string> | undefined,
        isActive: true,
        orgId: user.orgId,
      },
    });

    return NextResponse.json(
      {
        id: webhook.id,
        url: webhook.url,
        event: webhook.event,
        isActive: webhook.isActive,
        createdAt: webhook.createdAt,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error('Create webhook error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to create webhook' },
      { status: 500 },
    );
  }
}

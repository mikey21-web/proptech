import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createWizardSession, getWizardSession } from '@/lib/booking-wizard-session';
import { RateLimiter } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const limiter = new RateLimiter('booking_wizard');

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth([
      'super_admin',
      'admin',
      'sales_manager',
      'backoffice',
      'agent',
    ]);
    if (!auth.authorized)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = auth.user!;

    // Rate limit: 5 sessions per user per hour
    const canProceed = await limiter.checkLimit(user.id, 5, 3600);
    if (!canProceed)
      return NextResponse.json(
        { error: 'Too many sessions started. Please try again later.' },
        { status: 429 },
      );

    const { projectId } = await req.json();

    // Verify project exists and user has access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        orgId: user.orgId,
        deletedAt: null,
      },
    });

    if (!project)
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    // Create new session
    const wizardSession = await createWizardSession(projectId, user.id);

    return NextResponse.json({
      sessionId: wizardSession.sessionId,
      step: 1,
    });
  } catch (error) {
    console.error('Booking wizard session error:', error);
    return NextResponse.json(
      { error: 'Failed to create wizard session' },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth([
      'super_admin',
      'admin',
      'sales_manager',
      'backoffice',
      'agent',
    ]);
    if (!auth.authorized)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = auth.user!;

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId)
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 },
      );

    const wizardSession = await getWizardSession(sessionId);
    if (!wizardSession)
      return NextResponse.json(
        { error: 'Session expired or not found' },
        { status: 404 },
      );

    if (wizardSession.metadata?.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(wizardSession);
  } catch (error) {
    console.error('Booking wizard session fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wizard session' },
      { status: 500 },
    );
  }
}

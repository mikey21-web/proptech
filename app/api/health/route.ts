import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Health check endpoint — public but minimal info.
 * GET /api/health
 */

export async function GET() {
  let dbOk = false;
  let dbLatency = 0;

  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - start;
    dbOk = true;
  } catch {
    // db down
  }

  const status = dbOk ? 'ok' : 'error';

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: dbOk ? 'ok' : 'error', latency: dbOk ? dbLatency : undefined },
      },
    },
    {
      status: dbOk ? 200 : 503,
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    },
  );
}

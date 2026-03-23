import { prisma } from '@/lib/prisma';

type PrismaLike = typeof prisma;

const DEFAULT_HOLD_MINUTES = 24 * 60;

export function resolveBlockedUntil(input?: {
  blockedUntil?: string | null;
  holdMinutes?: number | null;
}): Date {
  if (input?.blockedUntil) {
    const parsed = new Date(input.blockedUntil);
    if (!Number.isNaN(parsed.getTime()) && parsed.getTime() > Date.now()) {
      return parsed;
    }
  }

  const holdMinutes = input?.holdMinutes && input.holdMinutes > 0
    ? input.holdMinutes
    : DEFAULT_HOLD_MINUTES;

  return new Date(Date.now() + holdMinutes * 60 * 1000);
}

export function isExpiredBlock(status: string, blockedUntil?: Date | string | null): boolean {
  if (status !== 'blocked' || !blockedUntil) {
    return false;
  }

  return new Date(blockedUntil).getTime() <= Date.now();
}

export async function releaseExpiredInventoryBlocks(client: PrismaLike = prisma) {
  const now = new Date();

  const [plots, flats] = await client.$transaction([
    client.plot.updateMany({
      where: {
        status: 'blocked',
        blockedUntil: { lte: now },
        deletedAt: null,
      },
      data: {
        status: 'available',
        blockedUntil: null,
        blockReason: null,
      },
    }),
    client.flat.updateMany({
      where: {
        status: 'blocked',
        blockedUntil: { lte: now },
        deletedAt: null,
      },
      data: {
        status: 'available',
        blockedUntil: null,
        blockReason: null,
      },
    }),
  ]);

  return {
    plotsReleased: plots.count,
    flatsReleased: flats.count,
    totalReleased: plots.count + flats.count,
    processedAt: now.toISOString(),
  };
}

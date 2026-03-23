import { PrismaClient } from '@prisma/client';

// Prisma v7 compatible singleton pattern
// In v7, the connection URL is passed via the PrismaClient constructor
// or via the adapter pattern in prisma.config.ts for migrations.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;

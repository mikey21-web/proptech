import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
  });
}

// Lazy proxy — PrismaClient is only instantiated on first property access
// This prevents build-time failures when the module is imported but not used
const handler: ProxyHandler<object> = {
  get(_target, prop) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient();
    }
    const client = globalForPrisma.prisma;
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
};

export const prisma = new Proxy({}, handler) as PrismaClient;

export default prisma;

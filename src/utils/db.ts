import { PrismaClient } from '@prisma/client';
// npx prisma generate (caso o prismaclient não esteja funcionando)
declare global {
  var prisma: PrismaClient | undefined;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
};

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}
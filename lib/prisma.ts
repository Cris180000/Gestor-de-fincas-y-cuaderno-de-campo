/**
 * Cliente de Prisma (singleton) para uso en API routes o server components.
 * Evita múltiples instancias en desarrollo con hot reload.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

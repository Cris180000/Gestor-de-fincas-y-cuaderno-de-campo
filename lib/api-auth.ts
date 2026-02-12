import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth.config";
import type { PrismaClient } from "@prisma/client";

export async function getSessionUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

/** Finca del usuario o null si no existe / no es suya */
export async function getFincaForUser(
  prisma: PrismaClient,
  fincaId: string,
  userId: string
) {
  return prisma.finca.findFirst({
    where: { id: fincaId, userId },
    include: { parcelas: true },
  });
}

/** Parcela del usuario (vía finca) o null */
export async function getParcelaForUser(
  prisma: PrismaClient,
  parcelaId: string,
  userId: string
) {
  return prisma.parcela.findFirst({
    where: { id: parcelaId, finca: { userId } },
    include: { finca: true },
  });
}

/** Labor del usuario (vía parcela → finca) o null */
export async function getLaborForUser(
  prisma: PrismaClient,
  laborId: string,
  userId: string
) {
  return prisma.labor.findFirst({
    where: { id: laborId, parcela: { finca: { userId } } },
    include: { parcela: { include: { finca: true } } },
  });
}

/** Coste del usuario o null */
export async function getCosteForUser(
  prisma: PrismaClient,
  costeId: string,
  userId: string
) {
  return prisma.coste.findFirst({
    where: { id: costeId, userId },
    include: { finca: true, parcela: true },
  });
}

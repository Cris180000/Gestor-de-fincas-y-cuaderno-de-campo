/**
 * Servicio de resultados de recomendaciones (feedback loop).
 * Registra si el usuario aceptó o rechazó una recomendación y opcionalmente si funcionó.
 */

import { prisma } from "@/lib/prisma";

export interface RecordOutcomeInput {
  recommendationId: string;
  recommendationType: string;
  action: "accepted" | "rejected";
  worked?: boolean;
}

export async function recordOutcome(userId: string, input: RecordOutcomeInput): Promise<void> {
  await prisma.recommendationOutcome.create({
    data: {
      userId,
      recommendationId: input.recommendationId,
      recommendationType: input.recommendationType,
      action: input.action,
      worked: input.worked ?? null,
    },
  });
}

export interface OutcomeStatsRow {
  recommendationType: string;
  total: number;
  accepted: number;
  rejected: number;
  worked: number;
  notWorked: number;
}

/**
 * Devuelve estadísticas agregadas por tipo de recomendación para el usuario.
 */
export async function getOutcomeStats(userId: string): Promise<OutcomeStatsRow[]> {
  const rows = await prisma.recommendationOutcome.findMany({
    where: { userId },
    select: {
      recommendationType: true,
      action: true,
      worked: true,
    },
  });

  const byType = new Map<string, { total: number; accepted: number; rejected: number; worked: number; notWorked: number }>();

  for (const r of rows) {
    let row = byType.get(r.recommendationType);
    if (!row) {
      row = { total: 0, accepted: 0, rejected: 0, worked: 0, notWorked: 0 };
      byType.set(r.recommendationType, row);
    }
    row.total++;
    if (r.action === "accepted") row.accepted++;
    else row.rejected++;
    if (r.worked === true) row.worked++;
    if (r.worked === false) row.notWorked++;
  }

  return Array.from(byType.entries()).map(([recommendationType, counts]) => ({
    recommendationType,
    ...counts,
  }));
}

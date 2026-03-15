/**
 * Servicio de alertas agronómicas: genera alertas desde el motor agronómico
 * y las persiste en BD. Las vistas (Home, Parcela) consumen vía API.
 */

import { prisma } from "@/lib/prisma";
import { evaluateAgronomicRisk, type AgronomicRecommendation } from "./agronomic-engine";

export type AlertPriority = "critical" | "high" | "medium";
export type AlertStatus = "new" | "seen" | "dismissed" | "actioned";

export interface AlertDto {
  id: string;
  parcelId: string | null;
  priority: AlertPriority;
  title: string;
  message: string;
  recommendationType: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  expiresAt: string;
  status: AlertStatus;
  createdAt: string;
}

function recToTitle(rec: AgronomicRecommendation): string {
  if (rec.type === "spray_window") {
    return rec.riskLevel === "critical" ? "Tratamiento no recomendado" : "Ventana de pulverización";
  }
  if (rec.type === "water_stress") return "Posible estrés hídrico";
  if (rec.type === "disease_risk") return "Seguimiento de diagnóstico";
  return "Recomendación agronómica";
}

/**
 * Genera y persiste alertas para una ubicación (lat, lon). El cliente llama con las coordenadas
 * que tiene (ej. primera parcela con coords desde catastro). No duplica alertas del mismo tipo recientes.
 */
export async function generateAlertsForLocation(
  userId: string,
  lat: number,
  lon: number,
  context?: { parcelId?: string; parcelName?: string; cultivo?: string }
): Promise<AlertDto[]> {
  const now = new Date();
  const windowMs = 6 * 60 * 60 * 1000; // 6 h: no repetir misma alerta
  const created: AlertDto[] = [];

  const recommendations = await evaluateAgronomicRisk(lat, lon, context);
  for (const rec of recommendations) {
    if (new Date(rec.expiresAt) < now) continue;
    const existing = await prisma.agronomicAlert.findFirst({
      where: {
        userId,
        parcelId: context?.parcelId ?? null,
        recommendationType: rec.type,
        status: { in: ["new", "seen"] },
        createdAt: { gte: new Date(now.getTime() - windowMs) },
      },
    });
    if (existing) continue;

    const priority = rec.riskLevel === "critical" ? "critical" : rec.riskLevel === "high" ? "high" : "medium";
    const row = await prisma.agronomicAlert.create({
      data: {
        userId,
        parcelId: context?.parcelId ?? null,
        priority,
        title: recToTitle(rec),
        message: rec.why,
        recommendationType: rec.type,
        ctaLabel: rec.cta?.label ?? null,
        ctaHref: rec.cta?.href ?? null,
        expiresAt: new Date(rec.expiresAt),
        status: "new",
      },
    });
    created.push({
      id: row.id,
      parcelId: row.parcelId,
      priority: row.priority as AlertPriority,
      title: row.title,
      message: row.message,
      recommendationType: row.recommendationType,
      ctaLabel: row.ctaLabel,
      ctaHref: row.ctaHref,
      expiresAt: row.expiresAt.toISOString(),
      status: row.status as AlertStatus,
      createdAt: row.createdAt.toISOString(),
    });
  }
  return created;
}

/**
 * Lista alertas activas (no expiradas, no dismissed) del usuario.
 */
export async function listAlertsForUser(
  userId: string,
  options: { parcelId?: string; status?: AlertStatus; limit?: number } = {}
): Promise<AlertDto[]> {
  const where: { userId: string; expiresAt: { gte: Date }; parcelId?: string; status?: AlertStatus } = {
    userId,
    expiresAt: { gte: new Date() },
  };
  if (options.parcelId) where.parcelId = options.parcelId;
  if (options.status) where.status = options.status;
  const rows = await prisma.agronomicAlert.findMany({
    where,
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: options.limit ?? 20,
  });
  return rows.map((r) => ({
    id: r.id,
    parcelId: r.parcelId,
    priority: r.priority as AlertPriority,
    title: r.title,
    message: r.message,
    recommendationType: r.recommendationType,
    ctaLabel: r.ctaLabel,
    ctaHref: r.ctaHref,
    expiresAt: r.expiresAt.toISOString(),
    status: r.status as AlertStatus,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function updateAlertStatus(
  alertId: string,
  userId: string,
  status: AlertStatus
): Promise<boolean> {
  const r = await prisma.agronomicAlert.updateMany({
    where: { id: alertId, userId },
    data: { status },
  });
  return r.count > 0;
}

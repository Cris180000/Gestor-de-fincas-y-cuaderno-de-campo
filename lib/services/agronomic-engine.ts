/**
 * Motor central de decisión agronómica.
 * Combina clima (ventana de pulverización), sensores y contexto para emitir
 * recomendaciones con contrato estándar: riskLevel, recommendedAction, why, confidence, expiresAt.
 */

import { getSprayWindow, type SprayWindowSlot, type SpraySuitability } from "./weather-service";

export type RiskLevel = "critical" | "high" | "medium" | "low" | "none";

export interface AgronomicRecommendation {
  id: string;
  riskLevel: RiskLevel;
  recommendedAction: string;
  why: string;
  confidence: number;
  expiresAt: string;
  /** Tipo de recomendación para CTAs (e.g. "spray_window" -> enlace a ventana) */
  type: "spray_window" | "water_stress" | "disease_risk" | "treatment_timing" | "other";
  /** Parcela/finca opcional para enlazar */
  parcelId?: string;
  /** CTA principal: { label, href } */
  cta?: { label: string; href: string };
}

export interface AgronomicContext {
  parcelId?: string;
  parcelName?: string;
  cultivo?: string;
  /** Últimas 24h de telemetría (ej. humedad suelo %) para estrés hídrico */
  lastSensorValues?: { value: number; unit: string; timestamp: string }[];
  /** Si hay diagnóstico reciente de enfermedad en esta parcela */
  recentDiagnosis?: { disease_name: string; urgency: string };
}

const HOURS_LOOKAHEAD = 24;

function slotToRiskLevel(s: SpraySuitability): RiskLevel {
  if (s === "FORBIDDEN") return "critical";
  if (s === "WARNING") return "high";
  return "low";
}

function buildSprayRecommendation(
  slots: SprayWindowSlot[],
  context: AgronomicContext | undefined
): AgronomicRecommendation[] {
  const out: AgronomicRecommendation[] = [];
  const now = new Date();
  const slice = slots.slice(0, Math.min(HOURS_LOOKAHEAD, slots.length));
  const forbidden = slice.filter((s) => s.suitability === "FORBIDDEN");
  const warning = slice.filter((s) => s.suitability === "WARNING");
  const optimal = slice.filter((s) => s.suitability === "OPTIMAL");

  if (forbidden.length >= slice.length * 0.5) {
    const first = forbidden[0];
    out.push({
      id: `spray-forbidden-${now.getTime()}`,
      riskLevel: "critical",
      recommendedAction: "No aplicar tratamientos fitosanitarios en las próximas 24 h",
      why: first?.reason ?? "Condiciones adversas (viento/lluvia) en la mayoría de las horas.",
      confidence: 90,
      expiresAt: new Date(now.getTime() + HOURS_LOOKAHEAD * 60 * 60 * 1000).toISOString(),
      type: "spray_window",
      parcelId: context?.parcelId,
      cta: { label: "Ver ventana de pulverización", href: context?.parcelId ? `/parcelas/${context.parcelId}#spray` : "/" },
    });
  } else if (forbidden.length > 0 || warning.length > slice.length * 0.3) {
    const bestWindow = optimal.length > 0 ? optimal : warning;
    const first = bestWindow[0];
    const last = bestWindow[bestWindow.length - 1];
    const start = first ? new Date(first.hour).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "";
    const end = last ? new Date(last.hour).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "";
    out.push({
      id: `spray-window-${now.getTime()}`,
      riskLevel: warning.length > 0 ? "high" : "medium",
      recommendedAction: optimal.length > 0
        ? `Ventana recomendada para tratar: ${start}–${end}`
        : "Precaución: solo algunas horas con condiciones aceptables.",
      why: first?.reason ?? "Revisa viento y lluvia por hora.",
      confidence: 85,
      expiresAt: new Date(now.getTime() + HOURS_LOOKAHEAD * 60 * 60 * 1000).toISOString(),
      type: "spray_window",
      parcelId: context?.parcelId,
      cta: { label: "Ver ventana de pulverización", href: context?.parcelId ? `/parcelas/${context.parcelId}#spray` : "/" },
    });
  }

  return out;
}

/**
 * Evalúa riesgo agronómico para una ubicación (y opcionalmente parcela/cultivo/sensores).
 * Devuelve recomendaciones con el contrato estándar.
 */
export async function evaluateAgronomicRisk(
  lat: number,
  lon: number,
  context?: AgronomicContext
): Promise<AgronomicRecommendation[]> {
  const recommendations: AgronomicRecommendation[] = [];

  try {
    const slots = await getSprayWindow(lat, lon);
    const sprayRecs = buildSprayRecommendation(slots, context);
    recommendations.push(...sprayRecs);
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[agronomic-engine] getSprayWindow failed:", e);
    }
  }

  // Estrés hídrico: si hay sensores de humedad bajos
  if (context?.lastSensorValues?.length) {
    const humidity = context.lastSensorValues.filter((v) => v.unit === "%");
    const avg = humidity.length ? humidity.reduce((a, v) => a + v.value, 0) / humidity.length : 0;
    if (avg > 0 && avg < 25) {
      recommendations.push({
        id: `water-stress-${Date.now()}`,
        riskLevel: "high",
        recommendedAction: "Posible estrés hídrico: humedad del suelo baja.",
        why: `Humedad media reciente: ${avg.toFixed(0)}%. Considera riego o revisar sensores.`,
        confidence: 70,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        type: "water_stress",
        parcelId: context.parcelId,
        cta: context.parcelId ? { label: "Ver parcela", href: `/parcelas/${context.parcelId}` } : undefined,
      });
    }
  }

  // Riesgo de reaparición de patología (si hay diagnóstico reciente)
  if (context?.recentDiagnosis && context.recentDiagnosis.urgency === "high") {
    recommendations.push({
      id: `disease-followup-${Date.now()}`,
      riskLevel: "medium",
      recommendedAction: `Seguimiento recomendado: ${context.recentDiagnosis.disease_name}`,
      why: "Diagnóstico reciente de alta urgencia. Programar revisión o segundo tratamiento según el plan.",
      confidence: 75,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      type: "disease_risk",
      parcelId: context.parcelId,
      cta: { label: "Crear tarea de seguimiento", href: `/labores?openForm=1&tipo=tratamiento&parcelaId=${context.parcelId ?? ""}` },
    });
  }

  return recommendations;
}

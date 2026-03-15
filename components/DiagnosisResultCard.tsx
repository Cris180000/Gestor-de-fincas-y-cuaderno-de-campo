"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { CropDiagnosisResult } from "@/app/actions/analyze-crop";

export interface DiagnosisResultCardProps {
  result: CropDiagnosisResult;
  parcelaId?: string;
}

function UrgencyBadge({ urgency }: { urgency: "low" | "medium" | "high" }) {
  const config = {
    low: { label: "Baja", className: "bg-green-100 text-green-800 border-green-200" },
    medium: { label: "Media", className: "bg-amber-100 text-amber-800 border-amber-200" },
    high: { label: "Alta", className: "bg-red-100 text-red-800 border-red-200" },
  };
  const { label, className } = config[urgency] ?? config.medium;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export function DiagnosisResultCard({ result, parcelaId }: DiagnosisResultCardProps) {
  const [openSection, setOpenSection] = useState<"organic" | "chemical" | "plan" | "checklist" | null>("organic");

  const confidence = Math.max(0, Math.min(100, result.confidence ?? 0));
  const organicText = result.treatments?.organic ?? "";
  const chemicalText = result.treatments?.chemical ?? "";
  const descripcionLabor = [
    `Enfermedad detectada: ${result.disease_name}.`,
    result.description ? ` ${result.description.trim().slice(0, 200)}${result.description.length > 200 ? "…" : ""}` : "",
    organicText ? ` Tratamiento ecológico sugerido: ${organicText.slice(0, 300)}${organicText.length > 300 ? "…" : ""}` : "",
  ].join("");
  const laborHref = `/labores?openForm=1&tipo=tratamiento&descripcion=${encodeURIComponent(descripcionLabor)}${parcelaId ? `&parcelaId=${encodeURIComponent(parcelaId)}` : ""}`;

  const followUpDays = result.follow_up_days ?? 7;
  const followUpDate = new Date();
  followUpDate.setDate(followUpDate.getDate() + followUpDays);
  const followUpDateStr = followUpDate.toISOString().slice(0, 10);
  const followUpDesc = `Revisión seguimiento: ${result.disease_name}. Comprobar evolución según plan (día +${followUpDays}).`;
  const followUpHref = `/labores?openForm=1&tipo=tratamiento&descripcion=${encodeURIComponent(followUpDesc)}&fecha=${followUpDateStr}${parcelaId ? `&parcelaId=${encodeURIComponent(parcelaId)}` : ""}`;

  const plan = result.action_plan;
  const checklist = result.checklist;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-tierra-800">{result.disease_name || "Sin nombre"}</h3>
          <UrgencyBadge urgency={result.urgency ?? "medium"} />
          {result.severity_now != null && (
            <span className="text-xs text-tierra-500">
              Ahora: <UrgencyBadge urgency={result.severity_now} />
            </span>
          )}
          {result.severity_48h != null && (
            <span className="text-xs text-tierra-500">
              48h: <UrgencyBadge urgency={result.severity_48h} />
            </span>
          )}
        </div>
        {result.description && <p className="text-sm text-tierra-600 mt-1">{result.description}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-xs text-tierra-600 mb-1">
            <span>Confianza del diagnóstico</span>
            <span className="tabular-nums font-medium">{confidence}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-tierra-200 overflow-hidden">
            <div className="h-full rounded-full bg-tierra-600 transition-all duration-500" style={{ width: `${confidence}%` }} />
          </div>
        </div>

        {plan && (plan.immediate || plan.within72h || plan.follow_up) && (
          <div className="border border-tierra-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenSection(openSection === "plan" ? null : "plan")}
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-tierra-800 bg-tierra-50 hover:bg-tierra-100"
            >
              <span>Plan por fases</span>
              <span className="text-tierra-500" aria-hidden>{openSection === "plan" ? "▼" : "▶"}</span>
            </button>
            {openSection === "plan" && (
              <div className="px-4 py-3 text-sm text-tierra-700 bg-white space-y-3 border-t border-tierra-100">
                {plan.immediate && (
                  <div>
                    <p className="font-medium text-tierra-800">Inmediato (24h)</p>
                    <p>{plan.immediate}</p>
                  </div>
                )}
                {plan.within72h && (
                  <div>
                    <p className="font-medium text-tierra-800">24–72 h</p>
                    <p>{plan.within72h}</p>
                  </div>
                )}
                {plan.follow_up && (
                  <div>
                    <p className="font-medium text-tierra-800">Seguimiento</p>
                    <p>{plan.follow_up}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {checklist && (checklist.epis || checklist.dose || checklist.ideal_window || checklist.evidence_to_record) && (
          <div className="border border-tierra-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenSection(openSection === "checklist" ? null : "checklist")}
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-tierra-800 bg-tierra-50 hover:bg-tierra-100"
            >
              <span>Checklist operativo</span>
              <span className="text-tierra-500" aria-hidden>{openSection === "checklist" ? "▼" : "▶"}</span>
            </button>
            {openSection === "checklist" && (
              <div className="px-4 py-3 text-sm text-tierra-700 bg-white space-y-2 border-t border-tierra-100">
                {checklist.epis && <p><strong>EPIs:</strong> {checklist.epis}</p>}
                {checklist.dose && <p><strong>Dosis:</strong> {checklist.dose}</p>}
                {checklist.ideal_window && <p><strong>Ventana ideal:</strong> {checklist.ideal_window}</p>}
                {checklist.evidence_to_record && <p><strong>Evidencias a anotar:</strong> {checklist.evidence_to_record}</p>}
              </div>
            )}
          </div>
        )}

        <div className="border border-tierra-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setOpenSection(openSection === "organic" ? null : "organic")}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-tierra-800 bg-tierra-50 hover:bg-tierra-100 border-b border-tierra-200"
          >
            <span>Tratamiento Ecológico (Prioritario)</span>
            <span className="text-tierra-500" aria-hidden>{openSection === "organic" ? "▼" : "▶"}</span>
          </button>
          {openSection === "organic" && (
            <div className="px-4 py-3 text-sm text-tierra-700 bg-white border-b border-tierra-100">
              {organicText || "No se ha sugerido tratamiento ecológico."}
            </div>
          )}
          <button
            type="button"
            onClick={() => setOpenSection(openSection === "chemical" ? null : "chemical")}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-tierra-800 bg-tierra-50 hover:bg-tierra-100"
          >
            <span>Tratamiento Químico</span>
            <span className="text-tierra-500" aria-hidden>{openSection === "chemical" ? "▼" : "▶"}</span>
          </button>
          {openSection === "chemical" && (
            <div className="px-4 py-3 text-sm text-tierra-700 bg-white">
              {chemicalText || "No se ha sugerido tratamiento químico."}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Link href={laborHref} className="btn-primary w-full flex items-center justify-center gap-2">
            Crear Tarea en Cuaderno
          </Link>
          {result.follow_up_days != null && result.follow_up_days > 0 && (
            <Link href={followUpHref} className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
              Crear tarea de seguimiento (revisión en {followUpDays} días)
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

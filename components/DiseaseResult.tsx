"use client";

interface DiseaseResultProps {
  enfermedad?: string;
  confianza?: number;
  tratamientoQuimico?: string;
  tratamientoEcologico?: string;
  summary?: string;
}

export function DiseaseResult({
  enfermedad,
  confianza,
  tratamientoQuimico,
  tratamientoEcologico,
  summary,
}: DiseaseResultProps) {
  const nombre = enfermedad || "Enfermedad no identificada";
  const conf = Math.max(0, Math.min(confianza ?? 0, 100));

  let barColor = "bg-green-500";
  if (conf < 50) barColor = "bg-red-500";
  else if (conf < 80) barColor = "bg-yellow-500";

  return (
    <section className="card space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-tierra-800">{nombre}</h2>
        {typeof confianza === "number" && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-tierra-600 mb-1">
              <span>Confianza del modelo</span>
              <span>{Math.round(conf)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-tierra-100 overflow-hidden">
              <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${conf}%` }} />
            </div>
          </div>
        )}
      </div>

      {summary && (
        <p className="text-sm text-tierra-700 whitespace-pre-wrap border-t border-tierra-100 pt-3">
          {summary}
        </p>
      )}

      <div className="space-y-2">
        {tratamientoQuimico && (
          <details className="border border-tierra-200 rounded-md p-2 bg-tierra-50/60">
            <summary className="cursor-pointer text-sm font-medium text-tierra-800">
              Tratamiento químico
            </summary>
            <p className="mt-2 text-sm text-tierra-700">{tratamientoQuimico}</p>
          </details>
        )}

        {tratamientoEcologico && (
          <details className="border border-tierra-200 rounded-md p-2 bg-tierra-50/60">
            <summary className="cursor-pointer text-sm font-medium text-tierra-800">
              Tratamiento ecológico
            </summary>
            <p className="mt-2 text-sm text-tierra-700">{tratamientoEcologico}</p>
          </details>
        )}
      </div>
    </section>
  );
}


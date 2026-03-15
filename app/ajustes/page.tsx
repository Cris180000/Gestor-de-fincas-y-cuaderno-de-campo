"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { exportData, importData } from "@/lib/store";

interface OutcomeStatsRow {
  recommendationType: string;
  total: number;
  accepted: number;
  rejected: number;
  worked: number;
  notWorked: number;
}

const recommendationTypeLabel: Record<string, string> = {
  spray_window: "Ventana de pulverización",
  water_stress: "Estrés hídrico",
  disease_risk: "Riesgo de enfermedad",
  treatment_timing: "Momento de tratamiento",
  other: "Otros",
};

export default function AjustesPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [apiUser, setApiUser] = useState<{ name?: string; email?: string } | null>(null);
  const [outcomeStats, setOutcomeStats] = useState<OutcomeStatsRow[]>([]);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setApiUser(data.user))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/recommendation-outcomes/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data?.stats && setOutcomeStats(data.stats))
      .catch(() => {});
  }, []);

  const handleExport = () => {
    const json = exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cuaderno-campo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const result = importData(text);
      if (result.ok) {
        setImportMessage({ type: "ok", text: "Datos importados correctamente. Recargando…" });
        setTimeout(() => router.push("/"), 1500);
      } else {
        setImportMessage({ type: "error", text: result.error });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const triggerImport = () => {
    if (!window.confirm("Se reemplazarán todos los datos actuales con los del archivo. ¿Continuar?")) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-8 max-w-lg">
      <h2 className="text-xl font-semibold text-tierra-800">Ajustes</h2>

      <section className="card space-y-2">
        <h3 className="font-medium text-tierra-800">Sesión (ruta protegida)</h3>
        <p className="text-sm text-tierra-600">
          Esta página solo es visible si estás logueado. El endpoint <code className="bg-tierra-100 px-1 rounded">GET /api/me</code> comprueba la sesión en el servidor.
        </p>
        {apiUser && (
          <p className="text-sm text-verde-700">
            Conectado como <strong>{apiUser.name}</strong> ({apiUser.email}).
          </p>
        )}
      </section>

      <section className="card space-y-4">
        <h3 className="font-medium text-tierra-800">Copias de seguridad</h3>
        <p className="text-sm text-tierra-600">
          Los datos se guardan solo en este dispositivo. Exporta una copia para no perderlos o para usarlos en otro dispositivo.
        </p>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={handleExport} className="btn-primary">
            📥 Exportar datos (JSON)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImport}
            className="hidden"
          />
          <button type="button" onClick={triggerImport} className="btn-secondary">
            📤 Importar datos
          </button>
        </div>
        {importMessage && (
          <p
            className={`text-sm ${importMessage.type === "ok" ? "text-verde-700" : "text-red-600"}`}
          >
            {importMessage.text}
          </p>
        )}
      </section>

      <section className="card space-y-2">
        <h3 className="font-medium text-tierra-800">Instalar en el móvil</h3>
        <p className="text-sm text-tierra-600">
          En el teléfono, abre esta web en Chrome o Safari y usa la opción &quot;Añadir a la pantalla de inicio&quot; para tener el cuaderno como una app.
        </p>
      </section>

      <section className="card space-y-4">
        <h3 className="font-medium text-tierra-800">Precisión de recomendaciones</h3>
        <p className="text-sm text-tierra-600">
          Resumen de cómo usas las alertas agronómicas: aceptadas (has seguido el CTA) vs descartadas. Sirve para recalibrar reglas.
        </p>
        {outcomeStats.length === 0 ? (
          <p className="text-sm text-tierra-500">Aún no hay datos. Las interacciones con alertas se registrarán aquí.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm stacked-table">
              <thead>
                <tr className="border-b border-tierra-200">
                  <th className="text-left py-2 font-medium text-tierra-700">Tipo</th>
                  <th className="text-right py-2 font-medium text-tierra-700">Total</th>
                  <th className="text-right py-2 font-medium text-tierra-700">Aceptadas</th>
                  <th className="text-right py-2 font-medium text-tierra-700">Descartadas</th>
                  <th className="text-right py-2 font-medium text-tierra-700">Funcionaron</th>
                </tr>
              </thead>
              <tbody>
                {outcomeStats.map((row) => (
                  <tr key={row.recommendationType} className="border-b border-tierra-100">
                    <td className="py-2 text-tierra-800" data-label="Tipo">
                      {recommendationTypeLabel[row.recommendationType] ?? row.recommendationType}
                    </td>
                    <td className="py-2 text-right tabular-nums" data-label="Total">{row.total}</td>
                    <td className="py-2 text-right tabular-nums text-verde-700" data-label="Aceptadas">{row.accepted}</td>
                    <td className="py-2 text-right tabular-nums text-tierra-600" data-label="Descartadas">{row.rejected}</td>
                    <td className="py-2 text-right tabular-nums" data-label="Funcionaron">
                      {row.worked + row.notWorked > 0 ? `${row.worked}/${row.worked + row.notWorked}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

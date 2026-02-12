"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { getStore, updateIncidencia, deleteIncidencia } from "@/lib/store";
import type { Incidencia as IncidenciaType, Parcela, Finca } from "@/lib/types";

const TIPOS: Record<string, string> = {
  plaga: "Plaga",
  enfermedad: "Enfermedad",
  helada: "Helada",
  sequía: "Sequía",
  granizo: "Granizo",
  viento: "Viento",
  otro: "Otro",
};

function IncidenciasContent() {
  const searchParams = useSearchParams();
  const parcelaId = searchParams.get("parcela") || "";
  const [store, setStore] = useState(getStore());
  const [soloAbiertas, setSoloAbiertas] = useState(true);

  const refresh = () => setStore(getStore());
  useEffect(refresh, []);

  let incidencias = store?.incidencias ?? [];
  if (parcelaId) incidencias = incidencias.filter((i) => i.parcelaId === parcelaId);
  if (soloAbiertas) incidencias = incidencias.filter((i) => !i.resuelta);
  incidencias = [...incidencias].sort((a, b) => (b.fecha > a.fecha ? 1 : -1));

  const getParcelaName = (pId: string) => {
    const p = store.parcelas.find((x: Parcela) => x.id === pId);
    if (!p) return pId;
    const f = store.fincas.find((x: Finca) => x.id === p.fincaId);
    return f ? `${f.nombre} – ${p.nombre}` : p.nombre;
  };

  const toggleResuelta = (i: IncidenciaType) => {
    updateIncidencia(i.id, {
      resuelta: !i.resuelta,
      fechaResolucion: !i.resuelta ? new Date().toISOString().slice(0, 10) : undefined,
    });
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-xl font-semibold text-tierra-800">Incidencias</h2>
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-2 text-sm text-tierra-600">
            <input
              type="checkbox"
              checked={soloAbiertas}
              onChange={(e) => setSoloAbiertas(e.target.checked)}
              className="rounded border-tierra-300"
            />
            Solo abiertas
          </label>
          <Link href="/incidencias/nueva" className="btn-primary">+ Nueva incidencia</Link>
        </div>
      </div>

      {!parcelaId && store.parcelas.length > 0 && (
        <div className="card">
          <label className="label">Filtrar por parcela</label>
          <select
            className="input"
            value={parcelaId}
            onChange={(e) => {
              const v = e.target.value;
              if (v) window.location.href = `/incidencias?parcela=${v}`;
              else window.location.href = "/incidencias";
            }}
          >
            <option value="">Todas</option>
            {store.parcelas.map((p: Parcela) => (
              <option key={p.id} value={p.id}>{getParcelaName(p.id)}</option>
            ))}
          </select>
        </div>
      )}

      {incidencias.length === 0 ? (
        <div className="card text-center py-12 text-tierra-600">
          <p className="mb-4">
            {soloAbiertas ? "No hay incidencias abiertas." : "No hay incidencias registradas."}
          </p>
          <Link href="/incidencias/nueva" className="btn-primary">Registrar incidencia</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {incidencias.map((i: IncidenciaType) => (
            <li key={i.id}>
              <div
                className={`card flex flex-wrap justify-between items-start gap-3 ${
                  i.resuelta ? "opacity-75 bg-tierra-50" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-tierra-800">{i.descripcion}</span>
                    <span className="text-sm px-2 py-0.5 rounded bg-tierra-200 text-tierra-700">
                      {TIPOS[i.tipo] || i.tipo}
                    </span>
                    {i.severidad && (
                      <span className="text-sm text-tierra-500 capitalize">{i.severidad}</span>
                    )}
                    <span className={`text-sm px-2 py-0.5 rounded font-medium ${i.resuelta ? "bg-verde-100 text-verde-700" : "bg-amber-100 text-amber-800"}`}>
                      {i.resuelta ? "Resuelta" : "Abierta"}
                    </span>
                  </div>
                  <p className="text-sm text-tierra-500 mt-1">
                    {i.fecha}
                    {!parcelaId && ` · ${getParcelaName(i.parcelaId)}`}
                  </p>
                  {i.notas && <p className="text-sm text-tierra-600 mt-1">{i.notas}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleResuelta(i)}
                    className={`btn-ghost text-sm ${i.resuelta ? "text-tierra-500" : "text-verde-600"}`}
                  >
                    {i.resuelta ? "Reabrir" : "Marcar resuelta"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("¿Eliminar esta incidencia?")) {
                        deleteIncidencia(i.id);
                        refresh();
                      }
                    }}
                    className="btn-ghost text-sm text-red-600"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function IncidenciasPage() {
  return (
    <Suspense fallback={<div className="card py-8 text-center text-tierra-600">Cargando incidencias…</div>}>
      <IncidenciasContent />
    </Suspense>
  );
}

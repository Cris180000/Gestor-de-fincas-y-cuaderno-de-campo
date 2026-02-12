"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import { getStore, addIncidencia } from "@/lib/store";
import type { Parcela, Finca, TipoIncidencia } from "@/lib/types";

const TIPOS: { value: TipoIncidencia; label: string }[] = [
  { value: "plaga", label: "Plaga" },
  { value: "enfermedad", label: "Enfermedad" },
  { value: "helada", label: "Helada" },
  { value: "sequía", label: "Sequía" },
  { value: "granizo", label: "Granizo" },
  { value: "viento", label: "Viento" },
  { value: "otro", label: "Otro" },
];

const SEVERIDADES = ["leve", "moderada", "grave"] as const;

function NuevaIncidenciaContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const parcelaIdParam = searchParams.get("parcela") || "";
  const [store, setStore] = useState(getStore());

  const [parcelaId, setParcelaId] = useState(parcelaIdParam);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [tipo, setTipo] = useState<TipoIncidencia>("plaga");
  const [descripcion, setDescripcion] = useState("");
  const [severidad, setSeveridad] = useState<"leve" | "moderada" | "grave">("moderada");
  const [notas, setNotas] = useState("");

  const getParcelaName = (pId: string) => {
    const p = store.parcelas.find((x: Parcela) => x.id === pId);
    if (!p) return pId;
    const f = store.fincas.find((x: Finca) => x.id === p.fincaId);
    return f ? `${f.nombre} – ${p.nombre}` : p.nombre;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parcelaId || !descripcion.trim()) return;
    addIncidencia({
      parcelaId,
      fecha,
      tipo,
      descripcion: descripcion.trim(),
      severidad,
      notas: notas.trim() || undefined,
    });
    router.push("/incidencias");
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/incidencias" className="btn-ghost text-tierra-600">← Volver</Link>
        <h2 className="text-xl font-semibold text-tierra-800">Nueva Incidencia</h2>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">Parcela *</label>
          <select
            className="input"
            value={parcelaId}
            onChange={(e) => setParcelaId(e.target.value)}
            required
          >
            <option value="">Seleccionar parcela</option>
            {store.parcelas.map((p: Parcela) => (
              <option key={p.id} value={p.id}>{getParcelaName(p.id)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Fecha *</label>
          <input
            type="date"
            className="input"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Tipo *</label>
          <select
            className="input"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoIncidencia)}
          >
            {TIPOS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Descripción *</label>
          <textarea
            className="input min-h-[100px]"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Describe la incidencia: plagas, daños por helada, etc."
            required
            rows={4}
          />
        </div>
        <div>
          <label className="label">Severidad</label>
          <select
            className="input"
            value={severidad}
            onChange={(e) => setSeveridad(e.target.value as typeof severidad)}
          >
            {SEVERIDADES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Notas</label>
          <input type="text" className="input" value={notas} onChange={(e) => setNotas(e.target.value)} />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn-primary flex-1">Guardar incidencia</button>
          <Link href="/incidencias" className="btn-secondary">Cancelar</Link>
        </div>
      </form>
    </div>
  );
}

export default function NuevaIncidenciaPage() {
  return (
    <Suspense fallback={<div className="card py-8 text-center text-tierra-600">Cargando…</div>}>
      <NuevaIncidenciaContent />
    </Suspense>
  );
}

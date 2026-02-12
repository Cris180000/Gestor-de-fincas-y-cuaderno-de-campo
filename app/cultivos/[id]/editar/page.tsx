"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getStore, updateCultivo } from "@/lib/store";
import type { Cultivo as CultivoType } from "@/lib/types";

const ESTADOS = ["planificado", "activo", "cosechado", "abandonado"] as const;

export default function EditarCultivoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [store, setStore] = useState(getStore());
  const [nombre, setNombre] = useState("");
  const [variedad, setVariedad] = useState("");
  const [fechaPlantacion, setFechaPlantacion] = useState("");
  const [estado, setEstado] = useState<"planificado" | "activo" | "cosechado" | "abandonado">("activo");
  const [notas, setNotas] = useState("");

  const cultivo = store.cultivos.find((c: CultivoType) => c.id === id);

  useEffect(() => setStore(getStore()), []);

  useEffect(() => {
    if (cultivo) {
      setNombre(cultivo.nombre);
      setVariedad(cultivo.variedad || "");
      setFechaPlantacion(cultivo.fechaPlantacion || "");
      setEstado(cultivo.estado);
      setNotas(cultivo.notas || "");
    }
  }, [cultivo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    updateCultivo(id, {
      nombre: nombre.trim(),
      variedad: variedad.trim() || undefined,
      fechaPlantacion: fechaPlantacion || undefined,
      estado,
      notas: notas.trim() || undefined,
    });
    router.push(`/cultivos/${id}`);
  };

  if (!cultivo) {
    return (
      <div className="card text-center py-8">
        <p className="text-tierra-600 mb-4">Cultivo no encontrado.</p>
        <Link href="/fincas" className="btn-primary">Ver fincas</Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/cultivos/${id}`} className="btn-ghost text-tierra-600">← Volver</Link>
        <h2 className="text-xl font-semibold text-tierra-800">Editar Cultivo</h2>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">Cultivo *</label>
          <input
            type="text"
            className="input"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Variedad</label>
          <input
            type="text"
            className="input"
            value={variedad}
            onChange={(e) => setVariedad(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Fecha de plantación</label>
          <input
            type="date"
            className="input"
            value={fechaPlantacion}
            onChange={(e) => setFechaPlantacion(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Estado</label>
          <select
            className="input"
            value={estado}
            onChange={(e) => setEstado(e.target.value as typeof estado)}
          >
            {ESTADOS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Notas</label>
          <textarea
            className="input min-h-[80px]"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={3}
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn-primary flex-1">Guardar</button>
          <Link href={`/cultivos/${id}`} className="btn-secondary">Cancelar</Link>
        </div>
      </form>
    </div>
  );
}

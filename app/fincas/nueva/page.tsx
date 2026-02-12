"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fincasApi } from "@/lib/offline-api";
import { BuscarCatastro, m2AHectareas } from "@/components/BuscarCatastro";

export default function NuevaFincaPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [superficie, setSuperficie] = useState("");
  const [notas, setNotas] = useState("");
  const [referenciaCatastral, setReferenciaCatastral] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    try {
      const res = await fincasApi.create({
        nombre: nombre.trim(),
        ubicacion: ubicacion.trim() || undefined,
        superficie: superficie ? Number(superficie) : undefined,
        notas: notas.trim() || undefined,
        referenciaCatastral: referenciaCatastral.trim() || undefined,
      });
      router.push(`/fincas/${res.data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/fincas" className="btn-ghost text-tierra-600">← Volver</Link>
        <h2 className="text-xl font-semibold text-tierra-800">Nueva Finca</h2>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">Nombre *</label>
          <input
            type="text"
            className="input"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Finca La Solana"
            required
          />
        </div>
        <div>
          <label className="label">Ubicación</label>
          <input
            type="text"
            className="input"
            value={ubicacion}
            onChange={(e) => setUbicacion(e.target.value)}
            placeholder="Localidad, provincia"
          />
        </div>
        <div>
          <label className="label">Superficie (hectáreas)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input"
            value={superficie}
            onChange={(e) => setSuperficie(e.target.value)}
            placeholder="Ej. 2.5"
          />
        </div>
        <BuscarCatastro
          value={referenciaCatastral}
          onChange={setReferenciaCatastral}
          onDatos={(d) => {
            if (d.superficie != null) setSuperficie(String(m2AHectareas(d.superficie)));
            if (d.localizacion) setUbicacion(d.localizacion);
          }}
        />
        <div>
          <label className="label">Notas</label>
          <textarea
            className="input min-h-[80px]"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Observaciones..."
            rows={3}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? "Guardando…" : "Guardar finca"}
          </button>
          <Link href="/fincas" className="btn-secondary">Cancelar</Link>
        </div>
      </form>
    </div>
  );
}

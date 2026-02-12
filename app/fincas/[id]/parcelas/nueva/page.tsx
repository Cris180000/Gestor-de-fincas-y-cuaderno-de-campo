"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fincasApi, parcelasApi } from "@/lib/offline-api";
import { BuscarCatastro, m2AHectareas } from "@/components/BuscarCatastro";

export default function NuevaParcelaPage() {
  const params = useParams();
  const router = useRouter();
  const fincaId = params.id as string;
  const [fincaNombre, setFincaNombre] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [nombre, setNombre] = useState("");
  const [cultivo, setCultivo] = useState("");
  const [superficie, setSuperficie] = useState("");
  const [notas, setNotas] = useState("");
  const [referenciaCatastral, setReferenciaCatastral] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");

  useEffect(() => {
    fincasApi
      .get(fincaId)
      .then((res) => setFincaNombre(res.data.nombre))
      .catch(() => setError("Finca no encontrada"))
      .finally(() => setLoading(false));
  }, [fincaId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSaving(true);
    setError(null);
    parcelasApi
      .create(fincaId, {
        nombre: nombre.trim(),
        cultivo: cultivo.trim() || undefined,
        superficie: superficie ? Number(superficie) : undefined,
        notas: notas.trim() || undefined,
        referenciaCatastral: referenciaCatastral.trim() || undefined,
        lat: lat ? Number(lat) : undefined,
        lon: lon ? Number(lon) : undefined,
      })
      .then((res) => router.push(`/parcelas/${res.data.id}`))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Error al crear parcela");
        setSaving(false);
      });
  };

  if (loading) {
    return (
      <div className="card text-center py-8 text-tierra-600">
        Cargando…
      </div>
    );
  }

  if (error && !fincaNombre) {
    return (
      <div className="card text-center py-8">
        <p className="text-tierra-600 mb-4">{error}</p>
        <Link href="/fincas" className="btn-primary">Ver fincas</Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/fincas/${fincaId}`} className="btn-ghost text-tierra-600">← Volver</Link>
        <h2 className="text-xl font-semibold text-tierra-800">Nueva Parcela en {fincaNombre ?? "Finca"}</h2>
      </div>

      {error && (
        <div className="card bg-red-50 border-red-200 text-red-700 text-sm p-3">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">Nombre *</label>
          <input
            type="text"
            className="input"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Parcela Norte"
            required
          />
        </div>
        <div>
          <label className="label">Cultivo principal / Referencia</label>
          <input
            type="text"
            className="input"
            value={cultivo}
            onChange={(e) => setCultivo(e.target.value)}
            placeholder="Ej. Olivar, Nº parcela"
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
            placeholder="Ej. 0.5"
          />
        </div>
        <BuscarCatastro
          value={referenciaCatastral}
          onChange={setReferenciaCatastral}
          onDatos={(d) => {
            if (d.superficie != null) setSuperficie(String(m2AHectareas(d.superficie)));
            if (d.localizacion && !nombre.trim()) setNombre(d.localizacion);
          }}
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">Latitud (opcional)</label>
            <input
              type="number"
              step="0.000001"
              className="input"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="Ej. 37.123456"
            />
          </div>
          <div>
            <label className="label">Longitud (opcional)</label>
            <input
              type="number"
              step="0.000001"
              className="input"
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              placeholder="-3.456789"
            />
          </div>
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
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? "Guardando…" : "Guardar parcela"}
          </button>
          <Link href={`/fincas/${fincaId}`} className="btn-secondary">Cancelar</Link>
        </div>
      </form>
    </div>
  );
}

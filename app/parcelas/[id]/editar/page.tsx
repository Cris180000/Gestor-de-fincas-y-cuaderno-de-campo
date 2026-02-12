"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { parcelasApi, type ParcelaItem } from "@/lib/offline-api";
import { BuscarCatastro, m2AHectareas } from "@/components/BuscarCatastro";

export default function EditarParcelaPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [parcela, setParcela] = useState<ParcelaItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [nombre, setNombre] = useState("");
  const [cultivo, setCultivo] = useState("");
  const [superficie, setSuperficie] = useState("");
  const [notas, setNotas] = useState("");
  const [referenciaCatastral, setReferenciaCatastral] = useState("");
  const [zonaVulnerable, setZonaVulnerable] = useState(false);
  const [limiteN, setLimiteN] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");

  useEffect(() => {
    parcelasApi
      .get(id)
      .then((res) => {
        setParcela(res.data);
        setNombre(res.data.nombre);
        setCultivo(res.data.cultivo ?? "");
        setSuperficie(res.data.superficie != null ? String(res.data.superficie) : "");
        setNotas(res.data.notas ?? "");
        setReferenciaCatastral(res.data.referenciaCatastral ?? "");
        setLat(res.data.lat != null ? String(res.data.lat) : "");
        setLon(res.data.lon != null ? String(res.data.lon) : "");
        // Campos NVZ: de momento no vienen en ParcelaItem; opcional para futuro
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setSaving(true);
    setError(null);
    parcelasApi
      .update(id, {
        nombre: nombre.trim(),
        cultivo: cultivo.trim() || undefined,
        superficie: superficie ? Number(superficie) : undefined,
        notas: notas.trim() || undefined,
        referenciaCatastral: referenciaCatastral.trim() || undefined,
        lat: lat ? Number(lat) : undefined,
        lon: lon ? Number(lon) : undefined,
        // zonaVulnerableNitratos y limiteNAnualNkgHa pueden añadirse aquí cuando se expongan en la API
      })
      .then(() => router.push(`/parcelas/${id}`))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Error al guardar");
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

  if (error && !parcela) {
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
        <Link href={`/parcelas/${id}`} className="btn-ghost text-tierra-600">← Volver</Link>
        <h2 className="text-xl font-semibold text-tierra-800">Editar Parcela</h2>
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
          />
        </div>
        <BuscarCatastro
          value={referenciaCatastral}
          onChange={setReferenciaCatastral}
          onDatos={(d) => {
            if (d.superficie != null) setSuperficie(String(m2AHectareas(d.superficie)));
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
        <div className="border-t border-tierra-200 pt-3 space-y-2">
          <h3 className="text-sm font-medium text-tierra-700">Zonas Vulnerables a Nitratos</h3>
          <label className="flex items-center gap-2 text-sm text-tierra-700">
            <input
              type="checkbox"
              className="rounded"
              checked={zonaVulnerable}
              onChange={(e) => setZonaVulnerable(e.target.checked)}
            />
            Parcela en Zona Vulnerable a Nitratos (aplicar límite anual de N)
          </label>
          {zonaVulnerable && (
            <div className="flex items-center gap-2">
              <label className="label mb-0">Límite anual N (kg/ha·año)</label>
              <input
                type="number"
                step="1"
                min="0"
                className="input w-32"
                value={limiteN}
                onChange={(e) => setLimiteN(e.target.value)}
                placeholder="170"
              />
            </div>
          )}
          <p className="text-xs text-tierra-500">
            Estos campos son informativos por ahora. El backend aplica un límite por defecto de 170 kg N/ha·año
            cuando la parcela esté marcada como Zona Vulnerable.
          </p>
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
            {saving ? "Guardando…" : "Guardar"}
          </button>
          <Link href={`/parcelas/${id}`} className="btn-secondary">Cancelar</Link>
        </div>
      </form>
    </div>
  );
}

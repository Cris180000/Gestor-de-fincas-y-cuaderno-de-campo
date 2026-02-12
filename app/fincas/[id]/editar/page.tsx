"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fincasApi } from "@/lib/offline-api";
import { BuscarCatastro, m2AHectareas } from "@/components/BuscarCatastro";

export default function EditarFincaPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [nombre, setNombre] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [superficie, setSuperficie] = useState("");
  const [notas, setNotas] = useState("");
  const [referenciaCatastral, setReferenciaCatastral] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fincasApi
      .get(id)
      .then((r) => {
        setNombre(r.data.nombre);
        setUbicacion(r.data.ubicacion ?? "");
        setSuperficie(r.data.superficie != null ? String(r.data.superficie) : "");
        setNotas(r.data.notas ?? "");
        setReferenciaCatastral(r.data.referenciaCatastral ?? "");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!nombre.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    try {
      await fincasApi.update(id, {
        nombre: nombre.trim(),
        ubicacion: ubicacion.trim() || undefined,
        superficie: superficie ? Number(superficie) : undefined,
        notas: notas.trim() || undefined,
        referenciaCatastral: referenciaCatastral.trim() || undefined,
      });
      router.push(`/fincas/${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="card py-8 text-center text-tierra-600">Cargando…</div>;
  }

  if (error && !nombre) {
    return (
      <div className="card text-red-600">
        <p>{error}</p>
        <Link href="/fincas" className="btn-secondary mt-2 inline-block">Volver a fincas</Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/fincas/${id}`} className="btn-ghost text-tierra-600">← Volver</Link>
        <h2 className="text-xl font-semibold text-tierra-800">Editar Finca</h2>
      </div>

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
          <label className="label">Ubicación</label>
          <input
            type="text"
            className="input"
            value={ubicacion}
            onChange={(e) => setUbicacion(e.target.value)}
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
            if (d.localizacion) setUbicacion(d.localizacion);
          }}
        />
        <div>
          <label className="label">Notas</label>
          <textarea
            className="input min-h-[80px]"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={3}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
          <Link href={`/fincas/${id}`} className="btn-secondary">Cancelar</Link>
        </div>
      </form>
    </div>
  );
}

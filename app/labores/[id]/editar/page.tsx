"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { laboresApi } from "@/lib/offline-api";
import type { LaborItem } from "@/lib/offline-api";
import type { ApiError } from "@/lib/api-client";

const FITOSANITARIO_CODES = ["NO_REGISTRADO", "CULTIVO_NO_INDICADO", "PROHIBIDO_CULTIVO", "DOSIS_SUPERADA"];

const TIPOS_LABOR = [
  { value: "riego", label: "Riego" },
  { value: "abonado", label: "Abonado" },
  { value: "tratamiento", label: "Tratamiento" },
  { value: "poda", label: "Poda" },
  { value: "cosecha", label: "Cosecha" },
  { value: "otros", label: "Otros" },
];

export default function EditarLaborPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [labor, setLabor] = useState<LaborItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tipo, setTipo] = useState("riego");
  const [fecha, setFecha] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [producto, setProducto] = useState("");
  const [cantidad, setCantidad] = useState("");

  useEffect(() => {
    laboresApi
      .get(id)
      .then((res) => {
        setLabor(res.data);
        setTipo(res.data.tipo);
        setFecha(typeof res.data.fecha === "string" ? res.data.fecha.slice(0, 10) : String(res.data.fecha).slice(0, 10));
        setDescripcion(res.data.descripcion);
        setProducto(res.data.producto ?? "");
        setCantidad(res.data.cantidad ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion.trim()) return;
    setSaving(true);
    setError(null);
    laboresApi
      .update(id, {
        tipo,
        fecha,
        descripcion: descripcion.trim(),
        producto: producto.trim() || undefined,
        cantidad: cantidad.trim() || undefined,
      })
      .then(() => router.push(`/labores/${id}`))
      .catch((err: unknown) => {
        const apiErr = err as ApiError;
        const msg = apiErr instanceof Error ? apiErr.message : "Error al guardar";
        setError(msg + (apiErr.detalle ? ` ${apiErr.detalle}` : ""));
        if (apiErr.code && FITOSANITARIO_CODES.includes(apiErr.code)) {
          const alerta = apiErr.detalle ? `${msg}\n\n${apiErr.detalle}` : msg;
          window.alert("⚠️ Validación fitosanitaria\n\n" + alerta);
        }
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

  if (error && !labor) {
    return (
      <div className="card text-center py-8">
        <p className="text-tierra-600 mb-4">{error}</p>
        <Link href="/labores" className="btn-primary">Volver al cuaderno</Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/labores/${id}`} className="btn-ghost text-tierra-600">← Volver</Link>
        <h2 className="text-xl font-semibold text-tierra-800">Editar labor</h2>
      </div>

      {error && (
        <div
          className={`p-3 rounded text-sm border ${
            error.includes("fitosanitar") || error.includes("registro") || error.includes("dosis") || error.includes("cultivo")
              ? "bg-red-50 border-red-400 text-red-800 font-medium"
              : "card bg-red-50 border-red-200 text-red-700"
          }`}
          role="alert"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">Tipo *</label>
          <select
            className="input"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            {TIPOS_LABOR.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
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
          <label className="label">Descripción *</label>
          <textarea
            className="input min-h-[80px]"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Producto (opcional)</label>
            <input
              type="text"
              className="input"
              value={producto}
              onChange={(e) => setProducto(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Cantidad (opcional)</label>
            <input
              type="text"
              className="input"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn-primary flex-1" disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
          <Link href={`/labores/${id}`} className="btn-secondary">Cancelar</Link>
        </div>
      </form>
    </div>
  );
}

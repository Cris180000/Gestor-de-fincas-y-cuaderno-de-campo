"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { laboresApi } from "@/lib/offline-api";
import type { LaborItem } from "@/lib/offline-api";

export default function LaborDetallePage() {
  const params = useParams();
  const id = params.id as string;
  const [labor, setLabor] = useState<LaborItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marcando, setMarcando] = useState(false);
  const [errorGps, setErrorGps] = useState<string | null>(null);

  const refreshLabor = () => {
    laboresApi.get(id).then((res) => setLabor(res.data)).catch(() => {});
  };

  useEffect(() => {
    laboresApi
      .get(id)
      .then((res) => setLabor(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = () => {
    if (!labor) return;
    if (window.confirm("¿Eliminar esta labor?")) {
      laboresApi.delete(id).then(() => {
        window.location.href = "/labores";
      }).catch((err) => setError(err instanceof Error ? err.message : "Error al eliminar"));
    }
  };

  const handleMarcarRealizada = () => {
    if (!navigator.geolocation) {
      setErrorGps("Tu dispositivo no soporta geolocalización.");
      return;
    }
    setErrorGps(null);
    setMarcando(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        laboresApi
          .update(id, { estado: "realizada", lat: position.coords.latitude, lon: position.coords.longitude })
          .then(() => refreshLabor())
          .catch((err) => setErrorGps(err instanceof Error ? err.message : "Error al guardar"))
          .finally(() => setMarcando(false));
      },
      (err) => {
        setErrorGps(
          err.code === 1
            ? "Se necesita permiso de ubicación para verificar dónde se realizó la tarea."
            : err.code === 3
              ? "Tiempo de espera agotado. Comprueba que el GPS esté activado."
              : "No se pudo obtener la ubicación."
        );
        setMarcando(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  if (loading) {
    return (
      <div className="card text-center py-8 text-tierra-600">
        Cargando…
      </div>
    );
  }

  if (error || !labor) {
    return (
      <div className="card text-center py-8">
        <p className="text-tierra-600 mb-4">{error || "Labor no encontrada."}</p>
        <Link href="/labores" className="btn-primary">Volver al cuaderno</Link>
      </div>
    );
  }

  const fechaStr = typeof labor.fecha === "string" ? labor.fecha.slice(0, 10) : String(labor.fecha).slice(0, 10);
  const parcela = labor.parcela;
  const finca = parcela?.finca;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <p className="text-sm text-tierra-500">
            {finca && (
              <Link href={`/fincas/${finca.id}`} className="hover:underline">{finca.nombre}</Link>
            )}
            {parcela && (
              <> · <Link href={`/parcelas/${parcela.id}`} className="hover:underline">{parcela.nombre}</Link></>
            )}
          </p>
          <h2 className="text-xl font-semibold text-tierra-800 capitalize">{labor.tipo}</h2>
          <p className="text-tierra-600">{fechaStr}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {labor.estado !== "realizada" && (
            <button
              type="button"
              onClick={handleMarcarRealizada}
              disabled={marcando}
              className="btn-primary"
            >
              {marcando ? "Obteniendo GPS…" : "Marcar como realizada"}
            </button>
          )}
          <Link href={`/labores/${id}/editar`} className="btn-secondary">Editar</Link>
          <button type="button" onClick={handleDelete} className="btn-ghost text-red-600 hover:bg-red-50">
            Eliminar
          </button>
        </div>
      </div>

      <span
        className={`inline-block text-sm px-2 py-1 rounded capitalize ${
          labor.estado === "realizada" ? "bg-verde-200 text-verde-800" : "bg-tierra-100 text-tierra-600"
        }`}
      >
        {labor.estado === "realizada" ? "Realizada" : "Pendiente"}
      </span>

      {errorGps && (
        <div className="card bg-amber-50 border-amber-200 text-amber-800 text-sm p-3 flex justify-between items-start gap-2">
          <span>{errorGps}</span>
          <button type="button" onClick={() => setErrorGps(null)} className="text-amber-600 hover:underline shrink-0">
            Cerrar
          </button>
        </div>
      )}

      <div className="card space-y-3">
        <h3 className="text-sm font-medium text-tierra-600">Descripción</h3>
        <p className="text-tierra-800 whitespace-pre-wrap">{labor.descripcion}</p>
        {(labor.producto || labor.cantidad) && (
          <p className="text-sm text-tierra-600">
            {labor.producto}
            {labor.cantidad && ` · ${labor.cantidad}`}
          </p>
        )}
      </div>

      {labor.tipo === "abonado" && (labor.nKgHa != null || labor.pKgHa != null || labor.kKgHa != null) && (
        <div className="card space-y-1">
          <h3 className="text-sm font-medium text-tierra-600">Unidades fertilizantes aportadas (kg/ha)</h3>
          <p className="text-sm text-tierra-700">
            {labor.nKgHa != null && (
              <span className="mr-4">
                <span className="font-medium">N:</span> {labor.nKgHa.toFixed(1)} kg/ha
              </span>
            )}
            {labor.pKgHa != null && (
              <span className="mr-4">
                <span className="font-medium">P₂O₅:</span> {labor.pKgHa.toFixed(1)} kg/ha
              </span>
            )}
            {labor.kKgHa != null && (
              <span>
                <span className="font-medium">K₂O:</span> {labor.kKgHa.toFixed(1)} kg/ha
              </span>
            )}
          </p>
          <p className="text-xs text-tierra-500">
            Calculado automáticamente a partir del fertilizante y la dosis introducidos.
          </p>
        </div>
      )}

      {labor.estado === "realizada" && labor.lat != null && labor.lon != null && (
        <div className="card space-y-2">
          <h3 className="text-sm font-medium text-tierra-600">Ubicación al marcar como realizada</h3>
          <p className="text-sm text-tierra-700">
            Coordenadas GPS guardadas para verificación:{" "}
            <a
              href={`https://www.google.com/maps?q=${labor.lat},${labor.lon}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-verde-600 underline"
            >
              {labor.lat.toFixed(5)}, {labor.lon.toFixed(5)}
            </a>
          </p>
        </div>
      )}

      <Link href="/labores" className="btn-ghost">← Volver al cuaderno de campo</Link>
    </div>
  );
}

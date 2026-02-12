"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { parcelasApi, type ParcelaItem } from "@/lib/offline-api";
import { getStore, deleteParcela } from "@/lib/store";
import type { Cultivo } from "@/lib/types";
import { SprayWindowCalculator } from "@/components/SprayWindowCalculator";

const MapaNDVI = dynamic(() => import("@/components/MapaNDVI").then((m) => m.MapaNDVI), {
  ssr: false,
  loading: () => <div className="card py-8 text-center text-tierra-600">Cargando mapa de salud…</div>,
});

export default function ParcelaDetallePage() {
  const params = useParams();
  const id = params.id as string;
  const [parcela, setParcela] = useState<(ParcelaItem & { finca?: { id: string; nombre: string } }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [store] = useState(() => getStore());
  const cultivos = store.cultivos.filter((c: Cultivo) => c.parcelaId === id);

  const [showSalud, setShowSalud] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [rcMapa, setRcMapa] = useState("");
  const [saludError, setSaludError] = useState<string | null>(null);
  const [loadingSalud, setLoadingSalud] = useState(false);

  useEffect(() => {
    parcelasApi
      .get(id)
      .then((res) => setParcela(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : "Error al cargar"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = () => {
    if (!parcela) return;
    if (window.confirm(`¿Eliminar la parcela "${parcela.nombre}" y todos sus datos?`)) {
      parcelasApi
        .delete(id)
        .then(() => {
          deleteParcela(id);
          window.location.href = `/fincas/${parcela.fincaId}`;
        })
        .catch((err) => setError(err instanceof Error ? err.message : "Error al eliminar"));
    }
  };

  const handleVerSalud = async () => {
    if (!parcela) return;
    setShowSalud(true);
    setSaludError(null);
    // 1) Si tenemos coordenadas manuales, las usamos directamente
    if (parcela.lat != null && parcela.lon != null) {
      setMapCenter([parcela.lat, parcela.lon]);
      setRcMapa(parcela.referenciaCatastral ?? "");
      return;
    }

    // 2) Si no, intentamos centrar automáticamente por referencia catastral
    const rc = parcela.referenciaCatastral?.trim();
    if (!rc) {
      // Sin RC, usamos un centro genérico sobre España
      if (!mapCenter) setMapCenter([40.4, -3.7]);
      return;
    }
    setLoadingSalud(true);
    try {
      const res = await fetch(`/api/catastro/coordenadas?rc=${encodeURIComponent(rc)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudieron obtener coordenadas de Catastro");
      setMapCenter([data.lat, data.lon]);
      setRcMapa(rc);
    } catch (e) {
      setSaludError(e instanceof Error ? e.message : "No se pudo centrar la parcela en el mapa NDVI");
      if (!mapCenter) setMapCenter([40.4, -3.7]);
    } finally {
      setLoadingSalud(false);
    }
  };

  if (loading) {
    return (
      <div className="card text-center py-8 text-tierra-600">
        Cargando parcela…
      </div>
    );
  }

  if (error || !parcela) {
    return (
      <div className="card text-center py-8">
        <p className="text-tierra-600 mb-4">{error || "Parcela no encontrada."}</p>
        <Link href="/fincas" className="btn-primary">Ver fincas</Link>
      </div>
    );
  }

  const finca = parcela.finca;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <p className="text-sm text-tierra-500">
            <Link href={`/fincas/${parcela.fincaId}`} className="hover:underline">{finca?.nombre ?? "Finca"}</Link>
            {" · Parcela"}
          </p>
          <h2 className="text-xl font-semibold text-tierra-800">{parcela.nombre}</h2>
          {parcela.superficie != null && (
            <p className="text-tierra-600">{parcela.superficie} ha</p>
          )}
          {parcela.cultivo && (
            <p className="text-sm text-tierra-500">Cultivo: {parcela.cultivo}</p>
          )}
          {parcela.referenciaCatastral && (
            <p className="text-sm text-tierra-500 font-mono">Ref. catastral: {parcela.referenciaCatastral}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/parcelas/${id}/editar`} className="btn-secondary">Editar</Link>
          <Link href={`/parcelas/${id}/cultivos/nuevo`} className="btn-primary">+ Cultivo</Link>
          <button type="button" onClick={handleDelete} className="btn-ghost text-red-600 hover:bg-red-50">
            Eliminar
          </button>
        </div>
      </div>

      {parcela.notas && (
        <div className="card">
          <h3 className="text-sm font-medium text-tierra-600 mb-1">Notas</h3>
          <p className="text-tierra-800 whitespace-pre-wrap">{parcela.notas}</p>
        </div>
      )}

      <SprayWindowCalculator
        lat={parcela.lat ?? undefined}
        lon={parcela.lon ?? undefined}
        refCatastral={parcela.referenciaCatastral ?? null}
      />

      <section>
        <h3 className="text-lg font-semibold text-tierra-800 mb-3">Cultivos</h3>
        {cultivos.length === 0 ? (
          <div className="card text-center py-8 text-tierra-600">
            <p className="mb-4">No hay cultivos en esta parcela.</p>
            <Link href={`/parcelas/${id}/cultivos/nuevo`} className="btn-primary">
              Añadir cultivo
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {cultivos.map((c: Cultivo) => (
              <li key={c.id}>
                <Link
                  href={`/cultivos/${c.id}`}
                  className="card flex justify-between items-center hover:border-verde-400 transition block"
                >
                  <div>
                    <span className="font-medium">{c.nombre}</span>
                    {c.variedad && (
                      <span className="text-sm text-tierra-500 ml-2">({c.variedad})</span>
                    )}
                  </div>
                  <span className="text-sm text-tierra-500 capitalize">{c.estado}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap gap-2">
        <Link href={`/labores?parcela=${id}`} className="btn-ghost">Ver labores de esta parcela</Link>
        <Link href={`/incidencias?parcela=${id}`} className="btn-ghost">Ver incidencias</Link>
        <button
          type="button"
          onClick={handleVerSalud}
          className="btn-primary"
          disabled={loadingSalud}
        >
          {loadingSalud ? "Calculando salud…" : "Ver Salud (NDVI)"}
        </button>
      </div>

      {showSalud && (
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-tierra-800">Salud del cultivo (NDVI)</h3>
          <p className="text-sm text-tierra-600">
            Mapa de vegetación a partir de Sentinel‑2 sobre la zona de la parcela. Rojo/naranja = vegetación escasa o en
            estrés; verde = vegetación sana.
          </p>
          {saludError && (
            <div className="card bg-amber-50 border-amber-200 text-amber-800 text-sm p-3">
              {saludError}
            </div>
          )}
          <MapaNDVI
            center={mapCenter ?? [40.4, -3.7]}
            zoom={15}
            refCatastral={rcMapa}
            onRefCatastralChange={setRcMapa}
            onCenterFromRef={(lat, lon) => setMapCenter([lat, lon])}
          />
        </section>
      )}
    </div>
  );
}

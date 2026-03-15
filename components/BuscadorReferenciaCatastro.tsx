"use client";

import { useState } from "react";
import Link from "next/link";
import { m2AHectareas } from "./BuscarCatastro";

export interface BuscadorReferenciaCatastroProps {
  /** Si se proporciona, se muestra el botón "Centrar mapa" y se llama con (lat, lon) */
  onCentrarMapa?: (lat: number, lon: number) => void;
  className?: string;
}

export function BuscadorReferenciaCatastro({ onCentrarMapa, className = "" }: BuscadorReferenciaCatastroProps) {
  const [rc, setRc] = useState("");
  const [provincia, setProvincia] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    referenciaCatastral: string;
    tipo: string;
    superficie?: number;
    localizacion?: string;
    lat: number;
    lon: number;
  } | null>(null);

  const handleBuscar = async () => {
    const ref = rc.replace(/\s/g, "").trim().toUpperCase();
    if (ref.length < 14) {
      setError("Introduce al menos 14 caracteres (ej. 18102A011007910001PS).");
      setResult(null);
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const qConsulta = new URLSearchParams({ rc: ref });
      if (provincia.trim()) qConsulta.set("provincia", provincia.trim());
      if (municipio.trim()) qConsulta.set("municipio", municipio.trim());
      const qCoord = new URLSearchParams({ rc: ref });
      if (provincia.trim()) qCoord.set("provincia", provincia.trim());
      if (municipio.trim()) qCoord.set("municipio", municipio.trim());
      const [consultaRes, coordRes] = await Promise.all([
        fetch(`/api/catastro/consulta?${qConsulta.toString()}`),
        fetch(`/api/catastro/coordenadas?${qCoord.toString()}`),
      ]);
      const consultaJson = await consultaRes.json();
      const coordJson = await coordRes.json();

      if (!consultaRes.ok) {
        setError(consultaJson.error || "No se encontraron datos en el Catastro.");
        return;
      }
      if (!coordRes.ok) {
        setError(coordJson.error || "No se pudieron obtener coordenadas.");
        return;
      }

      const datos = consultaJson.datos as Array<{ referenciaCatastral: string; tipo: string; superficie?: number; localizacion?: string }>;
      const primer = datos?.[0];
      setResult({
        referenciaCatastral: primer?.referenciaCatastral ?? ref.slice(0, 14),
        tipo: primer?.tipo ?? "rustico",
        superficie: primer?.superficie,
        localizacion: primer?.localizacion,
        lat: coordJson.lat,
        lon: coordJson.lon,
      });
    } catch {
      setError("Error de conexión. Compruebe la red e inténtelo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`card space-y-3 ${className}`}>
      <h3 className="font-medium text-tierra-800">Buscar por referencia catastral</h3>
      <p className="text-sm text-tierra-600">
        Introduce la referencia de 14, 18 o 20 caracteres (ej. 18102A011007910001PS). Si el Catastro lo pide, añade Provincia (ej. GR) y Municipio.
      </p>
      <div className="space-y-2">
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            className="input flex-1 min-w-[200px] font-mono text-sm"
            value={rc}
            onChange={(e) => { setError(null); setRc(e.target.value); }}
            placeholder="Ej. 18102A011007910001PS"
            maxLength={22}
            onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
          />
          <button
            type="button"
            onClick={handleBuscar}
            disabled={loading || rc.trim().length < 14}
            className="btn-primary whitespace-nowrap"
          >
            {loading ? "Buscando…" : "Buscar"}
          </button>
        </div>
        <div className="flex gap-2 flex-wrap items-center text-sm">
          <label className="text-tierra-600">Opcional (si el Catastro lo pide):</label>
          <input
            type="text"
            className="input w-24 font-mono"
            value={provincia}
            onChange={(e) => { setError(null); setProvincia(e.target.value.toUpperCase()); }}
            placeholder="Provincia (ej. GR)"
            maxLength={4}
          />
          <input
            type="text"
            className="input flex-1 min-w-[120px]"
            value={municipio}
            onChange={(e) => { setError(null); setMunicipio(e.target.value); }}
            placeholder="Municipio (nombre)"
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && (
        <div className="rounded-lg border border-tierra-200 bg-tierra-50/50 p-3 space-y-2 text-sm">
          <p className="font-mono font-medium text-tierra-800">{result.referenciaCatastral}</p>
          <p className="text-tierra-600 capitalize">{result.tipo}</p>
          {result.superficie != null && (
            <p className="text-tierra-700">
              Superficie: {result.superficie} m² ({m2AHectareas(result.superficie)} ha)
            </p>
          )}
          {result.localizacion && <p className="text-tierra-600">{result.localizacion}</p>}
          <p className="text-tierra-500 text-xs">Coordenadas: {result.lat.toFixed(5)}, {result.lon.toFixed(5)}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            {onCentrarMapa && (
              <button
                type="button"
                onClick={() => onCentrarMapa(result.lat, result.lon)}
                className="btn-secondary text-sm"
              >
                Centrar mapa aquí
              </button>
            )}
            <Link href="/fincas" className="btn-ghost text-sm">
              Usar al crear parcela
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

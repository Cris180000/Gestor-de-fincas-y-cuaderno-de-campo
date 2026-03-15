"use client";

import { useEffect, useState, useMemo } from "react";
import { WMSTileLayer } from "react-leaflet";

const NDVI_EVALSCRIPT = `//VERSION=3
function setup() {
  return { input: ["B04", "B08"], output: { bands: 3 } };
}
function evaluatePixel(sample) {
  var ndvi = (sample.B08 - sample.B04) / (sample.B08 + sample.B04);
  if (ndvi < -0.2) return [0.2, 0.2, 0.5];
  if (ndvi < 0) return [0.3, 0.4, 0.6];
  if (ndvi < 0.2) return [0.65, 0.4, 0.2];
  if (ndvi < 0.4) return [0.9, 0.7, 0.2];
  if (ndvi < 0.6) return [0.45, 0.7, 0.25];
  return [0.15, 0.5, 0.15];
}
`;

export interface DateRange {
  start: string;
  end: string;
}

export interface CopernicusLayerProps {
  parcelId?: string;
  dateRange: DateRange;
}

/**
 * Capa WMS de Copernicus (Sentinel-2 NDVI en color: marrón → amarillo → verde).
 * Obtiene el token vía /api/copernicus/token y pinta las peticiones WMS a través del proxy /api/copernicus/wms.
 * Debe usarse dentro de <MapContainer>.
 */
export function CopernicusLayer({ parcelId, dateRange }: CopernicusLayerProps) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/copernicus/token", { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
          return;
        }
        if (data.access_token) setToken(data.access_token);
        else setError("Respuesta sin access_token");
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? "Error al obtener token");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const evalscriptB64 = useMemo(
    () => (typeof btoa !== "undefined" ? btoa(NDVI_EVALSCRIPT) : ""),
    []
  );

  const timeParam = `${dateRange.start}/${dateRange.end}`;
  const baseUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/copernicus/wms?token=${encodeURIComponent(token ?? "")}`
      : "";

  if (error) {
    return (
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] rounded bg-red-100 text-red-800 px-3 py-2 text-sm shadow">
        Copernicus: {error}
      </div>
    );
  }

  if (!token || !baseUrl) {
    return (
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] rounded bg-white/90 text-tierra-700 px-3 py-2 text-sm shadow">
        Cargando capa satélite…
      </div>
    );
  }

  return (
    <WMSTileLayer
      url={baseUrl}
      params={{
        layers: "SENTINEL-2-L2A",
        format: "image/png",
        transparent: true,
        maxcc: 20,
        time: timeParam,
        EVALSCRIPT: evalscriptB64,
      }}
      opacity={0.85}
      zIndex={300}
    />
  );
}

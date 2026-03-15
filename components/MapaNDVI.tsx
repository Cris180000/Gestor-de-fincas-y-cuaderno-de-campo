"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, useMap, ImageOverlay, Polygon, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Layers, Plus, Minus } from "lucide-react";
// @ts-ignore: tipos no oficiales para estas librerías
import GeoRasterLayer from "georaster-layer-for-leaflet";
// @ts-ignore
import parseGeoraster from "georaster";

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function SetCenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center[0], center[1], zoom]);
  return null;
}

interface TimeRange {
  from: string;
  to: string;
}

interface NDVIRasterLayerProps {
  tiffData: ArrayBuffer;
}

interface ParcelInfoPopup {
  nombre?: string;
  referenciaCatastral?: string;
  superficieHa?: number | null;
  provisional?: boolean;
}

function NDVIRasterLayer({ tiffData }: NDVIRasterLayerProps) {
  const map = useMap();

  useEffect(() => {
    let layer: any;
    let cancelled = false;

    async function addLayer() {
      try {
        const georaster = await parseGeoraster(tiffData);
        if (cancelled) return;

        layer = new GeoRasterLayer({
          georaster,
          opacity: 0.85,
          resolution: 128,
          pixelValuesToColorFn: (values: number[]) => {
            const ndvi = values[0];
            if (ndvi == null || Number.isNaN(ndvi)) return null;
            if (ndvi < 0.2) return "#ff0000";
            if (ndvi < 0.4) return "#ff9900";
            if (ndvi < 0.6) return "#ffff00";
            return "#00a000";
          },
        });

        layer.addTo(map);
        try {
          map.fitBounds(layer.getBounds());
        } catch {
          // por si el TIFF no tiene bounds válidos
        }
      } catch (e) {
        console.error("Error al cargar GeoTIFF NDVI:", e);
      }
    }

    addLayer();

    return () => {
      cancelled = true;
      if (layer) {
        map.removeLayer(layer);
      }
    };
  }, [map, tiffData]);

  return null;
}

function NDVIOverlay({ enabled, timeRange }: { enabled: boolean; timeRange?: TimeRange }) {
  const map = useMap();
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) {
      setUrl(null);
      setBounds(null);
      return;
    }

    const update = () => {
      const b = map.getBounds();
      const w = b.getWest();
      const s = b.getSouth();
      const e = b.getEast();
      const n = b.getNorth();
      let time: string;
      if (timeRange) {
        time = `${timeRange.from}/${timeRange.to}`;
      } else {
        const end = new Date();
        const start = new Date(end);
        start.setDate(start.getDate() - 30);
        time = `${start.toISOString().slice(0, 10)}/${end.toISOString().slice(0, 10)}`;
      }

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const params = new URLSearchParams({
        SERVICE: "WMS",
        REQUEST: "GetMap",
        VERSION: "1.3.0",
        LAYERS: "NDVI",
        CRS: "EPSG:4326",
        BBOX: `${s},${w},${n},${e}`,
        WIDTH: "512",
        HEIGHT: "512",
        FORMAT: "image/png",
        TIME: time,
      });

      fetch(`/api/ndvi/wms?${params}`, { signal: abortRef.current.signal })
        .then((r) => {
          if (!r.ok) return r.json().then((j) => Promise.reject(new Error(j.error || r.statusText)));
          return r.blob();
        })
        .then((blob) => {
          setUrl(URL.createObjectURL(blob));
          setBounds(b);
          setError(null);
        })
        .catch((err) => {
          if (err.name !== "AbortError") setError(err.message || "Error al cargar NDVI");
        });
    };

    update();
    map.on("moveend", update);
    return () => {
      map.off("moveend", update);
      if (url) URL.revokeObjectURL(url);
    };
  }, [enabled, map, timeRange?.from, timeRange?.to]);

  if (!enabled || error) return null;
  if (!url || !bounds) return <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-[400] text-tierra-600">Cargando NDVI…</div>;

  return <ImageOverlay url={url} bounds={bounds} opacity={0.85} zIndex={300} />;
}

function MapInstanceBridge({ onMapReady }: { onMapReady: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);
  return null;
}

export interface MapaNDVIProps {
  center: [number, number];
  zoom?: number;
  parcelPolygon?: [number, number][];
  parcelInfo?: ParcelInfoPopup;
  refCatastral?: string;
  onRefCatastralChange?: (value: string) => void;
  onCenterFromRef?: (lat: number, lon: number) => void;
  /**
   * URL de una imagen de superposición ya generada externamente
   * (por ejemplo, resultado de un servicio de satélite).
   * Si se indica, se usará esta imagen en lugar de solicitar el WMS interno.
   */
  overlayImage?: string;
  /**
   * Rango temporal para el NDVI (YYYY-MM-DD). Si no se indica, se usan los
   * últimos 30 días.
   */
  timeRange?: TimeRange;
  /**
   * Segundo rango para comparación temporal (Antes/Después). Si se indica,
   * se muestra un selector para alternar entre timeRange y timeRangeCompare.
   */
  timeRangeCompare?: TimeRange;
}

function defaultLast30Days(): TimeRange {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}

function defaultPrevious30Days(): TimeRange {
  const end = new Date();
  end.setDate(end.getDate() - 31);
  const start = new Date(end);
  start.setDate(start.getDate() - 29);
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}

export function MapaNDVI({
  center,
  zoom = 14,
  parcelPolygon,
  parcelInfo,
  refCatastral = "",
  onRefCatastralChange,
  onCenterFromRef,
  overlayImage,
  timeRange,
  timeRangeCompare,
}: MapaNDVIProps) {
  const [ndviOn, setNdviOn] = useState(true);
  const [coordError, setCoordError] = useState<string | null>(null);
  const [loadingCoords, setLoadingCoords] = useState(false);
  const [tiffData, setTiffData] = useState<ArrayBuffer | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [comparePeriod, setComparePeriod] = useState<"A" | "B">("A");
  const [compareMode, setCompareMode] = useState(false);
  const [mapKey] = useState(() => Math.random());

  const effectiveTimeRange = timeRange ?? defaultLast30Days();
  const compareRange = timeRangeCompare ?? defaultPrevious30Days();
  const activeTimeRange = compareMode && timeRangeCompare ? (comparePeriod === "A" ? effectiveTimeRange : compareRange) : effectiveTimeRange;

  const buscarCoords = async () => {
    const rc = (refCatastral ?? "").replace(/\s/g, "").trim();
    if (rc.length < 14) {
      setCoordError("Introduce una referencia catastral de 14, 18 o 20 caracteres.");
      return;
    }
    setCoordError(null);
    setLoadingCoords(true);
    try {
      const res = await fetch(`/api/catastro/coordenadas?rc=${encodeURIComponent(rc)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      onCenterFromRef?.(data.lat, data.lon);
    } catch (e) {
      setCoordError(e instanceof Error ? e.message : "No se encontraron coordenadas");
    } finally {
      setLoadingCoords(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <p className="text-sm text-tierra-700">
          Capa NDVI: <span className="font-semibold">{ndviOn ? "Activa" : "Oculta"}</span>
        </p>
        {!tiffData && (
          <>
            <input
              type="text"
              placeholder="Ref. catastral (14, 18 o 20 caracteres)"
              className="input text-sm w-52 font-mono"
              value={refCatastral}
              onChange={(e) => onRefCatastralChange?.(e.target.value)}
            />
            <button type="button" onClick={buscarCoords} disabled={loadingCoords} className="btn-secondary text-sm">
              {loadingCoords ? "Buscando…" : "Centrar en parcela"}
            </button>
          </>
        )}
        <div className="flex flex-wrap items-center gap-2 text-xs text-tierra-600">
          <label className="label mb-0">o subir NDVI (.tif)</label>
          <input
            type="file"
            accept=".tif,.tiff"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                if (reader.result instanceof ArrayBuffer) {
                  setTiffData(reader.result);
                  setCoordError(null);
                }
              };
              reader.onerror = () => {
                setCoordError("No se pudo leer el archivo GeoTIFF.");
              };
              reader.readAsArrayBuffer(file);
            }}
            className="text-xs"
          />
          {tiffData && (
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => setTiffData(null)}
            >
              Quitar GeoTIFF
            </button>
          )}
        </div>
        {coordError && <span className="text-sm text-red-600">{coordError}</span>}
        {!tiffData && !overlayImage && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCompareMode((v) => !v)}
              className={`text-sm px-3 py-1.5 rounded-lg border ${compareMode ? "bg-primary/10 border-primary text-primary" : "border-tierra-200 text-tierra-600 hover:bg-tierra-50"}`}
            >
              Comparar fechas
            </button>
            {compareMode && (
              <div className="flex rounded-lg border border-tierra-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setComparePeriod("B")}
                  className={`px-3 py-1.5 text-sm ${comparePeriod === "B" ? "bg-tierra-200 font-medium" : "bg-white hover:bg-tierra-50"}`}
                >
                  Anterior ({compareRange.from}–{compareRange.to})
                </button>
                <button
                  type="button"
                  onClick={() => setComparePeriod("A")}
                  className={`px-3 py-1.5 text-sm border-l border-tierra-200 ${comparePeriod === "A" ? "bg-tierra-200 font-medium" : "bg-white hover:bg-tierra-50"}`}
                >
                  Reciente ({effectiveTimeRange.from}–{effectiveTimeRange.to})
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="relative rounded-lg overflow-hidden border border-tierra-200" style={{ height: "450px" }}>
        <MapContainer
          key={mapKey}
          center={center}
          zoom={zoom}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
          zoomControl={false}
        >
          <MapInstanceBridge onMapReady={setMapInstance} />
          <SetCenter center={center} zoom={zoom} />
          <TileLayer url={OSM_URL} attribution={OSM_ATTRIBUTION} />
          {parcelPolygon && parcelPolygon.length >= 3 && (
            <Polygon
              positions={parcelPolygon}
              pathOptions={{
                fillColor: "#10b981",
                fillOpacity: 0.2,
                color: "#047857",
                weight: 2,
                dashArray: parcelInfo?.provisional ? "6 6" : undefined,
              }}
            />
          )}
          {parcelInfo && (
            <Popup
              position={center}
              className="gis-popup-card"
              closeButton={false}
              autoPan={false}
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold text-tierra-900">
                  {parcelInfo.nombre ?? "Parcela"}
                </p>
                {parcelInfo.referenciaCatastral && (
                  <p className="text-xs text-tierra-600 font-mono">
                    RC: {parcelInfo.referenciaCatastral}
                  </p>
                )}
                {parcelInfo.superficieHa != null && (
                  <p className="text-xs text-tierra-700">
                    Superficie:{" "}
                    <span className="font-medium">{Number(parcelInfo.superficieHa).toFixed(2)} ha</span>
                  </p>
                )}
                <p className="text-xs text-tierra-700">
                  Estado:{" "}
                  <span className="font-medium">
                    {parcelInfo.provisional ? "Provisional" : "Definitiva"}
                  </span>
                </p>
              </div>
            </Popup>
          )}
          {overlayImage ? (
            <ImageOverlay
              url={overlayImage}
              // Para la simulación usamos un bounding box global; en una
              // integración real se debe ajustar a la geometría de la parcela.
              bounds={[
                [-90, -180],
                [90, 180],
              ]}
              opacity={0.85}
              zIndex={300}
            />
          ) : tiffData ? (
            <NDVIRasterLayer tiffData={tiffData} />
          ) : (
            <NDVIOverlay enabled={ndviOn} timeRange={activeTimeRange} />
          )}
        </MapContainer>

        <div className="absolute top-3 right-3 z-[500] flex flex-col gap-2 pointer-events-none">
          <button
            type="button"
            onClick={() => mapInstance?.zoomIn()}
            className="pointer-events-auto h-10 w-10 rounded-xl bg-white text-tierra-700 shadow-subtle border border-tierra-200 hover:bg-tierra-50 inline-flex items-center justify-center"
            aria-label="Acercar"
            title="Acercar"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => mapInstance?.zoomOut()}
            className="pointer-events-auto h-10 w-10 rounded-xl bg-white text-tierra-700 shadow-subtle border border-tierra-200 hover:bg-tierra-50 inline-flex items-center justify-center"
            aria-label="Alejar"
            title="Alejar"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setNdviOn((v) => !v)}
            className={`pointer-events-auto h-10 w-10 rounded-xl bg-white shadow-subtle border border-tierra-200 hover:bg-tierra-50 inline-flex items-center justify-center ${
              ndviOn ? "text-primary" : "text-tierra-700"
            }`}
            aria-label="Activar o desactivar capa NDVI"
            title="Capas"
          >
            <Layers className="h-4 w-4" />
          </button>
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between pointer-events-none">
          <div className="bg-white/95 rounded px-2 py-1.5 shadow text-xs text-tierra-700">
            <p className="font-medium">NDVI (Sentinel-2)</p>
            <p>Rojo / naranja: poca vegetación. Verde: vegetación sana.</p>
            <p className="mt-1 text-tierra-500">Datos: Copernicus (ESA). Últimos 30 días.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";

type Suitability = "bueno" | "regular" | "malo";

interface ForecastDay {
  date: string;
  rainMm: number;
  windMaxKmh: number;
  tempMaxC: number;
  rainProbPercent: number;
  hasStorm: boolean;
  suitability: Suitability;
}

interface ForecastSlot {
  time: string; // ISO
  windKmh: number;
  tempC: number;
  rainProbPercent: number;
  suitability: Suitability;
}

interface SprayWindowCalculatorProps {
  /** Latitud de la finca/parcela (EPSG:4326). Opcional si se pasa refCatastral. */
  lat?: number;
  /** Longitud de la finca/parcela (EPSG:4326). Opcional si se pasa refCatastral. */
  lon?: number;
  /** Referencia catastral para resolver coordenadas si no se pasa lat/lon. */
  refCatastral?: string | null;
}

/**
 * Calculadora de ventana de tratamiento basada en previsión meteorológica.
 *
 * - Obtiene coordenadas a partir de la referencia catastral si no se proporcionan lat/lon.
 * - Llama a /api/weather/forecast para obtener la previsión resumida por día.
 * - Marca como "buenos" los días con poca lluvia y viento moderado,
 *   "regulares" los intermedios y "malos" los de lluvia fuerte / tormenta / viento alto.
 */
export function SprayWindowCalculator({
  lat,
  lon,
  refCatastral,
}: SprayWindowCalculatorProps) {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(
    lat != null && lon != null ? { lat, lon } : null
  );
  const [forecast, setForecast] = useState<ForecastDay[] | null>(null);
  const [slots24h, setSlots24h] = useState<ForecastSlot[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolver coordenadas desde Catastro si hace falta
  useEffect(() => {
    if (lat != null && lon != null) {
      setCoords({ lat, lon });
      return;
    }
    const rc = refCatastral?.trim();
    if (!rc) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/catastro/coordenadas?rc=${encodeURIComponent(rc)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "No se pudieron obtener coordenadas de Catastro");
        }
        if (!cancelled) {
          setCoords({ lat: data.lat, lon: data.lon });
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "No se pudieron obtener coordenadas de la parcela."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lon, refCatastral]);

  // Cargar previsión de OpenWeatherMap (vía API interna)
  useEffect(() => {
    if (!coords) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setForecast(null);
    setSlots24h(null);

    const params = new URLSearchParams({
      lat: String(coords.lat),
      lon: String(coords.lon),
      units: "metric",
      lang: "es",
    });

    fetch(`/api/weather/forecast?${params.toString()}`)
      .then(async (res) => {
        const text = await res.text();
        if (!res.ok) {
          let message = "No se pudo obtener la previsión meteorológica.";
          try {
            const data = JSON.parse(text);
            if (data?.error) message = data.error;
          } catch {
            // ignoramos error de parseo
          }
          throw new Error(message);
        }
        let data: { days?: ForecastDay[]; slots24h?: ForecastSlot[] };
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error("La respuesta de clima no es válida.");
        }
        if (!cancelled) {
          setForecast(data.days ?? []);
          setSlots24h(data.slots24h ?? null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "No se pudo cargar la previsión de tratamiento."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [coords]);

  const recommendedWindow = useMemo(() => {
    if (!forecast || forecast.length === 0) return null;
    // Buscamos el primer tramo de 2–3 días seguidos que no sean "malos".
    let bestStartIndex: number | null = null;
    let bestLength = 0;

    let i = 0;
    while (i < forecast.length) {
      if (forecast[i].suitability === "malo") {
        i++;
        continue;
      }
      let j = i;
      while (
        j < forecast.length &&
        forecast[j].suitability !== "malo"
      ) {
        j++;
      }
      const length = j - i;
      if (length > bestLength) {
        bestLength = length;
        bestStartIndex = i;
      }
      i = j;
    }

    if (bestStartIndex == null || bestLength === 0) return null;
    const start = forecast[bestStartIndex];
    const end = forecast[bestStartIndex + bestLength - 1];
    return { start, end, length: bestLength };
  }, [forecast]);

  const getPillClasses = (s: Suitability) => {
    if (s === "bueno") return "bg-emerald-50 text-emerald-800 border-emerald-200";
    if (s === "regular") return "bg-amber-50 text-amber-800 border-amber-200";
    return "bg-red-50 text-red-800 border-red-200";
  };

  const getLabel = (s: Suitability) => {
    if (s === "bueno") return "Día muy favorable";
    if (s === "regular") return "Día aceptable";
    return "Día desaconsejado";
  };

  return (
    <section className="card space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-tierra-800">
            Ventana de tratamiento
          </h3>
          <p className="text-xs text-tierra-500">
            Basado en previsión de lluvia, viento, temperatura y tormentas (OpenWeatherMap).
          </p>
        </div>
        {coords && (
          <p className="text-[11px] text-tierra-400 text-right">
            {coords.lat.toFixed(3)}, {coords.lon.toFixed(3)}
          </p>
        )}
      </div>

      {loading && (
        <p className="text-sm text-tierra-600">Calculando mejor ventana de tratamiento…</p>
      )}

      {error && !loading && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </div>
      )}

      {!loading && !error && !coords && (
        <p className="text-sm text-tierra-600">
          Añade una referencia catastral a la parcela o indica sus coordenadas para poder
          calcular la ventana de tratamiento.
        </p>
      )}

      {!loading && !error && coords && forecast && forecast.length === 0 && (
        <p className="text-sm text-tierra-600">
          No hay previsión disponible para los próximos días en esta ubicación.
        </p>
      )}

      {!loading && !error && coords && slots24h && slots24h.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-tierra-700">
            Semáforo próximas 24 h (cada bloque ≈ 3 h)
          </p>
          <div className="flex gap-1">
            {slots24h.map((s) => {
              const d = new Date(s.time);
              const hour = d.toISOString().slice(11, 16); // HH:MM
              const base =
                s.suitability === "bueno"
                  ? "bg-emerald-500"
                  : s.suitability === "regular"
                  ? "bg-amber-400"
                  : "bg-red-500";
              const title =
                (s.suitability === "bueno"
                  ? "Óptimo para tratar"
                  : s.suitability === "regular"
                  ? "Precaución"
                  : "Prohibido") +
                ` · ${hour} · Viento ${s.windKmh} km/h · ${s.tempC} °C · Prob. lluvia ${s.rainProbPercent}%`;
              return (
                <div key={s.time} className="flex-1 flex flex-col items-center">
                  <div
                    className={`w-full h-3 rounded-full ${base}`}
                    title={title}
                  />
                  <span className="mt-1 text-[10px] text-tierra-600">
                    {hour}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-tierra-500">
            <span>Verde: Óptimo</span>
            <span>Amarillo: Precaución</span>
            <span>Rojo: Prohibido</span>
          </div>
        </div>
      )}

      {!loading && !error && coords && forecast && forecast.length > 0 && (
        <>
          {recommendedWindow ? (
            <div className="rounded-md border border-verde-200 bg-verde-50 px-3 py-2">
              <p className="text-sm font-medium text-verde-800">
                Ventana recomendada de tratamiento:
              </p>
              <p className="text-sm text-verde-900">
                Entre{" "}
                <span className="font-semibold">
                  {recommendedWindow.start.date}
                </span>{" "}
                y{" "}
                <span className="font-semibold">
                  {recommendedWindow.end.date}
                </span>{" "}
                ({recommendedWindow.length}{" "}
                {recommendedWindow.length === 1 ? "día" : "días"} seguidos
                sin condiciones muy desfavorables).
              </p>
              <p className="mt-1 text-[11px] text-verde-900/80">
                Revisa siempre etiqueta del producto (viento máx., riesgo de lavado por lluvia)
                y normativa de tu zona antes de aplicar.
              </p>
            </div>
          ) : (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              No se ha encontrado una ventana clara de varios días sin lluvia fuerte o viento
              alto. Valora posponer el tratamiento o ajustar la estrategia.
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            {forecast.map((d) => (
              <div
                key={d.date}
                className={`rounded-md border px-3 py-2 text-sm ${getPillClasses(
                  d.suitability
                )}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-medium">{d.date}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide">
                    {d.suitability === "bueno"
                      ? "Bueno"
                      : d.suitability === "regular"
                      ? "Regular"
                      : "Malo"}
                  </span>
                </div>
                <p className="text-[11px] mb-1">{getLabel(d.suitability)}</p>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <span>Lluvia: {d.rainMm} mm (24 h)</span>
                  <span>Viento máx.: {d.windMaxKmh} km/h</span>
                  <span>Temp. máx.: {d.tempMaxC} °C</span>
                  <span>Prob. lluvia: {d.rainProbPercent}%</span>
                  {d.hasStorm && <span>⚡ Riesgo de tormenta</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}


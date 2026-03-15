"use client";

import { useEffect, useState, useMemo } from "react";
import type { SprayWindowSlot, SpraySuitability } from "@/lib/services/weather-service";

export interface SprayWindowWidgetProps {
  /** Coordenadas para cargar datos (si no se pasan slots) */
  lat?: number;
  lon?: number;
  /** Datos pre-cargados; si se pasan, no se usa lat/lon para fetch */
  slots?: SprayWindowSlot[];
  /** Número de horas a mostrar en la línea de tiempo (24 o 48) */
  hoursCount?: number;
}

function formatHour(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function getBgClass(s: SpraySuitability): string {
  if (s === "OPTIMAL") return "bg-emerald-500";
  if (s === "WARNING") return "bg-amber-400";
  return "bg-rose-500";
}

function getActionLabel(s: SpraySuitability): string {
  if (s === "OPTIMAL") return "Óptimo para tratar";
  if (s === "WARNING") return "Precaución";
  return "NO TRATAR";
}

function getWindLabel(kmh: number): string {
  if (kmh > 15) return "Alto";
  if (kmh > 10) return "Moderado";
  return "Bajo";
}

/** Calcula la mejor ventana hoy: el tramo más largo de horas OPTIMAL en las próximas 24 h */
function bestWindowToday(slots: SprayWindowSlot[], maxHours: number): { start: string; end: string } | null {
  const slice = slots.slice(0, Math.min(24, maxHours));
  let bestStart: number | null = null;
  let bestLen = 0;
  let i = 0;

  while (i < slice.length) {
    if (slice[i].suitability !== "OPTIMAL") {
      i++;
      continue;
    }
    let j = i;
    while (j < slice.length && slice[j].suitability === "OPTIMAL") j++;
    const len = j - i;
    if (len > bestLen) {
      bestLen = len;
      bestStart = i;
    }
    i = j;
  }

  if (bestStart == null || bestLen === 0) return null;
  return {
    start: formatHour(slice[bestStart].hour),
    end: formatHour(slice[bestStart + bestLen - 1].hour),
  };
}

export function SprayWindowWidget({
  lat,
  lon,
  slots: initialSlots,
  hoursCount = 48,
}: SprayWindowWidgetProps) {
  const [slots, setSlots] = useState<SprayWindowSlot[]>(initialSlots ?? []);
  const [loading, setLoading] = useState(!initialSlots && lat != null && lon != null);
  const [error, setError] = useState<string | null>(null);
  const [tooltipSlot, setTooltipSlot] = useState<SprayWindowSlot | null>(null);

  useEffect(() => {
    if (initialSlots) {
      setSlots(initialSlots);
      setLoading(false);
      setError(null);
      return;
    }
    if (lat == null || lon == null) {
      setSlots([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    fetch(`/api/weather/spray-window?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.slots) throw new Error(data.error ?? "Sin datos");
        setSlots(data.slots);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Error al cargar ventana de pulverización");
        setSlots([]);
      })
      .finally(() => setLoading(false));
  }, [lat, lon, initialSlots]);

  const displaySlots = useMemo(
    () => slots.slice(0, hoursCount),
    [slots, hoursCount]
  );

  const bestWindow = useMemo(
    () => bestWindowToday(slots, hoursCount),
    [slots, hoursCount]
  );

  if (loading) {
    return (
      <div className="rounded-xl border border-tierra-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-tierra-600">Cargando ventana de pulverización…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        {error}
      </div>
    );
  }

  if (displaySlots.length === 0) {
    return (
      <div className="rounded-xl border border-tierra-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-tierra-600">
          Indica coordenadas (lat/lon) o proporciona datos para ver la ventana de pulverización.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-tierra-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-tierra-800 mb-1">
        Ventana de pulverización
      </h3>

      {bestWindow ? (
        <p className="text-sm text-tierra-700 mb-3">
          Mejor ventana hoy: De <strong>{bestWindow.start}</strong> a <strong>{bestWindow.end}</strong>
        </p>
      ) : (
        <p className="text-sm text-amber-700 mb-3">
          No hay ventana óptima en las próximas 24 h. Revisa las horas en amarillo con precaución.
        </p>
      )}

      <div className="overflow-x-auto pb-2 -mx-1">
        <div className="flex gap-0.5 min-w-max">
          {displaySlots.map((slot) => {
            const hourLabel = formatHour(slot.hour);
            const actionLabel = getActionLabel(slot.suitability);
            const windLabel = getWindLabel(slot.wind_speed);
            const tooltipText = `${hourLabel} - Viento: ${slot.wind_speed} km/h (${windLabel}) - ${actionLabel}${slot.reason ? ` · ${slot.reason}` : ""}`;

            return (
              <div
                key={slot.hour}
                className="flex flex-col items-center w-6 flex-shrink-0 relative group"
                onMouseEnter={() => setTooltipSlot(slot)}
                onMouseLeave={() => setTooltipSlot(null)}
                onClick={() => setTooltipSlot((prev) => (prev?.hour === slot.hour ? null : slot))}
              >
                <div
                  className={`w-5 h-14 rounded ${getBgClass(slot.suitability)} cursor-default transition opacity-90 hover:opacity-100`}
                  title={tooltipText}
                  aria-label={tooltipText}
                />
                <span className="mt-1 text-[10px] text-tierra-600 whitespace-nowrap">
                  {hourLabel}
                </span>
                {tooltipSlot?.hour === slot.hour && (
                  <div
                    className="absolute z-10 left-1/2 -translate-x-1/2 bottom-full mb-1 px-2 py-1.5 rounded bg-tierra-800 text-white text-xs font-medium whitespace-nowrap pointer-events-none shadow-lg"
                    role="tooltip"
                  >
                    {hourLabel} — Viento: {slot.wind_speed} km/h ({windLabel}) — {actionLabel}
                    {slot.rain_prob > 0 && ` · Lluvia ${slot.rain_prob}%`}
                    {slot.temp != null && ` · ${slot.temp} °C`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mt-2 text-[10px] text-tierra-500">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Óptimo
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-amber-400" /> Precaución
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-rose-500" /> No tratar
        </span>
      </div>
    </div>
  );
}

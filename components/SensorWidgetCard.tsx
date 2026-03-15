"use client";

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

const TWENTY_FOUR_H = 24 * 60 * 60 * 1000;

type SensorType = "humedad_suelo" | "estacion_clima";

export interface SensorWidgetCardProps {
  /** Nombre del sensor (ej. "Sonda de Suelo", "Estación Meteo") */
  name: string;
  /** Último valor leído (null si no hay datos) */
  lastValue: number | null;
  /** Unidad (%, °C, hPa, etc.) */
  unit: string;
  /** Última vez que el sensor envió datos (ISO o Date). Si hace >24h → "Desconectado". */
  lastSeen?: string | Date | null;
  /** Nivel de batería 0-100 (opcional; si null no se muestra) */
  batteryLevel?: number | null;
  /** Valor de hace ~1 h para la tendencia (opcional). Si no se pasa, no se muestra flecha. */
  valueOneHourAgo?: number | null;
  /** Tipo de sensor (define el icono por defecto) */
  tipo?: SensorType;
  /** Rango válido: si lastValue está fuera, borde rojo */
  min?: number;
  max?: number;
}

function SensorIcon({ tipo }: { tipo: SensorType }) {
  const className = "h-8 w-8 text-tierra-600";
  if (tipo === "humedad_suelo") {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2.69c.38-.5 1-.5 1.38 0l4.6 6.06c.6.8.92 1.75.92 2.7 0 2.62-2.13 4.75-4.75 4.75S9.25 14.07 9.25 11.45c0-.95.32-1.9.92-2.7L12 2.69z" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function TrendArrow({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  if (diff === 0) return null;
  const up = diff > 0;
  return (
    <span
      className={`inline-flex items-center text-xs font-medium ${up ? "text-green-600" : "text-red-600"}`}
      title={up ? "Subiendo respecto a hace 1 h" : "Bajando respecto a hace 1 h"}
    >
      {up ? (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M7 14l5-5 5 5H7z" />
        </svg>
      ) : (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M7 10l5 5 5-5H7z" />
        </svg>
      )}
    </span>
  );
}

function isDisconnected(lastSeen: string | Date | null | undefined): boolean {
  if (lastSeen == null) return true;
  const t = typeof lastSeen === "string" ? new Date(lastSeen).getTime() : lastSeen.getTime();
  return Number.isNaN(t) || Date.now() - t > TWENTY_FOUR_H;
}

function isOutOfRange(value: number | null, min?: number, max?: number): boolean {
  if (value == null) return false;
  if (min != null && value < min) return true;
  if (max != null && value > max) return true;
  return false;
}

export function SensorWidgetCard({
  name,
  lastValue,
  unit,
  lastSeen = null,
  batteryLevel = null,
  valueOneHourAgo = null,
  tipo = "humedad_suelo",
  min,
  max,
}: SensorWidgetCardProps) {
  const disconnected = isDisconnected(lastSeen);
  const outOfRange = isOutOfRange(lastValue, min, max);
  const showTrend =
    lastValue != null &&
    valueOneHourAgo != null &&
    !Number.isNaN(valueOneHourAgo);

  const borderClass = outOfRange
    ? "border-red-400"
    : "border-tierra-200";

  return (
    <Card className={`${borderClass} h-full flex flex-col`}>
      <CardHeader className="pb-2 flex flex-row items-start gap-3">
        <div className="flex-shrink-0 rounded-lg bg-tierra-100 p-2">
          <SensorIcon tipo={tipo} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-tierra-800 truncate">
              {name}
            </h3>
            {disconnected && (
              <span className="flex items-center gap-1 text-xs text-tierra-500 flex-shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-tierra-400" aria-hidden />
                Desconectado
              </span>
            )}
          </div>
          {batteryLevel != null && !disconnected && (
            <div className="mt-1 flex items-center gap-1">
              <span className="text-xs text-tierra-500">Batería</span>
              <div className="h-1.5 w-12 rounded-full bg-tierra-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-colors ${
                    batteryLevel <= 15
                      ? "bg-red-500"
                      : batteryLevel <= 40
                        ? "bg-amber-500"
                        : "bg-green-500"
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, batteryLevel))}%` }}
                />
              </div>
              <span className="text-xs text-tierra-600 tabular-nums">{batteryLevel}%</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span
            className={`text-2xl font-bold tabular-nums ${
              lastValue == null ? "text-tierra-400" : outOfRange ? "text-red-700" : "text-tierra-800"
            }`}
          >
            {lastValue != null ? lastValue.toFixed(1) : "—"}
          </span>
          {lastValue != null && <span className="text-sm text-tierra-500">{unit}</span>}
          {showTrend && (
            <TrendArrow current={lastValue!} previous={valueOneHourAgo!} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

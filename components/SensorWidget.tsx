"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

type SensorType = "humedad_suelo" | "estacion_clima";

export interface SensorSample {
  timestamp: string; // ISO
  value: number;
}

export interface SensorWidgetProps {
  /** Nombre del dispositivo o ubicación (ej. "Sonda sector 1") */
  title: string;
  /** Texto pequeño bajo el título (ej. "Humedad suelo · 10 cm") */
  subtitle?: string;
  /** Tipo de sensor para adaptar textos por defecto */
  type: SensorType;
  /** Últimas muestras ordenadas por tiempo ascendente o descendente */
  data: SensorSample[];
  /** Unidad que se mostrará junto al valor y en el eje Y (%, kPa, °C, mm, etc.) */
  unit: string;
  /** Valor mínimo recomendado o umbral inferior (opcional) */
  minThreshold?: number;
  /** Valor máximo recomendado o umbral superior (opcional) */
  maxThreshold?: number;
}

function formatTimeLabel(iso: string) {
  // Muestra solo HH:MM o fecha corta si cambia de día
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  } catch {
    return iso;
  }
}

export function SensorWidget({
  title,
  subtitle,
  type,
  data,
  unit,
  minThreshold,
  maxThreshold,
}: SensorWidgetProps) {
  const hasData = data && data.length > 0;
  const latest = hasData ? data[data.length - 1] : null;

  // Filtramos datos a aproximadamente las últimas 24 horas para el sparkline
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const sparklineData = hasData
    ? [...data]
        .filter((d) => {
          const t = new Date(d.timestamp).getTime();
          return !Number.isNaN(t) && t >= dayAgo && t <= now;
        })
        .sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
    : [];

  const isIrrigationAlert =
    type === "humedad_suelo" && latest != null && latest.value < 15;

  let statusLabel = "";
  if (latest != null) {
    if (minThreshold != null && latest.value < minThreshold) {
      statusLabel =
        type === "humedad_suelo"
          ? "Por debajo del rango óptimo (suelo seco)"
          : "Por debajo del rango esperado";
    } else if (maxThreshold != null && latest.value > maxThreshold) {
      statusLabel =
        type === "humedad_suelo"
          ? "Por encima del rango óptimo (riesgo de encharcamiento)"
          : "Por encima del rango esperado";
    } else if (minThreshold != null || maxThreshold != null) {
      statusLabel = "Dentro del rango esperado";
    }
  }

  return (
    <Card
      className={`h-full flex flex-col ${
        isIrrigationAlert ? "border-red-400 bg-red-50" : ""
      }`}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span className="flex items-center gap-1">
            {isIrrigationAlert && <span className="text-red-600 text-lg">💧⚠️</span>}
            <span>{title}</span>
          </span>
          {hasData && (
            <span className="text-sm font-normal text-tierra-500">
              {new Date(latest!.timestamp).toLocaleString("es-ES", {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
              })}
            </span>
          )}
        </CardTitle>
        {subtitle && (
          <CardDescription className="text-xs">
            {subtitle}
            {isIrrigationAlert && " · Alerta de riego"}
          </CardDescription>
        )}
        {hasData && (
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-semibold ${
                isIrrigationAlert ? "text-red-700" : "text-tierra-800"
              }`}
            >
              {latest!.value.toFixed(1)}
              <span className="text-sm align-middle text-tierra-500 ml-1">{unit}</span>
            </span>
            {statusLabel && (
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full ${
                  isIrrigationAlert
                    ? "bg-red-100 text-red-800"
                    : "bg-tierra-100 text-tierra-700"
                }`}
              >
                {isIrrigationAlert ? "Alerta de riego: suelo muy seco" : statusLabel}
              </span>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between pb-4">
        {sparklineData.length > 0 ? (
          <div className="h-32 sm:h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={sparklineData}
                margin={{ top: 4, right: 4, bottom: 2, left: 4 }}
              >
                {/* Sparkline minimalista: sin ejes ni grid visibles */}
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleString("es-ES")}
                  formatter={(value: number) => [`${value.toFixed(2)} ${unit}`, "Valor"]}
                />
                {minThreshold != null && (
                  <ReferenceLine
                    y={minThreshold}
                    stroke="#f97316"
                    strokeDasharray="4 4"
                    ifOverflow="extendDomain"
                  />
                )}
                {maxThreshold != null && (
                  <ReferenceLine
                    y={maxThreshold}
                    stroke="#f97316"
                    strokeDasharray="4 4"
                    ifOverflow="extendDomain"
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={type === "humedad_suelo" ? "#16a34a" : "#0ea5e9"}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-tierra-500">
            Sin lecturas recientes para este sensor (últimas 24 horas).
          </p>
        )}
      </CardContent>
    </Card>
  );
}


"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";

export interface DateRange {
  start: string;
  end: string;
}

export interface SensorChartDataPoint {
  timestamp: string;
  value: number;
  unit: string;
}

export interface SensorChartProps {
  deviceId: string;
  dateRange: DateRange;
  /** Datos de telemetría para el dispositivo en el rango (ordenados por timestamp) */
  data: SensorChartDataPoint[];
  /** Título del gráfico (ej. nombre del dispositivo o métrica) */
  title?: string;
  /** Descripción opcional */
  description?: string;
  /** Línea de referencia roja: valor crítico (ej. 15 para humedad < 15%, 0 para temp < 0°C). Se muestra si hay datos que la crucen o por claridad. */
  criticalThreshold?: number;
  /** Color del área (gradiente). Por defecto verde para humedad, azul para clima. */
  color?: string;
}

function gradientId(deviceId: string) {
  return `sensor-chart-gradient-${deviceId.replace(/[^a-z0-9-]/gi, "-")}`;
}

function isSameDay(start: string, end: string): boolean {
  const a = new Date(start);
  const b = new Date(end);
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function formatXAxisTick(iso: string, useTime: boolean): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  if (useTime) {
    return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  }
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatTooltipDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function SensorChart({
  deviceId,
  dateRange,
  data,
  title = "Sensor",
  description,
  criticalThreshold,
  color = "#16a34a",
}: SensorChartProps) {
  const useTimeFormat = isSameDay(dateRange.start, dateRange.end);
  const gradId = gradientId(deviceId);
  const chartData = data.map((d) => ({
    ...d,
    timestamp: d.timestamp,
    value: Math.round(d.value * 10) / 10,
  }));

  const unit = chartData[0]?.unit ?? "";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && (
          <CardDescription className="text-sm">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-tierra-500 py-8 text-center">
            No hay datos en el rango seleccionado.
          </p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <defs>
                  <linearGradient
                    id={gradId}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={color}
                      stopOpacity={0.5}
                    />
                    <stop
                      offset="100%"
                      stopColor={color}
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e5e7eb"
                  vertical={false}
                />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(v) => formatXAxisTick(v, useTimeFormat)}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={{ stroke: "#d1d5db" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => (unit ? `${v} ${unit}` : String(v))}
                  width={40}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as SensorChartDataPoint;
                    return (
                      <div className="rounded-lg border border-tierra-200 bg-white px-3 py-2 shadow-md">
                        <p className="text-xs text-tierra-500">
                          {formatTooltipDate(p.timestamp)}
                        </p>
                        <p className="text-sm font-semibold text-tierra-800">
                          {p.value.toFixed(1)} {p.unit}
                        </p>
                      </div>
                    );
                  }}
                />
                {criticalThreshold != null && (
                  <ReferenceLine
                    y={criticalThreshold}
                    stroke="#dc2626"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    ifOverflow="extend"
                    label={{
                      value: `Crítico: ${criticalThreshold}${unit ? ` ${unit}` : ""}`,
                      position: "right",
                      fill: "#dc2626",
                      fontSize: 10,
                    }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#${gradId})`}
                  isAnimationActive={true}
                  animationDuration={400}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

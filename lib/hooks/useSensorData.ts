"use client";

import { useEffect, useState } from "react";

export interface RealtimeSample {
  timestamp: string;
  value: number;
}

interface UseSensorDataOptions {
  min: number;
  max: number;
  intervalMs?: number;
  /** Valor inicial (si se omite, se toma el punto medio del rango) */
  initialValue?: number;
  /** Número máximo de muestras a mantener en memoria (para gráficos) */
  maxPoints?: number;
}

/**
 * Hook que simula datos de un sensor en tiempo real.
 * Por ejemplo, humedad de suelo entre 20% y 25% variando levemente cada X segundos.
 */
export function useSensorData({
  min,
  max,
  intervalMs = 5000,
  initialValue,
  maxPoints = 50,
}: UseSensorDataOptions): RealtimeSample[] {
  const [samples, setSamples] = useState<RealtimeSample[]>(() => {
    const startValue = initialValue ?? (min + max) / 2;
    return [{ timestamp: new Date().toISOString(), value: startValue }];
  });

  useEffect(() => {
    let cancelled = false;

    const tick = () => {
      setSamples((prev) => {
        const last = prev[prev.length - 1] ?? { value: (min + max) / 2 };
        // Variación suave: random walk pequeño
        const delta = (Math.random() - 0.5) * (max - min) * 0.05; // ±2.5% del rango
        let next = last.value + delta;
        if (next < min) next = min + Math.random() * (max - min) * 0.2;
        if (next > max) next = max - Math.random() * (max - min) * 0.2;
        const sample: RealtimeSample = {
          timestamp: new Date().toISOString(),
          value: next,
        };
        const arr = [...prev, sample];
        if (arr.length > maxPoints) {
          return arr.slice(arr.length - maxPoints);
        }
        return arr;
      });
    };

    const id = setInterval(() => {
      if (!cancelled) tick();
    }, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [min, max, intervalMs, maxPoints]);

  return samples;
}


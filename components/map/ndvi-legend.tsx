"use client";

import { useState } from "react";

const NDVI_LABELS = ["0.0", "0.2", "0.4", "0.6", "0.8", "1.0"];

const GRADIENT =
  "linear-gradient(to right, #8B4513 0%, #8B4513 20%, #d73027 20%, #d73027 40%, #fee08b 40%, #fee08b 60%, #d9ef8b 60%, #d9ef8b 80%, #1a9850 80%, #1a9850 100%)";

export function NDVILegend() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="absolute bottom-4 right-4 z-[1000] w-48 rounded-lg bg-white/80 shadow-md backdrop-blur-md">
      <div className="relative p-3 pr-8">
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded text-tierra-600 hover:bg-tierra-200/60 hover:text-tierra-800"
          aria-label="Cerrar leyenda"
        >
          <span className="text-sm font-bold">×</span>
        </button>
        <p className="mb-2 text-xs font-bold text-tierra-800">
          Índice de Vigor (NDVI)
        </p>
        <div
          className="h-4 w-full rounded"
          style={{ background: GRADIENT }}
        />
        <div className="mt-1 flex w-full justify-between text-[10px] text-tierra-600">
          {NDVI_LABELS.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

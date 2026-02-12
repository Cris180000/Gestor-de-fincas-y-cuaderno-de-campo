"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";

const MapaNDVI = dynamic(() => import("@/components/MapaNDVI").then((m) => m.MapaNDVI), {
  ssr: false,
  loading: () => <div className="card py-12 text-center text-tierra-600">Cargando mapa…</div>,
});

const CENTRO_ESPANA: [number, number] = [40.4, -3.7];

export default function NDVIPage() {
  const [center, setCenter] = useState<[number, number]>(CENTRO_ESPANA);
  const [refCatastral, setRefCatastral] = useState("");
  const [ndviConfigOk, setNdviConfigOk] = useState<boolean | null>(null);
  const [timelineIndex, setTimelineIndex] = useState(0); // 0 = más reciente

  useEffect(() => {
    fetch("/api/ndvi/wms?REQUEST=GetCapabilities")
      .then((r) => setNdviConfigOk(r.ok))
      .catch(() => setNdviConfigOk(false));
  }, []);

  const { timeRange, label } = useMemo(() => {
    const now = new Date();
    const daysPerStep = 30; // aprox. 1 mes
    const end = new Date(now);
    end.setDate(end.getDate() - timelineIndex * daysPerStep);
    const start = new Date(end);
    start.setDate(start.getDate() - daysPerStep);
    const from = start.toISOString().slice(0, 10);
    const to = end.toISOString().slice(0, 10);

    const monthsAgo = timelineIndex;
    const label =
      monthsAgo === 0
        ? "Últimos ~30 días"
        : `Hace ${monthsAgo} mes(es) (aprox. ${from} a ${to})`;

    return { timeRange: { from, to }, label };
  }, [timelineIndex]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-tierra-800">Índice de vegetación (NDVI)</h2>
        <p className="text-tierra-600 text-sm mt-1">
          Mapa de salud del cultivo con Sentinel-2 (ESA). Rojo/naranja: poca vegetación (posible riego o abonado). Verde: vegetación sana.
        </p>
      </div>

      {ndviConfigOk === false && (
        <div className="card bg-amber-50 border-amber-200 text-amber-800 text-sm p-4">
          <p className="font-medium">NDVI no configurado</p>
          <p className="mt-1">
            Para ver el mapa de vegetación, regístrate en{" "}
            <a href="https://dataspace.copernicus.eu" target="_blank" rel="noopener noreferrer" className="underline">
              Copernicus Data Space Ecosystem
            </a>
            , obtén tu Instance ID y añade en el archivo <code className="bg-amber-100 px-1 rounded">.env</code>:{" "}
            <code className="bg-amber-100 px-1 rounded">COPERNICUS_WMS_INSTANCE_ID=tu-instance-id</code>
          </p>
        </div>
      )}

      <MapaNDVI
        center={center}
        zoom={14}
        refCatastral={refCatastral}
        onRefCatastralChange={setRefCatastral}
        onCenterFromRef={(lat, lon) => setCenter([lat, lon])}
        timeRange={timeRange}
      />

      <div className="card space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-tierra-800">Línea de tiempo (últimos 6 meses)</span>
          <span className="text-xs text-tierra-600">{label}</span>
        </div>
        <input
          type="range"
          min={0}
          max={5}
          step={1}
          value={timelineIndex}
          onChange={(e) => setTimelineIndex(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-[11px] text-tierra-500">
          <span>Ahora</span>
          <span>−1 mes</span>
          <span>−2</span>
          <span>−3</span>
          <span>−4</span>
          <span>−5</span>
        </div>
      </div>
    </div>
  );
}

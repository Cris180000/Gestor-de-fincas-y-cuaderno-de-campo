"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { fincasApi, parcelasApi, laboresApi } from "@/lib/offline-api";
import type { FincaItem, ParcelaItem, LaborItem } from "@/lib/offline-api";
import { getStore } from "@/lib/store";
import { SensorWidget } from "@/components/SensorWidget";
import { useSensorData } from "@/lib/hooks/useSensorData";

const MapaNDVI = dynamic(() => import("@/components/MapaNDVI").then((m) => m.MapaNDVI), {
  ssr: false,
  loading: () => <div className="w-full h-40 rounded-lg bg-tierra-100 animate-pulse" />,
});

const DIAS_LABORES_RECIENTES = 7;

type SlotSuitability = "bueno" | "regular" | "malo";

export default function HomePage() {
  const [fincas, setFincas] = useState<FincaItem[]>([]);
  const [parcelas, setParcelas] = useState<ParcelaItem[]>([]);
  const [labores, setLabores] = useState<LaborItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Simulación de sensor de humedad de suelo (20–25 %)
  const humedadData = useSensorData({ min: 20, max: 25, intervalMs: 5000, maxPoints: 36 });

  const avgHumedad = useMemo(() => {
    if (!humedadData || humedadData.length === 0) return null;
    const sum = humedadData.reduce((acc, p) => acc + p.value, 0);
    return sum / humedadData.length;
  }, [humedadData]);

  const [ndviCenter, setNdviCenter] = useState<[number, number] | null>(null);
  const [climaLoading, setClimaLoading] = useState(false);
  const [climaError, setClimaError] = useState<string | null>(null);
  const [climaSlot, setClimaSlot] = useState<{
    suitability: SlotSuitability;
    windKmh: number;
    tempC: number;
    rainProbPercent: number;
    time: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fincasApi.list({ pageSize: 500 }),
      parcelasApi.list({ pageSize: 500 }),
      laboresApi.list({ pageSize: 500 }),
    ])
      .then(([fRes, pRes, lRes]) => {
        if (cancelled) return;
        setFincas(fRes.data);
        setParcelas(pRes.data);
        setLabores(lRes.data);
      })
      .catch(() => {
        if (!cancelled) {
          setFincas([]);
          setParcelas([]);
          setLabores([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Centro NDVI y referencia para clima: primera parcela con coordenadas; si no, centro genérico España
  useEffect(() => {
    if (!parcelas || parcelas.length === 0) return;
    const withCoords = parcelas.find((p) => (p as any).lat != null && (p as any).lon != null);
    if (withCoords) {
      const lat = (withCoords as any).lat as number;
      const lon = (withCoords as any).lon as number;
      setNdviCenter([lat, lon]);
      setClimaLoading(true);
      setClimaError(null);
      const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lon),
        units: "metric",
        lang: "es",
      });
      fetch(`/api/weather/forecast?${params.toString()}`)
        .then(async (res) => {
          const text = await res.text();
          if (!res.ok) {
            let msg = "No se pudo obtener el clima actual.";
            try {
              const data = JSON.parse(text);
              if (data?.error) msg = data.error;
            } catch {
              // ignorar
            }
            throw new Error(msg);
          }
          const data = JSON.parse(text) as {
            slots24h?: {
              time: string;
              windKmh: number;
              tempC: number;
              rainProbPercent: number;
              suitability: SlotSuitability;
            }[];
          };
          const slots = data.slots24h ?? [];
          if (slots.length === 0) {
            setClimaSlot(null);
            return;
          }
          const now = Date.now();
          let best = slots[0];
          let bestDiff = Math.abs(new Date(best.time).getTime() - now);
          for (const s of slots) {
            const diff = Math.abs(new Date(s.time).getTime() - now);
            if (diff < bestDiff) {
              best = s;
              bestDiff = diff;
            }
          }
          setClimaSlot(best);
        })
        .catch((e) => {
          setClimaError(e instanceof Error ? e.message : "No se pudo obtener el clima actual.");
        })
        .finally(() => setClimaLoading(false));
    } else {
      setNdviCenter([40.4, -3.7]);
    }
  }, [parcelas]);

  const store = getStore();
  const incidencias = store?.incidencias ?? [];
  const incidenciasAbiertas = incidencias.filter((i: { resuelta?: boolean }) => !i.resuelta);

  const hoy = new Date().toISOString().slice(0, 10);
  const hace7 = new Date();
  hace7.setDate(hace7.getDate() - DIAS_LABORES_RECIENTES);
  const desde = hace7.toISOString().slice(0, 10);
  const laboresRecientes = labores.filter((l) => {
    const f = typeof l.fecha === "string" ? l.fecha.slice(0, 10) : String(l.fecha).slice(0, 10);
    return f >= desde && f <= hoy;
  });

  if (loading) {
    return (
      <div className="card py-8 text-center text-tierra-600">
        Cargando dashboard…
      </div>
    );
  }

  const esBuenMomento =
    climaSlot && (climaSlot.suitability === "bueno" || climaSlot.suitability === "regular");

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-tierra-800 mb-3">Dashboard</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/fincas" className="card hover:border-verde-400 transition">
            <span className="text-2xl font-display font-semibold text-verde-700">
              {fincas.length}
            </span>
            <span className="text-sm text-tierra-600">Fincas</span>
          </Link>
          <Link href="/fincas" className="card hover:border-verde-400 transition">
            <span className="text-2xl font-display font-semibold text-verde-700">
              {parcelas.length}
            </span>
            <span className="text-sm text-tierra-600">Parcelas</span>
          </Link>
          <Link href="/labores" className="card hover:border-verde-400 transition">
            <span className="text-2xl font-display font-semibold text-verde-700">
              {laboresRecientes.length}
            </span>
            <span className="text-sm text-tierra-600">
              Labores (últimos {DIAS_LABORES_RECIENTES} días)
            </span>
          </Link>
          <Link href="/incidencias" className="card hover:border-verde-400 transition">
            <span className="text-2xl font-display font-semibold text-verde-700">
              {incidenciasAbiertas.length}
            </span>
            <span className="text-sm text-tierra-600">Incidencias abiertas</span>
          </Link>
        </div>
      </section>

      {/* Estado en tiempo real: Agricultura 4.0 */}
      <section>
        <h2 className="text-lg font-semibold text-tierra-800 mb-3">Estado en Tiempo Real</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {/* Promedio de humedad (sensores IoT) */}
          <div className="card space-y-2">
            <p className="text-sm font-medium text-tierra-700">Humedad media del suelo</p>
            {avgHumedad == null ? (
              <div className="h-6 w-24 rounded bg-tierra-100 animate-pulse" />
            ) : (
              <p className="text-2xl font-display font-semibold text-verde-700">
                {avgHumedad.toFixed(1)} <span className="text-sm text-tierra-600">%</span>
              </p>
            )}
            <p className="text-xs text-tierra-500">
              Basado en la última lectura de la sonda de humedad (demo).
            </p>
          </div>

          {/* Es buen momento para tratar (SprayWindow) */}
          <div className="card space-y-2">
            <p className="text-sm font-medium text-tierra-700">Es buen momento para tratar</p>
            {climaLoading ? (
              <div className="h-6 w-32 rounded bg-tierra-100 animate-pulse" />
            ) : climaError ? (
              <p className="text-xs text-red-600">{climaError}</p>
            ) : !climaSlot ? (
              <p className="text-xs text-tierra-600">
                Configura coordenadas (lat/lon) en alguna parcela para obtener recomendación en
                tiempo real.
              </p>
            ) : (
              <>
                <p
                  className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-semibold ${
                    esBuenMomento
                      ? "bg-verde-100 text-verde-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {esBuenMomento ? "Sí" : "No"}
                </p>
                <p className="text-xs text-tierra-600 mt-1">
                  Ahora ({new Date(climaSlot.time).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  ): viento {climaSlot.windKmh} km/h, {climaSlot.tempC} °C, prob. lluvia{" "}
                  {climaSlot.rainProbPercent}%.
                </p>
              </>
            )}
          </div>

          {/* Mini mapa NDVI */}
          <div className="card space-y-2">
            <p className="text-sm font-medium text-tierra-700">Salud del cultivo (NDVI)</p>
            {ndviCenter ? (
              <div className="mt-1 -mx-4 -mb-4 h-40">
                <MapaNDVI center={ndviCenter} zoom={13} />
              </div>
            ) : (
              <div className="mt-1 h-40 rounded-lg bg-tierra-100 animate-pulse" />
            )}
          </div>
        </div>
      </section>

      {laboresRecientes.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-tierra-800 mb-3">Labores recientes</h2>
          <ul className="space-y-2">
            {laboresRecientes.slice(0, 5).map((l) => (
              <li key={l.id}>
                <Link
                  href="/labores"
                  className="card flex justify-between items-center hover:border-verde-400 transition"
                >
                  <span className="font-medium capitalize">{l.tipo}</span>
                  <span className="text-sm text-tierra-500">
                    {typeof l.fecha === "string"
                      ? l.fecha.slice(0, 10)
                      : String(l.fecha).slice(0, 10)}
                  </span>
                </Link>
                <p className="text-sm text-tierra-600 pl-2">{l.descripcion}</p>
              </li>
            ))}
          </ul>
          <Link href="/labores" className="btn-ghost text-sm mt-2">
            Ver todas las labores
          </Link>
        </section>
      )}

      {incidenciasAbiertas.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-tierra-800 mb-3">Incidencias abiertas</h2>
          <ul className="space-y-2">
            {incidenciasAbiertas
              .slice(0, 5)
              .map((i: { id: string; descripcion: string; tipo?: string }) => (
                <li key={i.id}>
                  <Link
                    href="/incidencias"
                    className="card flex justify-between items-center hover:border-amber-300"
                  >
                    <span className="font-medium">{i.descripcion}</span>
                    <span className="text-sm text-tierra-500 capitalize">{i.tipo ?? ""}</span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold text-tierra-800 mb-3">Sensores (demo)</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <SensorWidget
            title="Sonda humedad · Parcela 1"
            subtitle="Humedad suelo · 10 cm"
            type="humedad_suelo"
            unit="%"
            minThreshold={20}
            maxThreshold={40}
            data={humedadData}
          />
          <SensorWidget
            title="Estación climática · Finca A"
            subtitle="Temperatura aire"
            type="estacion_clima"
            unit="°C"
            data={[
              { timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), value: 6.3 },
              { timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), value: 8.9 },
              { timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), value: 11.1 },
            ]}
          />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-tierra-800 mb-3">Acceso rápido</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Link
            href="/fincas/nueva"
            className="card flex items-center gap-3 hover:border-verde-400 transition"
          >
            <span className="text-3xl">🏠</span>
            <div>
              <span className="font-medium block">Nueva finca</span>
              <span className="text-sm text-tierra-600">Registrar una finca</span>
            </div>
          </Link>
          <Link
            href="/labores"
            className="card flex items-center gap-3 hover:border-verde-400 transition"
          >
            <span className="text-3xl">📒</span>
            <div>
              <span className="font-medium block">Cuaderno de campo</span>
              <span className="text-sm text-tierra-600">
                Riego, abonado, tratamiento, poda, cosecha
              </span>
            </div>
          </Link>
          <Link
            href="/incidencias/nueva"
            className="card flex items-center gap-3 hover:border-verde-400 transition"
          >
            <span className="text-3xl">⚠️</span>
            <div>
              <span className="font-medium block">Nueva incidencia</span>
              <span className="text-sm text-tierra-600">Plagas, heladas, etc.</span>
            </div>
          </Link>
          <Link
            href="/ajustes"
            className="card flex items-center gap-3 hover:border-verde-400 transition"
          >
            <span className="text-3xl">⚙️</span>
            <div>
              <span className="font-medium block">Ajustes</span>
              <span className="text-sm text-tierra-600">Exportar, importar</span>
            </div>
          </Link>
          <a
            href="/api/export/cuaderno?format=json"
            className="card flex items-center gap-3 hover:border-verde-400 transition"
          >
            <span className="text-3xl">📤</span>
            <div>
              <span className="font-medium block">Exportar cuaderno (JSON)</span>
              <span className="text-sm text-tierra-600">
                Informe completo listo para subir o archivar
              </span>
            </div>
          </a>
          <a
            href="/api/export/cuaderno?format=xml"
            className="card flex items-center gap-3 hover-border-verde-400 transition"
          >
            <span className="text-3xl">🧾</span>
            <div>
              <span className="font-medium block">Exportar cuaderno (XML)</span>
              <span className="text-sm text-tierra-600">
                Formato estructurado para administración pública
              </span>
            </div>
          </a>
        </div>
      </section>
    </div>
  );
}

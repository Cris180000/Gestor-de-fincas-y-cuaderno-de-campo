"use client";

import Link from "next/link";

export default function SatelliteFeaturesPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <section>
        <h2 className="text-xl font-semibold text-tierra-800">Salud del cultivo (Satélite)</h2>
        <p className="mt-2 text-sm text-tierra-600">
          Este módulo integra imágenes de satélite (Sentinel-2) para monitorizar la salud de los cultivos mediante índices
          de vegetación como NDVI. Está pensado para que veas, de un vistazo, dónde el cultivo está vigoroso y dónde puede
          haber estrés hídrico, carencias nutricionales o problemas de plagas.
        </p>
      </section>

      <section className="card space-y-3">
        <h3 className="font-medium text-tierra-800">Mapa NDVI en tiempo casi real</h3>
        <p className="text-sm text-tierra-600">
          El índice NDVI (Normalized Difference Vegetation Index) se calcula a partir de la reflectancia en el rojo y el
          infrarrojo cercano de Sentinel-2. Valores bajos (rojo/naranja) indican poca o nula vegetación; valores altos
          (verde intenso) indican cubierta vegetal densa y activa.
        </p>
        <ul className="list-disc list-inside text-sm text-tierra-600 space-y-1">
          <li>Resolución espacial: 10 m (Sentinel-2 MSI).</li>
          <li>Periodo compuesto de los últimos ~30 días para reducir nubosidad.</li>
          <li>Reproyección y recorte automáticos a la extensión de tu explotación.</li>
        </ul>
        <div className="flex flex-wrap gap-2 pt-2">
          <Link href="/ndvi" className="btn-primary text-sm">
            Abrir mapa NDVI
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card space-y-2">
          <h3 className="font-medium text-tierra-800">Interpretación agronómica</h3>
          <p className="text-sm text-tierra-600">
            Como referencia rápida, en un mismo cultivo y fecha:
          </p>
          <ul className="list-disc list-inside text-sm text-tierra-600 space-y-1">
            <li>
              Zonas más verdes que el entorno: mayor biomasa foliar, posible exceso de vigor (riesgo de encamado o
              sombreo).
            </li>
            <li>
              Zonas más amarillas/rojas: menor desarrollo; puede deberse a falta de agua, nutrientes, compactación o
              daños por plaga/enfermedad.
            </li>
            <li>
              Cambios bruscos entre fechas consecutivas suelen indicar un evento (helada, golpe de calor, fitotoxicidad).
            </li>
          </ul>
        </div>
        <div className="card space-y-2">
          <h3 className="font-medium text-tierra-800">Buenas prácticas GIS/RS</h3>
          <ul className="list-disc list-inside text-sm text-tierra-600 space-y-1">
            <li>Siempre compara NDVI entre fechas similares dentro de la misma campaña y cultivo.</li>
            <li>Evita interpretar NDVI en presencia de nieve, nubes o sombras fuertes.</li>
            <li>Combina la información satelital con tus observaciones de campo antes de tomar decisiones críticas.</li>
          </ul>
        </div>
      </section>

      <section className="card space-y-3">
        <h3 className="font-medium text-tierra-800">Próximas capacidades (planificadas)</h3>
        <ul className="list-disc list-inside text-sm text-tierra-600 space-y-1">
          <li>Series temporales de NDVI y otros índices (EVI, NDMI) por parcela.</li>
          <li>Alertas automáticas por descensos anómalos de vigor en una parcela o subparcela.</li>
          <li>
            Cruce con labores (abonados, riegos, tratamientos) para evaluar respuesta del cultivo a cada intervención.
          </li>
          <li>Exportación de mapas clasificados a GeoTIFF/GeoJSON para SIG de escritorio.</li>
        </ul>
      </section>
    </div>
  );
}


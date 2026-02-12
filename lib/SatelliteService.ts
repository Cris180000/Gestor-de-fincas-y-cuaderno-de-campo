/**
 * SatelliteService
 *
 * Servicio de alto nivel para trabajar con imágenes de satélite (Sentinel‑2, NDVI, etc.)
 * a partir de un polígono GeoJSON y un rango de fechas.
 *
 * No hace la petición HTTP directamente, sino que construye los parámetros y URLs
 * que luego puede usar el frontend (por ejemplo, contra `/api/ndvi/wms`).
 */

export interface GeoJsonPosition {
  /** [longitud, latitud] en EPSG:4326 */
  0: number;
  1: number;
  2?: number;
}

export interface GeoJsonPolygon {
  type: "Polygon";
  /** Anillos: [ [ [lon,lat], ... ] (anillo exterior), [ ... ] (agujeros opcionales) ] */
  coordinates: GeoJsonPosition[][];
}

export interface GeoJsonMultiPolygon {
  type: "MultiPolygon";
  coordinates: GeoJsonPosition[][][];
}

export type GeoJsonGeometry = GeoJsonPolygon | GeoJsonMultiPolygon;

export interface DateRange {
  /** ISO YYYY-MM-DD */
  from: string;
  /** ISO YYYY-MM-DD */
  to: string;
}

export interface SatelliteRequest {
  geometry: GeoJsonGeometry;
  dateRange: DateRange;
}

export interface Bbox4326 {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

export interface NdviWmsRequestOptions {
  /** CRS del mapa cliente. Por defecto EPSG:4326 (BBOX en lon/lat). */
  crs?: "EPSG:4326" | "EPSG:3857";
  /** Resolución de imagen objetivo. Por defecto 512 px. */
  width?: number;
  height?: number;
}

export class SatelliteService {
  /**
   * Calcula la caja envolvente (bounding box) mínima en EPSG:4326
   * para un polígono o multipolígono GeoJSON.
   */
  static getBoundingBox4326(geometry: GeoJsonGeometry): Bbox4326 {
    let minLon = Number.POSITIVE_INFINITY;
    let minLat = Number.POSITIVE_INFINITY;
    let maxLon = Number.NEGATIVE_INFINITY;
    let maxLat = Number.NEGATIVE_INFINITY;

    const pushPos = (pos: GeoJsonPosition) => {
      const [lon, lat] = pos;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    };

    if (geometry.type === "Polygon") {
      for (const ring of geometry.coordinates) {
        for (const pos of ring) pushPos(pos);
      }
    } else if (geometry.type === "MultiPolygon") {
      for (const poly of geometry.coordinates) {
        for (const ring of poly) {
          for (const pos of ring) pushPos(pos);
        }
      }
    } else {
      throw new Error(`Tipo de geometría no soportado: ${(geometry as any).type}`);
    }

    if (
      !Number.isFinite(minLon) ||
      !Number.isFinite(minLat) ||
      !Number.isFinite(maxLon) ||
      !Number.isFinite(maxLat)
    ) {
      throw new Error("Geometría vacía o no válida para calcular BBOX.");
    }

    return { minLon, minLat, maxLon, maxLat };
  }

  /**
   * Construye los parámetros WMS (para `/api/ndvi/wms` o para el WMS remoto)
   * que devuelven un mapa NDVI cubriendo el polígono y el rango de fechas.
   *
   * Por defecto:
   *  - LAYERS=NDVI
   *  - CRS=EPSG:4326
   *  - WIDTH=HEIGHT=512
   */
  static buildNdviWmsParams(
    request: SatelliteRequest,
    options: NdviWmsRequestOptions = {}
  ): URLSearchParams {
    const { geometry, dateRange } = request;
    const { crs = "EPSG:4326", width = 512, height = 512 } = options;

    const bbox = SatelliteService.getBoundingBox4326(geometry);

    const params = new URLSearchParams();
    params.set("SERVICE", "WMS");
    params.set("REQUEST", "GetMap");
    params.set("VERSION", "1.3.0");
    params.set("LAYERS", "NDVI");
    params.set("FORMAT", "image/png");
    params.set("WIDTH", String(width));
    params.set("HEIGHT", String(height));

    if (crs === "EPSG:4326") {
      params.set("CRS", "EPSG:4326");
      // Orden lat,lon en WMS 1.3.0 con CRS=EPSG:4326
      params.set("BBOX", `${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon}`);
    } else {
      // Para EPSG:3857 usamos CRS y BBOX en lon/lat (el reproyecto lo hace el servidor WMS)
      params.set("CRS", "EPSG:4326");
      params.set("BBOX", `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`);
    }

    // Rango temporal: from/to (YYYY-MM-DD/YYYY-MM-DD)
    const from = dateRange.from;
    const to = dateRange.to;
    params.set("TIME", `${from}/${to}`);

    return params;
  }

  /**
   * Devuelve una URL lista para usar contra el proxy interno `/api/ndvi/wms`
   * a partir de un polígono GeoJSON y un rango de fechas.
   *
   * Ejemplo de uso (en el cliente):
   *   const url = SatelliteService.getNdviProxyUrl(req);
   *   <ImageOverlay url={url} bounds={...} />
   */
  static getNdviProxyUrl(
    request: SatelliteRequest,
    options: NdviWmsRequestOptions = {}
  ): string {
    const params = SatelliteService.buildNdviWmsParams(request, options);
    return `/api/ndvi/wms?${params.toString()}`;
  }

  /**
   * Simulación de una llamada a un servicio de satélite que devuelve
   * una imagen NDVI y una leyenda básica de colores.
   *
   * Por ahora NO contacta con ningún proveedor real; simplemente
   * construye una URL ficticia (útil para prototipos y tests de UI).
   */
  static async fetchNDVIImage(
    request: SatelliteRequest,
    options: NdviWmsRequestOptions = {}
  ): Promise<{
    imageUrl: string;
    legend: {
      title: string;
      items: Array<{ color: string; label: string; range?: [number, number] }>;
    };
  }> {
    // Simulamos una latencia de red ligera
    await new Promise((resolve) => setTimeout(resolve, 300));

    const url = SatelliteService.getNdviProxyUrl(request, options);

    return {
      imageUrl: url || "/images/fake-ndvi.png",
      legend: {
        title: "NDVI (salud del cultivo)",
        items: [
          { color: "#8b0000", label: "Rojo = Vegetación muy escasa / suelo desnudo", range: [-1.0, 0.1] },
          { color: "#ffa500", label: "Naranja = Vegetación pobre o en estrés", range: [0.1, 0.3] },
          { color: "#ffff00", label: "Amarillo = Vegetación moderada", range: [0.3, 0.5] },
          { color: "#32cd32", label: "Verde = Vegetación sana y vigorosa", range: [0.5, 0.8] },
          { color: "#006400", label: "Verde oscuro = Cobertura muy densa", range: [0.8, 1.0] },
        ],
      },
    };
  }
}


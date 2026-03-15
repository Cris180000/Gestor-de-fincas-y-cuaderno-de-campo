/**
 * Integración con el Catastro español (ovc.catastro.meh.es).
 * Consulta de datos no protegidos por referencia catastral.
 */

import { XMLParser } from "fast-xml-parser";

const BASE = "https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejero.asmx";

export interface DatosCatastrales {
  referenciaCatastral: string;
  tipo: "urbano" | "rustico" | string;
  superficie?: number; // m² en Catastro; se puede convertir a ha
  localizacion?: string;
  poligono?: string;
  parcela?: string;
  paraje?: string;
  municipio?: string;
  provincia?: string;
  raw?: Record<string, unknown>;
}

/**
 * Normaliza la referencia catastral: quita espacios y convierte a mayúsculas.
 * RC puede ser 14 (rústica finca), 18 o 20 caracteres.
 */
export function normalizarRC(rc: string): string {
  return rc.replace(/\s/g, "").toUpperCase().trim();
}

/**
 * Consulta datos no protegidos en el Catastro por referencia catastral.
 * Llamar desde el servidor (evita CORS). El servicio devuelve XML.
 */
export async function consultarPorReferencia(
  rc: string,
  provincia?: string,
  municipio?: string
): Promise<{ ok: true; datos: DatosCatastrales[] } | { ok: false; error: string }> {
  const ref = normalizarRC(rc);
  if (ref.length < 14) {
    return { ok: false, error: "La referencia catastral debe tener al menos 14 caracteres." };
  }

  const params = new URLSearchParams();
  params.set("RC", ref);
  if (provincia) params.set("Provincia", provincia);
  if (municipio) params.set("Municipio", municipio);

  const url = `${BASE}/Consulta_DNPRC?${params.toString()}`;
  let text: string;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": "GestorFincas/1.0 (consulta catastral)" },
      signal: AbortSignal.timeout(20000),
    });
    text = await res.text();
    if (!res.ok) {
      return { ok: false, error: `Catastro no disponible (${res.status}). Inténtelo más tarde.` };
    }
    if (text.includes("Missing parameter") || text.includes("Missing Parameter")) {
      return { ok: false, error: "El Catastro requiere Provincia y Municipio. Indícalos en los campos opcionales (ej. GR y nombre del municipio)." };
    }
    if (/NO EXISTE|no existe|cuerr/i.test(text)) {
      return { ok: false, error: "Provincia o municipio no válidos. Use el código de provincia (ej. GR) y el nombre del municipio." };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error de conexión con el Catastro";
    return { ok: false, error: msg };
  }

  const datos = parseRespuestaConsultaDNPRC(text, ref);
  if (datos.length === 0) {
    return { ok: false, error: "No se encontraron datos para esa referencia. Pruebe añadiendo Provincia y Municipio (ej. GR y su municipio)." };
  }
  return { ok: true, datos };
}

/**
 * Parsea la respuesta XML de Consulta_DNPRC y extrae datos útiles.
 * La estructura puede variar (urbano vs rústico, múltiples bi).
 */
function parseRespuestaConsultaDNPRC(xml: string, rcBusqueda: string): DatosCatastrales[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseTagValue: true,
    trimValues: true,
  });
  let obj: Record<string, unknown>;
  try {
    obj = parser.parse(xml) as Record<string, unknown>;
  } catch {
    return [];
  }

  const out: DatosCatastrales[] = [];
  const result = findInObject(obj, "Consulta_DNPRCResult") ?? findInObject(obj, "consulta_dnpresult") ?? obj;
  if (!result || typeof result !== "object") return [];

  const body = result as Record<string, unknown>;
  const bf = body.bico ?? body.BICO ?? body;
  if (!bf || typeof bf !== "object") return out;

  const biArr = (bf as Record<string, unknown>).bi;
  const biList = Array.isArray(biArr) ? biArr : biArr ? [biArr] : [];
  const idbi = (bf as Record<string, unknown>).idbi;
  const idbiList = Array.isArray(idbi) ? idbi : idbi ? [idbi] : [];

  for (let i = 0; i < Math.max(biList.length, idbiList.length); i++) {
    const bi = biList[i] as Record<string, unknown> | undefined;
    const idbiEl = idbiList[i] as Record<string, unknown> | undefined;
    const rc = idbiEl ? refCatastralFromIdbi(idbiEl) : rcBusqueda;
    const ldt = bi ? (bi.ldt as string) ?? "" : "";
    const debi = bi?.debi as Record<string, unknown> | undefined;
    const sfc = debi?.sfc != null ? Number(debi.sfc) : undefined;
    const lorus = bi?.lorus as Record<string, unknown> | undefined;
    const lourb = bi?.lourb as Record<string, unknown> | undefined;
    const tipo = (idbiEl?.dt as string) ?? (bi ? "rustico" : "urbano");
    let localizacion = ldt || "";
    let poligono: string | undefined;
    let parcela: string | undefined;
    let paraje: string | undefined;
    if (lorus) {
      poligono = lorus.cpo as string | undefined;
      parcela = lorus.cpa as string | undefined;
      paraje = lorus.npa as string | undefined;
      if (poligono || parcela) localizacion = [poligono, parcela, paraje].filter(Boolean).join(" · ");
    }
    if (lourb && !localizacion) {
      localizacion = [lourb.cp, lourb.cm, lourb.cv].filter(Boolean).join(" ");
    }
    out.push({
      referenciaCatastral: rc,
      tipo: (tipo || "").toLowerCase(),
      superficie: sfc,
      localizacion: localizacion || undefined,
      poligono,
      parcela,
      paraje,
      raw: bi as Record<string, unknown>,
    });
  }

  if (out.length === 0 && rcBusqueda) {
    out.push({
      referenciaCatastral: rcBusqueda,
      tipo: "rustico",
      superficie: undefined,
      localizacion: undefined,
    });
  }
  return out;
}

function findInObject(o: unknown, key: string): unknown {
  if (!o || typeof o !== "object") return undefined;
  const rec = o as Record<string, unknown>;
  const lower = key.toLowerCase();
  for (const k of Object.keys(rec)) {
    if (k.toLowerCase() === lower) return rec[k];
  }
  for (const v of Object.values(rec)) {
    const found = findInObject(v, key);
    if (found !== undefined) return found;
  }
  return undefined;
}

function refCatastralFromIdbi(idbi: Record<string, unknown>): string {
  const pc1 = idbi.pc1 ?? idbi.PC1 ?? "";
  const pc2 = idbi.pc2 ?? idbi.PC2 ?? "";
  const car = idbi.car ?? idbi.CAR ?? "";
  const cc1 = idbi.cc1 ?? idbi.CC1 ?? "";
  const cc2 = idbi.cc2 ?? idbi.CC2 ?? "";
  return [pc1, pc2, car, cc1, cc2].filter(Boolean).join("");
}

const BASE_COORDENADAS = "https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx";

/**
 * Obtiene coordenadas del centroide de una parcela por referencia catastral.
 * Acepta 14, 18 o 20 caracteres; el servicio del Catastro usa los 14 primeros.
 * Si el Catastro lo exige, indique provincia (ej. GR) y municipio (nombre).
 * SRS EPSG:4326 = WGS84 (lat, lon).
 */
export async function consultarCoordenadas(
  rc: string,
  srs: string = "EPSG:4326",
  provincia?: string,
  municipio?: string
): Promise<{ ok: true; lat: number; lon: number; direccion?: string } | { ok: false; error: string }> {
  const ref = normalizarRC(rc).slice(0, 14);
  if (ref.length < 14) {
    return { ok: false, error: "La referencia catastral debe tener al menos 14 caracteres (14, 18 o 20)." };
  }

  const params = new URLSearchParams();
  params.set("RC", ref);
  params.set("SRS", srs);
  if (provincia?.trim()) params.set("Provincia", provincia.trim());
  if (municipio?.trim()) params.set("Municipio", municipio.trim());

  const url = `${BASE_COORDENADAS}/Consulta_CPMRC?${params.toString()}`;
  let text: string;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": "GestorFincas/1.0 (consulta catastral)" },
      signal: AbortSignal.timeout(20000),
    });
    text = await res.text();
    if (!res.ok) return { ok: false, error: "Catastro no disponible." };
    if (text.includes("Missing parameter") || text.includes("Missing Parameter")) {
      return { ok: false, error: "El Catastro requiere Provincia y Municipio. Indícalos en los campos opcionales (ej. GR y nombre del municipio)." };
    }
    if (/NO EXISTE|no existe|cuerr/i.test(text)) {
      return { ok: false, error: "Provincia o municipio no válidos. Use el código de provincia (ej. GR) y el nombre del municipio." };
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error de conexión" };
  }

  const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });
  let obj: Record<string, unknown>;
  try {
    obj = parser.parse(text) as Record<string, unknown>;
  } catch {
    return { ok: false, error: "No se pudieron leer las coordenadas." };
  }

  const result = findInObject(obj, "Consulta_CPMRCResult") ?? findInObject(obj, "consulta_cpmrcresult");
  if (!result || typeof result !== "object") return { ok: false, error: "No se encontraron coordenadas para esa referencia." };

  const coords = (result as Record<string, unknown>).coordenadas ?? (result as Record<string, unknown>).coord;
  const list = coords && typeof coords === "object" ? ((coords as Record<string, unknown>).coord ?? coords) : null;
  const coord = Array.isArray(list) ? list[0] : list;
  if (!coord || typeof coord !== "object") return { ok: false, error: "No se encontraron coordenadas para esa referencia." };

  const rec = coord as Record<string, unknown>;
  const x = Number(rec.x ?? rec.X ?? rec.geo ?? (rec as Record<string, unknown>).Geo);
  const y = Number(rec.y ?? rec.Y ?? rec.ldt);
  if (Number.isNaN(x) || Number.isNaN(y)) {
    const geo = rec.geo ?? (rec as Record<string, unknown>).Geo;
    if (geo && typeof geo === "object") {
      const g = geo as Record<string, unknown>;
      const lat = Number(g.lat ?? g.Lat ?? g.y ?? g.Y);
      const lon = Number(g.lon ?? g.Lon ?? g.x ?? g.X);
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
        return { ok: true, lat, lon, direccion: rec.ldt as string | undefined };
      }
    }
    return { ok: false, error: "Coordenadas no válidas en la respuesta." };
  }

  // EPSG:4326 en Catastro: X = longitud, Y = latitud
  const lat = y;
  const lon = x;
  return { ok: true, lat, lon, direccion: rec.ldt as string | undefined };
}

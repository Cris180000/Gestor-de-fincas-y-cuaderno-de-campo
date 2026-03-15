/**
 * Servicio de predicción para ventana de pulverización fitosanitaria.
 * Consume OpenWeatherMap One Call 3.0 (48 h horarias) o simula datos sin API key.
 * Motor de reglas agronómicas: OPTIMAL (verde), WARNING (amarillo), FORBIDDEN (rojo).
 */

export type SpraySuitability = "OPTIMAL" | "WARNING" | "FORBIDDEN";

export interface SprayWindowSlot {
  hour: string;
  temp: number;
  wind_speed: number;
  rain_prob: number;
  rain_mm?: number;
  suitability: SpraySuitability;
  reason: string;
  delta_t?: number;
}

const WIND_FORBIDDEN_KMH = 15;
const RAIN_PROB_FORBIDDEN = 30;
const RAIN_MM_FORBIDDEN = 1;
const TEMP_HIGH_WARNING = 28;
const TEMP_LOW_WARNING = 5;
const DELTA_T_LOW = 2;
const DELTA_T_HIGH = 8;

function windMsToKmh(ms: number): number {
  return Math.round((ms * 3.6) * 10) / 10;
}

/**
 * Calcula Delta T = temp - dew_point (diferencia temperatura–punto de rocío).
 * Con humedad y temp se puede aproximar: dew_point ≈ temp - (100 - humidity) / 5.
 * One Call 3.0 hourly puede incluir humidity y/o dew_point.
 */
function estimateDewPoint(tempC: number, humidityPercent: number): number {
  const a = 17.27;
  const b = 237.7;
  const alpha = (a * tempC) / (b + tempC) + Math.log(humidityPercent / 100);
  return (b * alpha) / (a - alpha);
}

function computeSuitability(
  temp: number,
  windKmh: number,
  rainProb: number,
  rainMm: number,
  deltaT?: number
): { suitability: SpraySuitability; reason: string } {
  const reasons: string[] = [];

  if (windKmh > WIND_FORBIDDEN_KMH) {
    return { suitability: "FORBIDDEN", reason: "Viento excesivo (deriva)" };
  }
  if (rainProb > RAIN_PROB_FORBIDDEN) {
    return { suitability: "FORBIDDEN", reason: "Probabilidad de lluvia alta (lavado del producto)" };
  }
  if (rainMm > RAIN_MM_FORBIDDEN) {
    return { suitability: "FORBIDDEN", reason: "Lluvia prevista > 1 mm (lavado del producto)" };
  }

  if (temp > TEMP_HIGH_WARNING) reasons.push("Temperatura alta (evaporación)");
  if (temp < TEMP_LOW_WARNING) reasons.push("Temperatura baja");
  if (deltaT != null && (deltaT < DELTA_T_LOW || deltaT > DELTA_T_HIGH)) {
    reasons.push(`Delta T fuera de rango ideal (2–8 °C): ${deltaT.toFixed(1)} °C`);
  }

  if (reasons.length > 0) {
    return { suitability: "WARNING", reason: reasons.join(". ") };
  }
  return { suitability: "OPTIMAL", reason: "Condiciones adecuadas" };
}

/** Genera 48 horas de datos simulados para pruebas sin API key */
function buildMockSlots(lat: number, lon: number): SprayWindowSlot[] {
  const slots: SprayWindowSlot[] = [];
  const now = new Date();
  for (let i = 0; i < 48; i++) {
    const t = new Date(now.getTime() + i * 60 * 60 * 1000);
    const hourOfDay = t.getUTCHours();
    const temp = 10 + 12 * Math.sin((Math.PI * (hourOfDay - 6)) / 12) + (Math.random() - 0.5) * 4;
    const wind_speed = 5 + Math.random() * 12;
    const rain_prob = hourOfDay >= 14 && hourOfDay <= 20 ? 20 + Math.random() * 25 : Math.random() * 15;
    const rain_mm = rain_prob > 25 ? (Math.random() * 2) : 0;
    const humidity = 50 + Math.random() * 40;
    const dewPoint = estimateDewPoint(temp, humidity);
    const delta_t = Math.round((temp - dewPoint) * 10) / 10;
    const { suitability, reason } = computeSuitability(temp, wind_speed, rain_prob, rain_mm, delta_t);
    slots.push({
      hour: t.toISOString(),
      temp: Math.round(temp * 10) / 10,
      wind_speed: Math.round(wind_speed * 10) / 10,
      rain_prob: Math.round(rain_prob),
      rain_mm: Math.round(rain_mm * 10) / 10,
      suitability,
      reason,
      delta_t,
    });
  }
  return slots;
}

/** Tipo para un elemento hourly de la respuesta One Call 3.0 */
interface OWMHourlyItem {
  dt: number;
  temp?: number;
  humidity?: number;
  wind_speed?: number;
  pop?: number;
  rain?: { "1h"?: number };
  snow?: { "1h"?: number };
  dew_point?: number;
}

/**
 * Obtiene la ventana de pulverización para las próximas 48 horas en (lat, lon).
 * Si no hay OPENWEATHER_API_KEY, devuelve datos simulados.
 */
export async function getSprayWindow(lat: number, lon: number): Promise<SprayWindowSlot[]> {
  const apiKey = process.env.OPENWEATHER_API_KEY?.trim();

  if (!apiKey) {
    return buildMockSlots(lat, lon);
  }

  const url = new URL("https://api.openweathermap.org/data/3.0/onecall");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("units", "metric");
  url.searchParams.set("lang", "es");
  url.searchParams.set("appid", apiKey);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `OpenWeatherMap: ${res.status}`);
  }

  const data = await res.json();
  const hourly: OWMHourlyItem[] = data.hourly ?? [];
  const slots: SprayWindowSlot[] = [];

  for (const h of hourly.slice(0, 48)) {
    const temp = h.temp ?? 15;
    const windMs = h.wind_speed ?? 0;
    const windKmh = windMsToKmh(windMs);
    const rainProb = typeof h.pop === "number" ? h.pop * 100 : 0;
    const rain1h = h.rain?.["1h"] ?? 0;
    const snow1h = h.snow?.["1h"] ?? 0;
    const rainMm = rain1h + snow1h;

    let deltaT: number | undefined;
    if (typeof h.dew_point === "number") {
      deltaT = Math.round((temp - h.dew_point) * 10) / 10;
    } else if (typeof h.humidity === "number") {
      const dp = estimateDewPoint(temp, h.humidity);
      deltaT = Math.round((temp - dp) * 10) / 10;
    }

    const { suitability, reason } = computeSuitability(temp, windKmh, rainProb, rainMm, deltaT);

    slots.push({
      hour: new Date(h.dt * 1000).toISOString(),
      temp: Math.round(temp * 10) / 10,
      wind_speed: windKmh,
      rain_prob: Math.round(rainProb),
      rain_mm: rainMm > 0 ? Math.round(rainMm * 10) / 10 : undefined,
      suitability,
      reason,
      delta_t: deltaT,
    });
  }

  return slots;
}

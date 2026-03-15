/**
 * Lógica de seed para dispositivos y telemetría de sensores.
 * Usado por scripts/seed-sensors.ts y por la Server Action.
 */
import { prisma } from "./prisma";

const BATCH_SIZE = 100;
const HOURS_PER_DAY = 24;
const TOTAL_DAYS = 7;
const TOTAL_HOURS = TOTAL_DAYS * HOURS_PER_DAY; // 168

/** Humedad suelo: baja de 80% a 20% en 6 días, luego "riego" = 90% el último día */
function soilMoistureAtHour(hourIndex: number): number {
  const irrigationStartHour = (TOTAL_DAYS - 1) * HOURS_PER_DAY; // inicio del "ayer"
  if (hourIndex >= irrigationStartHour) {
    return 88 + Math.random() * 4; // 88-92% simulando riego
  }
  const progress = hourIndex / irrigationStartHour;
  return 80 - progress * (80 - 20) + (Math.random() - 0.5) * 2;
}

/** Temperatura sinusoidal: frío de noche, calor de día (aprox. 8–28 °C) */
function temperatureAtHour(ts: Date): number {
  const hourOfDay = ts.getUTCHours() + ts.getUTCMinutes() / 60;
  const sin = Math.sin((2 * Math.PI * hourOfDay) / 24);
  return 18 + 10 * sin + (Math.random() - 0.5);
}

/** Humedad aire: complementaria suave (aprox. 45–75 %) */
function humidityAtHour(ts: Date): number {
  const hourOfDay = ts.getUTCHours() + ts.getUTCMinutes() / 60;
  const sin = Math.sin((2 * Math.PI * (hourOfDay - 6)) / 24);
  return 60 + 15 * sin + (Math.random() - 0.5) * 2;
}

/** Presión: 1010–1025 hPa con ligera variación */
function pressureAtHour(ts: Date): number {
  const dayProgress = (ts.getTime() / (1000 * 60 * 60 * 24)) % 7;
  return 1015 + 5 * Math.sin((2 * Math.PI * dayProgress) / 7) + (Math.random() - 0.5) * 2;
}

export interface SeedSensorsResult {
  devicesCreated: number;
  telemetryCreated: number;
  userId?: string;
  deviceIds?: { soil: string; weather: string };
  error?: string;
}

/**
 * Crea 2 dispositivos (Sonda de Suelo, Estación Meteo) para el primer usuario
 * y genera telemetría de los últimos 7 días (una muestra por hora) en lotes.
 */
export async function runSeedSensors(): Promise<SeedSensorsResult> {
  const result: SeedSensorsResult = { devicesCreated: 0, telemetryCreated: 0 };

  try {
    const user = await prisma.user.findFirst({ orderBy: { id: "asc" } });
    if (!user) {
      result.error = "No hay ningún usuario en la base de datos. Crea uno antes de ejecutar el seed.";
      return result;
    }
    result.userId = user.id;

    const parcel = await prisma.parcela.findFirst({
      where: { finca: { userId: user.id } },
      orderBy: { id: "asc" },
    });
    // Device en este proyecto no tiene parcelId en el schema; se deja para futura extensión.

    const now = new Date();
    const startTime = new Date(now);
    startTime.setDate(startTime.getDate() - TOTAL_DAYS);
    startTime.setUTCHours(0, 0, 0, 0);

    const existingSoil = await prisma.device.findFirst({
      where: { userId: user.id, nombre: "Sonda de Suelo" },
    });
    const existingWeather = await prisma.device.findFirst({
      where: { userId: user.id, nombre: "Estación Meteo" },
    });

    let deviceSoilId: string;
    let deviceWeatherId: string;

    if (existingSoil && existingWeather) {
      deviceSoilId = existingSoil.id;
      deviceWeatherId = existingWeather.id;
      await prisma.telemetry.deleteMany({
        where: {
          deviceId: { in: [deviceSoilId, deviceWeatherId] },
          timestamp: { gte: startTime },
        },
      });
    } else {
      const soil = await prisma.device.create({
        data: {
          userId: user.id,
          nombre: "Sonda de Suelo",
          tipo: "humedad_suelo",
          descripcion: "Sonda de humedad para la parcela principal",
        },
      });
      const weather = await prisma.device.create({
        data: {
          userId: user.id,
          nombre: "Estación Meteo",
          tipo: "estacion_clima",
          descripcion: "Estación meteorológica parcela principal",
        },
      });
      deviceSoilId = soil.id;
      deviceWeatherId = weather.id;
      result.devicesCreated = 2;
    }
    result.deviceIds = { soil: deviceSoilId, weather: deviceWeatherId };

    const telemetryRows: { deviceId: string; timestamp: Date; valor: number; unidad: string }[] = [];

    for (let h = 0; h < TOTAL_HOURS; h++) {
      const ts = new Date(startTime.getTime() + h * 60 * 60 * 1000);

      telemetryRows.push({
        deviceId: deviceSoilId,
        timestamp: ts,
        valor: Math.round(soilMoistureAtHour(h) * 10) / 10,
        unidad: "%",
      });
      telemetryRows.push({
        deviceId: deviceWeatherId,
        timestamp: ts,
        valor: Math.round(temperatureAtHour(ts) * 10) / 10,
        unidad: "°C",
      });
      telemetryRows.push({
        deviceId: deviceWeatherId,
        timestamp: ts,
        valor: Math.round(humidityAtHour(ts) * 10) / 10,
        unidad: "%",
      });
      telemetryRows.push({
        deviceId: deviceWeatherId,
        timestamp: ts,
        valor: Math.round(pressureAtHour(ts) * 10) / 10,
        unidad: "hPa",
      });
    }

    for (let i = 0; i < telemetryRows.length; i += BATCH_SIZE) {
      const batch = telemetryRows.slice(i, i + BATCH_SIZE);
      await prisma.telemetry.createMany({ data: batch });
    }
    result.telemetryCreated = telemetryRows.length;
  } catch (e) {
    result.error = e instanceof Error ? e.message : String(e);
  }

  return result;
}

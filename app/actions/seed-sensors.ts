"use server";

import { runSeedSensors } from "@/lib/seed-sensors";

/**
 * Server Action para poblar la base de datos con dispositivos y telemetría
 * de prueba (2 dispositivos, 7 días de datos por hora). Invocable desde un
 * botón oculto o en desarrollo.
 */
export async function seedSensorsAction(): Promise<{
  ok: boolean;
  message: string;
  devicesCreated?: number;
  telemetryCreated?: number;
}> {
  try {
    const result = await runSeedSensors();
    if (result.error) {
      return { ok: false, message: result.error };
    }
    return {
      ok: true,
      message: `Seed completado: ${result.devicesCreated ?? 0} dispositivo(s), ${result.telemetryCreated ?? 0} registros de telemetría.`,
      devicesCreated: result.devicesCreated,
      telemetryCreated: result.telemetryCreated,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, message };
  }
}

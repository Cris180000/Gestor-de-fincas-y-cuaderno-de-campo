/**
 * Seed de sensores y telemetría para pruebas de gráficas.
 * Uso: npx tsx scripts/seed-sensors.ts
 * Requiere: DATABASE_URL en .env y al menos un usuario en la base de datos.
 */
import { runSeedSensors } from "../lib/seed-sensors";

runSeedSensors()
  .then((result) => {
    if (result.error) {
      console.error("Error:", result.error);
      process.exit(1);
    }
    console.log("Seed completado:");
    console.log("  Dispositivos creados:", result.devicesCreated);
    console.log("  Registros de telemetría:", result.telemetryCreated);
    if (result.userId) console.log("  Usuario:", result.userId);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Fallo al ejecutar seed:", err);
    process.exit(1);
  });

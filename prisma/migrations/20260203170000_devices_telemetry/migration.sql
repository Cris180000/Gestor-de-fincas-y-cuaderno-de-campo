-- CreateTable: Device
CREATE TABLE "Device" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "descripcion" TEXT,
  "ubicacion" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Device_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: Telemetry
CREATE TABLE "Telemetry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "device_id" TEXT NOT NULL,
  "timestamp" DATETIME NOT NULL,
  "valor" REAL NOT NULL,
  "unidad" TEXT NOT NULL,
  CONSTRAINT "Telemetry_device_id_fkey"
    FOREIGN KEY ("device_id") REFERENCES "Device" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- Index para consultas rápidas por dispositivo y tiempo
CREATE INDEX "idx_telemetry_device_ts"
  ON "Telemetry" ("device_id", "timestamp");


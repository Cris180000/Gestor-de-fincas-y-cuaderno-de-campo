/*
  Warnings:

  - You are about to alter the column `weather_warning_ignored` on the `Labor` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Boolean`.

*/
-- DropIndex
DROP INDEX "Finca_user_id_idx";

-- DropIndex
DROP INDEX "Incidencia_parcela_id_idx";

-- DropIndex
DROP INDEX "Parcela_finca_id_idx";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Labor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parcela_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "descripcion" TEXT NOT NULL,
    "producto" TEXT,
    "cantidad" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "realizada_at" DATETIME,
    "lat" REAL,
    "lon" REAL,
    "n_kg_ha" REAL,
    "p_kg_ha" REAL,
    "k_kg_ha" REAL,
    "weather_warning_ignored" BOOLEAN DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Labor_parcela_id_fkey" FOREIGN KEY ("parcela_id") REFERENCES "Parcela" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Labor" ("cantidad", "createdAt", "descripcion", "estado", "fecha", "id", "k_kg_ha", "lat", "lon", "n_kg_ha", "p_kg_ha", "parcela_id", "producto", "realizada_at", "tipo", "weather_warning_ignored") SELECT "cantidad", "createdAt", "descripcion", "estado", "fecha", "id", "k_kg_ha", "lat", "lon", "n_kg_ha", "p_kg_ha", "parcela_id", "producto", "realizada_at", "tipo", "weather_warning_ignored" FROM "Labor";
DROP TABLE "Labor";
ALTER TABLE "new_Labor" RENAME TO "Labor";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateTable
CREATE TABLE "Diagnostico" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "parcela_id" TEXT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sintomas" TEXT NOT NULL,
    "resumen" TEXT NOT NULL,
    "enfermedadPrincipal" TEXT,
    "confianza" INTEGER,
    "tratamientoQuimico" TEXT,
    "tratamientoEcologico" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Diagnostico_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Diagnostico_parcela_id_fkey" FOREIGN KEY ("parcela_id") REFERENCES "Parcela" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);


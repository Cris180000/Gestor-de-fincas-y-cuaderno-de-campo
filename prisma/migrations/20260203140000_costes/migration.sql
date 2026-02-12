-- CreateTable
CREATE TABLE "Coste" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "finca_id" TEXT,
    "parcela_id" TEXT,
    "fecha" DATETIME NOT NULL,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "importe_centimos" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Coste_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Coste_finca_id_fkey" FOREIGN KEY ("finca_id") REFERENCES "Finca" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Coste_parcela_id_fkey" FOREIGN KEY ("parcela_id") REFERENCES "Parcela" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

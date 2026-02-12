-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Finca" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ubicacion" TEXT,
    "superficie" REAL,
    "notas" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Finca_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Parcela" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "finca_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cultivo" TEXT,
    "superficie" REAL,
    "notas" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Parcela_finca_id_fkey" FOREIGN KEY ("finca_id") REFERENCES "Finca" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Labor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parcela_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "descripcion" TEXT NOT NULL,
    "producto" TEXT,
    "cantidad" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Labor_parcela_id_fkey" FOREIGN KEY ("parcela_id") REFERENCES "Parcela" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Incidencia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parcela_id" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "descripcion" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'abierta',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Incidencia_parcela_id_fkey" FOREIGN KEY ("parcela_id") REFERENCES "Parcela" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Finca_user_id_idx" ON "Finca"("user_id");

-- CreateIndex
CREATE INDEX "Parcela_finca_id_idx" ON "Parcela"("finca_id");

-- CreateIndex
CREATE INDEX "Labor_parcela_id_idx" ON "Labor"("parcela_id");

-- CreateIndex
CREATE INDEX "Incidencia_parcela_id_idx" ON "Incidencia"("parcela_id");

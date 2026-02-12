-- AlterTable: add NVZ flags to Parcela
ALTER TABLE "Parcela" ADD COLUMN "zv_nitratos" BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE "Parcela" ADD COLUMN "limite_n_anual_kg_ha" REAL;

-- AlterTable: add NPK per ha to Labor
ALTER TABLE "Labor" ADD COLUMN "n_kg_ha" REAL;
ALTER TABLE "Labor" ADD COLUMN "p_kg_ha" REAL;
ALTER TABLE "Labor" ADD COLUMN "k_kg_ha" REAL;


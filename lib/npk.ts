import fs from "fs";
import path from "path";

const REGISTRO_PATH = path.join(process.cwd(), "data", "fertilizantes-npk.json");

export interface FertilizanteNPK {
  nombre: string;
  n_pct: number; // % N total
  p2o5_pct: number; // % P2O5
  k2o_pct: number; // % K2O
}

export interface NpkResult {
  nKgHa: number;
  pKgHa: number;
  kKgHa: number;
}

export type NpkValidationResult =
  | { ok: true; data: NpkResult }
  | { ok: false; code: "FERTILIZANTE_NO_REGISTRADO" | "DOSIS_NO_RECONOCIDA"; message: string };

let cache: FertilizanteNPK[] | null = null;

function loadRegistroNpk(): FertilizanteNPK[] {
  if (cache) return cache;
  try {
    const raw = fs.readFileSync(REGISTRO_PATH, "utf-8");
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) {
      cache = [];
      return cache;
    }
    cache = data.filter((item): item is FertilizanteNPK => {
      return (
        typeof item === "object" &&
        item !== null &&
        typeof (item as FertilizanteNPK).nombre === "string" &&
        typeof (item as FertilizanteNPK).n_pct === "number"
      );
    });
    return cache;
  } catch {
    cache = [];
    return cache;
  }
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

/** Espera formatos tipo \"200 kg/ha\". Devuelve kg/ha numéricos. */
function parseDosisKgHa(dosis: string): number | null {
  const t = dosis.trim();
  if (!t) return null;
  const match = t.match(/^([\d.,]+)\s*([a-zA-Z/]+)?/);
  if (!match) return null;
  const numStr = match[1].replace(",", ".");
  const num = parseFloat(numStr);
  if (Number.isNaN(num) || num <= 0) return null;
  // De momento asumimos que la unidad ya está en kg/ha
  return num;
}

/** Calcula NPK (kg/ha) a partir de producto y dosis textual. */
export function calcularNpkParaAbonado(producto: string, dosis: string): NpkValidationResult {
  const registro = loadRegistroNpk();
  const prodNorm = normalize(producto || "");
  if (!prodNorm) {
    return {
      ok: false,
      code: "FERTILIZANTE_NO_REGISTRADO",
      message: "Indica el nombre del fertilizante para calcular NPK.",
    };
  }
  const entrada = registro.find((f) => {
    const n = normalize(f.nombre);
    return n === prodNorm || n.includes(prodNorm) || prodNorm.includes(n);
  });
  if (!entrada) {
    return {
      ok: false,
      code: "FERTILIZANTE_NO_REGISTRADO",
      message: "Este fertilizante no está en el registro NPK configurado.",
    };
  }

  const dosisKgHa = parseDosisKgHa(dosis);
  if (dosisKgHa == null) {
    return {
      ok: false,
      code: "DOSIS_NO_RECONOCIDA",
      message: "No se ha podido interpretar la dosis (use formato tipo \"200 kg/ha\").",
    };
  }

  const nKgHa = (dosisKgHa * entrada.n_pct) / 100;
  const pKgHa = (dosisKgHa * entrada.p2o5_pct) / 100;
  const kKgHa = (dosisKgHa * entrada.k2o_pct) / 100;

  return { ok: true, data: { nKgHa, pKgHa, kKgHa } };
}

/** Límite de N por defecto en Zonas Vulnerables a Nitratos (kg N/ha/año). */
export const DEFAULT_N_LIMIT_ZV = 170;


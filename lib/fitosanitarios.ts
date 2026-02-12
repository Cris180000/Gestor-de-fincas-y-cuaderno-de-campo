/**
 * Validación de productos fitosanitarios frente al registro oficial (MAPA España).
 * Los datos en data/fitosanitarios-registro.json son de ejemplo; en producción
 * sustituir por el fichero JSON oficial del Ministerio cuando esté disponible.
 */

import fs from "fs";
import path from "path";

export interface UsoFitosanitario {
  cultivos: string[];
  dosisMax: string;
  unidad?: string;
}

export interface ProductoFitosanitario {
  nombre: string;
  registro?: string;
  usos: UsoFitosanitario[];
}

export type FitosanitarioValidationResult =
  | { ok: true }
  | {
      ok: false;
      code: "NO_REGISTRADO" | "CULTIVO_NO_INDICADO" | "PROHIBIDO_CULTIVO" | "DOSIS_SUPERADA";
      message: string;
      detalle?: string;
    };

const REGISTRO_PATH = path.join(process.cwd(), "data", "fitosanitarios-registro.json");
let cache: ProductoFitosanitario[] | null = null;

function loadRegistro(): ProductoFitosanitario[] {
  if (cache) return cache;
  try {
    const raw = fs.readFileSync(REGISTRO_PATH, "utf-8");
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) {
      cache = [];
      return cache;
    }
    cache = data.filter(
      (item): item is ProductoFitosanitario =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as ProductoFitosanitario).nombre === "string" &&
        Array.isArray((item as ProductoFitosanitario).usos)
    );
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

/** Extrae número y unidad de una cadena tipo "2 L/ha" o "1,5 kg/ha" */
function parseDosis(dosis: string): { num: number; unit: string } | null {
  const t = dosis.trim();
  const match = t.match(/^([\d,]+)\s*(.*)$/);
  if (!match) return null;
  const numStr = match[1].replace(",", ".");
  const num = parseFloat(numStr);
  if (Number.isNaN(num)) return null;
  const unit = (match[2] ?? "").trim().toLowerCase() || "unidad";
  return { num, unit };
}

/** Compara dosis usuario vs máxima; si las unidades son equivalentes, compara números */
function dosisSuperaMax(dosisUsuario: string, dosisMax: string): boolean {
  const user = parseDosis(dosisUsuario);
  const max = parseDosis(dosisMax);
  if (!user || !max) return false;
  const unitNorm = (u: string) => u.replace(/\s/g, "").replace(/\/ha$/i, "/ha");
  if (unitNorm(user.unit) !== unitNorm(max.unit)) return false;
  return user.num > max.num;
}

/**
 * Valida un tratamiento fitosanitario: producto registrado, autorizado para el cultivo
 * y dosis no superior al máximo legal.
 */
export function validateFitosanitario(
  producto: string,
  cultivoParcela: string | null,
  dosis: string
): FitosanitarioValidationResult {
  const productoNorm = normalize(producto || "");
  if (!productoNorm) {
    return { ok: true };
  }

  const registro = loadRegistro();
  const entrada = registro.find((p) => {
    const n = normalize(p.nombre);
    return n === productoNorm || n.includes(productoNorm) || productoNorm.includes(n);
  });

  if (!entrada) {
    return {
      ok: false,
      code: "NO_REGISTRADO",
      message: "Este producto no figura en el registro oficial de fitosanitarios.",
      detalle: "Compruebe el nombre en el Registro de Productos Fitosanitarios del MAPA (servicio.mapa.gob.es/regfiweb).",
    };
  }

  const cultivoNorm = normalize((cultivoParcela ?? "").trim());
  if (!cultivoNorm) {
    return {
      ok: false,
      code: "CULTIVO_NO_INDICADO",
      message: "Indique el cultivo de la parcela para verificar si el producto está autorizado.",
      detalle: "Edite la parcela y asigne el cultivo principal.",
    };
  }

  let usoEncontrado: UsoFitosanitario | null = null;
  for (const uso of entrada.usos) {
    const autorizado = uso.cultivos.some((c) => {
      const cNorm = normalize(c);
      return cNorm === cultivoNorm || cultivoNorm.includes(cNorm) || cNorm.includes(cultivoNorm);
    });
    if (autorizado) {
      usoEncontrado = uso;
      break;
    }
  }

  if (!usoEncontrado) {
    return {
      ok: false,
      code: "PROHIBIDO_CULTIVO",
      message: `El producto "${entrada.nombre}" no está autorizado para el cultivo indicado en la parcela.`,
      detalle: "No puede aplicarse este fitosanitario a este cultivo según el registro oficial.",
    };
  }

  if (dosis && dosis.trim() && usoEncontrado.dosisMax) {
    if (dosisSuperaMax(dosis.trim(), usoEncontrado.dosisMax)) {
      return {
        ok: false,
        code: "DOSIS_SUPERADA",
        message: "La dosis indicada supera el máximo legal para este producto y cultivo.",
        detalle: `Dosis máxima autorizada: ${usoEncontrado.dosisMax}.`,
      };
    }
  }

  return { ok: true };
}

const TIPOS = ["directo", "indirecto"] as const;
const CATEGORIAS = ["semillas", "fitosanitarios", "amortizacion", "seguros", "otros"] as const;

export type TipoCoste = (typeof TIPOS)[number];
export type CategoriaCoste = (typeof CATEGORIAS)[number];

export interface CosteCreateInput {
  fincaId?: string;
  parcelaId?: string;
  fecha: string;
  tipo: TipoCoste;
  categoria: CategoriaCoste;
  concepto: string;
  importeCentimos: number;
}

export interface CosteUpdateInput {
  fincaId?: string | null;
  parcelaId?: string | null;
  fecha?: string;
  tipo?: TipoCoste;
  categoria?: CategoriaCoste;
  concepto?: string;
  importeCentimos?: number;
}

function parseEurosToCentimos(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string") {
    const n = parseFloat(value.replace(",", ".").trim());
    if (!Number.isNaN(n) && n >= 0) return Math.round(n * 100);
  }
  return null;
}

export function validateCosteCreate(
  body: unknown
): { ok: true; data: CosteCreateInput } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!body || typeof body !== "object") return { ok: false, errors: ["Datos no válidos"] };
  const b = body as Record<string, unknown>;

  const fincaId = typeof b.fincaId === "string" ? b.fincaId.trim() || undefined : undefined;
  const parcelaId = typeof b.parcelaId === "string" ? b.parcelaId.trim() || undefined : undefined;
  const fecha = typeof b.fecha === "string" ? b.fecha.trim() : "";
  if (!fecha) errors.push("La fecha es obligatoria");
  const dateObj = fecha ? new Date(fecha) : null;
  if (fecha && (!dateObj || Number.isNaN(dateObj.getTime()))) errors.push("Fecha no válida");

  const tipo = typeof b.tipo === "string" ? b.tipo.trim().toLowerCase() : "";
  if (!TIPOS.includes(tipo as TipoCoste)) errors.push("Tipo debe ser directo o indirecto");

  const categoria = typeof b.categoria === "string" ? b.categoria.trim().toLowerCase() : "";
  if (!CATEGORIAS.includes(categoria as CategoriaCoste)) errors.push("Categoría no válida");

  const concepto = typeof b.concepto === "string" ? b.concepto.trim() : "";
  if (!concepto) errors.push("El concepto es obligatorio");

  const importeCentimos = parseEurosToCentimos(b.importeCentimos ?? b.importe);
  if (importeCentimos === null || importeCentimos < 0) errors.push("Importe no válido (use número en euros)");

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      fincaId,
      parcelaId,
      fecha,
      tipo: tipo as TipoCoste,
      categoria: categoria as CategoriaCoste,
      concepto,
      importeCentimos,
    },
  };
}

export function validateCosteUpdate(
  body: unknown
): { ok: true; data: CosteUpdateInput } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!body || typeof body !== "object") return { ok: false, errors: ["Datos no válidos"] };
  const b = body as Record<string, unknown>;
  const data: CosteUpdateInput = {};

  if (b.fincaId !== undefined) data.fincaId = b.fincaId === null || b.fincaId === "" ? null : (b.fincaId as string);
  if (b.parcelaId !== undefined) data.parcelaId = b.parcelaId === null || b.parcelaId === "" ? null : (b.parcelaId as string);
  if (b.fecha !== undefined) {
    const fecha = typeof b.fecha === "string" ? b.fecha.trim() : "";
    if (!fecha) errors.push("La fecha es obligatoria");
    else {
      const d = new Date(fecha);
      if (Number.isNaN(d.getTime())) errors.push("Fecha no válida");
      else data.fecha = fecha;
    }
  }
  if (b.tipo !== undefined) {
    const tipo = typeof b.tipo === "string" ? b.tipo.trim().toLowerCase() : "";
    if (!TIPOS.includes(tipo as TipoCoste)) errors.push("Tipo debe ser directo o indirecto");
    else data.tipo = tipo as TipoCoste;
  }
  if (b.categoria !== undefined) {
    const cat = typeof b.categoria === "string" ? b.categoria.trim().toLowerCase() : "";
    if (!CATEGORIAS.includes(cat as CategoriaCoste)) errors.push("Categoría no válida");
    else data.categoria = cat as CategoriaCoste;
  }
  if (b.concepto !== undefined) {
    const concepto = typeof b.concepto === "string" ? b.concepto.trim() : "";
    if (!concepto) errors.push("El concepto es obligatorio");
    else data.concepto = concepto;
  }
  if (b.importeCentimos !== undefined || b.importe !== undefined) {
    const centimos = parseEurosToCentimos(b.importeCentimos ?? b.importe);
    if (centimos === null || centimos < 0) errors.push("Importe no válido");
    else data.importeCentimos = centimos;
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data };
}

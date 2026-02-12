export interface ParcelaInput {
  nombre?: string;
  cultivo?: string;
  superficie?: number | string;
  notas?: string;
  referenciaCatastral?: string;
}

export function validateParcela(
  body: unknown
): { ok: true; data: { nombre: string; cultivo?: string; superficie?: number; notas?: string; referenciaCatastral?: string } } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!body || typeof body !== "object") {
    return { ok: false, errors: ["Datos no válidos"] };
  }
  const b = body as Record<string, unknown>;
  const nombre = typeof b.nombre === "string" ? b.nombre.trim() : "";
  if (!nombre) errors.push("El nombre es obligatorio");
  const cultivo = typeof b.cultivo === "string" ? b.cultivo.trim() || undefined : undefined;
  let superficie: number | undefined;
  if (b.superficie !== undefined && b.superficie !== null && b.superficie !== "") {
    const n = Number(b.superficie);
    if (Number.isNaN(n) || n < 0) errors.push("La superficie debe ser un número mayor o igual a 0");
    else superficie = n;
  }
  const notas = typeof b.notas === "string" ? b.notas.trim() || undefined : undefined;
  const referenciaCatastral = typeof b.referenciaCatastral === "string" ? b.referenciaCatastral.trim() || undefined : undefined;
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data: { nombre, cultivo, superficie, notas, referenciaCatastral } };
}

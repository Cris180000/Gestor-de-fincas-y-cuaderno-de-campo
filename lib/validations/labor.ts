const TIPOS_VALIDOS = ["riego", "abonado", "tratamiento", "poda", "cosecha", "otros"] as const;

export type TipoLabor = (typeof TIPOS_VALIDOS)[number];

export function validateTipo(tipo: unknown): tipo is TipoLabor {
  return typeof tipo === "string" && TIPOS_VALIDOS.includes(tipo as TipoLabor);
}

export interface LaborCreateInput {
  parcelaId: string;
  tipo: TipoLabor;
  fecha: string; // ISO date or datetime (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
  descripcion: string;
  producto?: string;
  cantidad?: string;
  weatherWarningIgnored?: boolean;
}

export interface LaborUpdateInput {
  tipo?: TipoLabor;
  fecha?: string;
  descripcion?: string;
  producto?: string;
  cantidad?: string;
  estado?: "pendiente" | "realizada";
  lat?: number;
  lon?: number;
}

export function validateLaborCreate(
  body: unknown
): { ok: true; data: LaborCreateInput } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!body || typeof body !== "object") {
    return { ok: false, errors: ["Datos no válidos"] };
  }
  const b = body as Record<string, unknown>;
  const parcelaId = typeof b.parcelaId === "string" ? b.parcelaId.trim() : "";
  if (!parcelaId) errors.push("La parcela es obligatoria");
  const tipo = typeof b.tipo === "string" ? b.tipo.trim() : "";
  if (!validateTipo(tipo)) errors.push("Tipo de labor no válido");
  const fecha = typeof b.fecha === "string" ? b.fecha.trim() : "";
  if (!fecha) errors.push("La fecha es obligatoria");
  const dateObj = fecha ? new Date(fecha) : null;
  if (fecha && (!dateObj || Number.isNaN(dateObj.getTime()))) errors.push("Fecha no válida");
  const descripcion = typeof b.descripcion === "string" ? b.descripcion.trim() : "";
  if (!descripcion) errors.push("La descripción es obligatoria");
  const producto = typeof b.producto === "string" ? b.producto.trim() || undefined : undefined;
  const cantidad = typeof b.cantidad === "string" ? b.cantidad.trim() || undefined : undefined;
  const weatherWarningIgnored = b.weather_warning_ignored === true;
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: { parcelaId, tipo: tipo as TipoLabor, fecha, descripcion, producto, cantidad, weatherWarningIgnored },
  };
}

export function validateLaborUpdate(
  body: unknown
): { ok: true; data: LaborUpdateInput } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!body || typeof body !== "object") {
    return { ok: false, errors: ["Datos no válidos"] };
  }
  const b = body as Record<string, unknown>;
  const data: LaborUpdateInput = {};
  if (b.tipo !== undefined) {
    const tipo = typeof b.tipo === "string" ? b.tipo.trim() : "";
    if (!validateTipo(tipo)) errors.push("Tipo de labor no válido");
    else data.tipo = tipo as TipoLabor;
  }
  if (b.fecha !== undefined) {
    const fecha = typeof b.fecha === "string" ? b.fecha.trim() : "";
    if (!fecha) errors.push("La fecha es obligatoria");
    else {
      const dateObj = new Date(fecha);
      if (Number.isNaN(dateObj.getTime())) errors.push("Fecha no válida");
      else data.fecha = fecha;
    }
  }
  if (b.descripcion !== undefined) {
    const descripcion = typeof b.descripcion === "string" ? b.descripcion.trim() : "";
    if (!descripcion) errors.push("La descripción es obligatoria");
    else data.descripcion = descripcion;
  }
  if (b.producto !== undefined) data.producto = typeof b.producto === "string" ? b.producto.trim() || undefined : undefined;
  if (b.cantidad !== undefined) data.cantidad = typeof b.cantidad === "string" ? b.cantidad.trim() || undefined : undefined;
  if (b.estado !== undefined) {
    const estado = typeof b.estado === "string" ? b.estado.trim() : "";
    if (estado !== "pendiente" && estado !== "realizada") errors.push("Estado debe ser pendiente o realizada");
    else data.estado = estado as "pendiente" | "realizada";
  }
  if (b.lat !== undefined) {
    const n = Number(b.lat);
    if (Number.isNaN(n) || n < -90 || n > 90) errors.push("Latitud no válida (-90 a 90)");
    else data.lat = n;
  }
  if (b.lon !== undefined) {
    const n = Number(b.lon);
    if (Number.isNaN(n) || n < -180 || n > 180) errors.push("Longitud no válida (-180 a 180)");
    else data.lon = n;
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data };
}

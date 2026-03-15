/**
 * Cliente para las APIs de Finca y Parcela (fetch con credenciales).
 * Las cookies de sesión se envían por defecto en same-origin.
 */

const BASE = "";

export type ApiError = Error & { code?: string; detalle?: string };

async function handleResponse<T>(res: Response): Promise<T> {
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg = Array.isArray(json.errors) ? (json.errors as string[]).join(", ") : (json.error as string) || "Error en la petición";
    const err = new Error(msg) as ApiError;
    if (typeof json.code === "string") err.code = json.code;
    if (typeof json.detalle === "string") err.detalle = json.detalle;
    throw err;
  }
  return json as T;
}

export interface FincaItem {
  id: string;
  nombre: string;
  ubicacion: string | null;
  superficie: number | null;
  notas: string | null;
  referenciaCatastral?: string | null;
  createdAt: string;
  parcelasCount?: number;
}

export interface PaginatedFincas {
  data: FincaItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ParcelaItem {
  id: string;
  fincaId: string;
  nombre: string;
  cultivo: string | null;
  superficie: number | null;
  notas: string | null;
  referenciaCatastral?: string | null;
  createdAt: string;
}

export interface PaginatedParcelas {
  data: ParcelaItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  finca?: { id: string; nombre: string };
}

export const fincasApi = {
  list: (params?: { page?: number; pageSize?: number }) => {
    const q = new URLSearchParams();
    if (params?.page != null) q.set("page", String(params.page));
    if (params?.pageSize != null) q.set("pageSize", String(params.pageSize));
    return fetch(`${BASE}/api/fincas?${q}`).then((r) => handleResponse<PaginatedFincas>(r));
  },
  get: (id: string) =>
    fetch(`${BASE}/api/fincas/${id}`).then((r) => handleResponse<{ data: FincaItem }>(r)),
  create: (body: { nombre: string; ubicacion?: string; superficie?: number; notas?: string; referenciaCatastral?: string }) =>
    fetch(`${BASE}/api/fincas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => handleResponse<{ data: FincaItem }>(r)),
  update: (id: string, body: { nombre?: string; ubicacion?: string; superficie?: number; notas?: string; referenciaCatastral?: string }) =>
    fetch(`${BASE}/api/fincas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => handleResponse<{ data: FincaItem }>(r)),
  delete: (id: string) =>
    fetch(`${BASE}/api/fincas/${id}`, { method: "DELETE" }).then((r) => handleResponse<{ ok: boolean }>(r)),
};

export const parcelasApi = {
  /** Listar parcelas: todas las del usuario o solo las de una finca */
  list: (params?: { fincaId?: string; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams();
    if (params?.page != null) q.set("page", String(params.page));
    if (params?.pageSize != null) q.set("pageSize", String(params.pageSize));
    if (params?.fincaId) q.set("fincaId", params.fincaId);
    return fetch(`${BASE}/api/parcelas?${q}`).then((r) =>
      handleResponse<PaginatedParcelas>(r)
    );
  },
  listByFinca: (fincaId: string, params?: { page?: number; pageSize?: number }) => {
    const q = new URLSearchParams();
    if (params?.page != null) q.set("page", String(params.page));
    if (params?.pageSize != null) q.set("pageSize", String(params.pageSize));
    return fetch(`${BASE}/api/fincas/${fincaId}/parcelas?${q}`).then((r) =>
      handleResponse<PaginatedParcelas>(r)
    );
  },
  get: (id: string) =>
    fetch(`${BASE}/api/parcelas/${id}`).then((r) =>
      handleResponse<{ data: ParcelaItem & { finca?: { id: string; nombre: string } } }>(r)
    ),
  create: (fincaId: string, body: { nombre: string; cultivo?: string; superficie?: number; notas?: string; referenciaCatastral?: string }) =>
    fetch(`${BASE}/api/fincas/${fincaId}/parcelas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => handleResponse<{ data: ParcelaItem }>(r)),
  update: (
    id: string,
    body: { nombre?: string; cultivo?: string; superficie?: number; notas?: string; referenciaCatastral?: string }
  ) =>
    fetch(`${BASE}/api/parcelas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => handleResponse<{ data: ParcelaItem }>(r)),
  delete: (id: string) =>
    fetch(`${BASE}/api/parcelas/${id}`, { method: "DELETE" }).then((r) => handleResponse<{ ok: boolean }>(r)),
};

export interface LaborItem {
  id: string;
  parcelaId: string;
  tipo: string;
  fecha: string;
  descripcion: string;
  producto: string | null;
  cantidad: string | null;
  estado: string;
  realizadaAt: string | null;
  lat: number | null;
  lon: number | null;
  nKgHa?: number | null;
  pKgHa?: number | null;
  kKgHa?: number | null;
  weatherWarningIgnored?: boolean;
  createdAt: string;
  parcela?: { id: string; nombre: string; finca?: { id: string; nombre: string } };
}

export interface PaginatedLabores {
  data: LaborItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface LaboresListParams {
  page?: number;
  pageSize?: number;
  fincaId?: string;
  parcelaId?: string;
  tipo?: string;
  desde?: string;
  hasta?: string;
}

export const laboresApi = {
  list: (params?: LaboresListParams) => {
    const q = new URLSearchParams();
    if (params?.page != null) q.set("page", String(params.page));
    if (params?.pageSize != null) q.set("pageSize", String(params.pageSize));
    if (params?.fincaId) q.set("fincaId", params.fincaId);
    if (params?.parcelaId) q.set("parcelaId", params.parcelaId);
    if (params?.tipo) q.set("tipo", params.tipo);
    if (params?.desde) q.set("desde", params.desde);
    if (params?.hasta) q.set("hasta", params.hasta);
    return fetch(`${BASE}/api/labores?${q}`).then((r) => handleResponse<PaginatedLabores>(r));
  },
  get: (id: string) =>
    fetch(`${BASE}/api/labores/${id}`).then((r) =>
      handleResponse<{ data: LaborItem }>(r)
    ),
  create: (body: {
    parcelaId: string;
    tipo: string;
    fecha: string;
    descripcion: string;
    producto?: string;
    cantidad?: string;
    weather_warning_ignored?: boolean;
  }) =>
    fetch(`${BASE}/api/labores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => handleResponse<{ data: LaborItem }>(r)),
  update: (
    id: string,
    body: {
      tipo?: string;
      fecha?: string;
      descripcion?: string;
      producto?: string;
      cantidad?: string;
      estado?: "pendiente" | "realizada";
      lat?: number;
      lon?: number;
    }
  ) =>
    fetch(`${BASE}/api/labores/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => handleResponse<{ data: LaborItem }>(r)),
  delete: (id: string) =>
    fetch(`${BASE}/api/labores/${id}`, { method: "DELETE" }).then((r) => handleResponse<{ ok: boolean }>(r)),
};

// --- Costes (control al céntimo) ---
export interface CosteItem {
  id: string;
  fincaId: string | null;
  parcelaId: string | null;
  fecha: string;
  tipo: string;
  categoria: string;
  concepto: string;
  importeCentimos: number;
  createdAt: string;
  finca?: { id: string; nombre: string } | null;
  parcela?: { id: string; nombre: string } | null;
}

export interface PaginatedCostes {
  data: CosteItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CostesListParams {
  page?: number;
  pageSize?: number;
  fincaId?: string;
  parcelaId?: string;
  desde?: string;
  hasta?: string;
  tipo?: string;
}

export const costesApi = {
  list: (params?: CostesListParams) => {
    const q = new URLSearchParams();
    if (params?.page != null) q.set("page", String(params.page));
    if (params?.pageSize != null) q.set("pageSize", String(params.pageSize));
    if (params?.fincaId) q.set("fincaId", params.fincaId);
    if (params?.parcelaId) q.set("parcelaId", params.parcelaId);
    if (params?.desde) q.set("desde", params.desde);
    if (params?.hasta) q.set("hasta", params.hasta);
    if (params?.tipo) q.set("tipo", params.tipo);
    return fetch(`${BASE}/api/costes?${q}`).then((r) => handleResponse<PaginatedCostes>(r));
  },
  resumen: (params?: { fincaId?: string; parcelaId?: string; desde?: string; hasta?: string }) => {
    const q = new URLSearchParams();
    if (params?.fincaId) q.set("fincaId", params.fincaId);
    if (params?.parcelaId) q.set("parcelaId", params.parcelaId);
    if (params?.desde) q.set("desde", params.desde);
    if (params?.hasta) q.set("hasta", params.hasta);
    return fetch(`${BASE}/api/costes/resumen?${q}`).then((r) => handleResponse<{ totalCentimos: number; totalEuros: number; count: number }>(r));
  },
  get: (id: string) =>
    fetch(`${BASE}/api/costes/${id}`).then((r) => handleResponse<{ data: CosteItem }>(r)),
  create: (body: {
    fincaId?: string;
    parcelaId?: string;
    fecha: string;
    tipo: string;
    categoria: string;
    concepto: string;
    importe: number;
  }) =>
    fetch(`${BASE}/api/costes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => handleResponse<{ data: CosteItem }>(r)),
  update: (
    id: string,
    body: {
      fincaId?: string | null;
      parcelaId?: string | null;
      fecha?: string;
      tipo?: string;
      categoria?: string;
      concepto?: string;
      importe?: number;
    }
  ) =>
    fetch(`${BASE}/api/costes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => handleResponse<{ data: CosteItem }>(r)),
  delete: (id: string) =>
    fetch(`${BASE}/api/costes/${id}`, { method: "DELETE" }).then((r) => handleResponse<{ ok: boolean }>(r)),
};

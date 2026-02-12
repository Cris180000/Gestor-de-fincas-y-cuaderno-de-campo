export type Id = string;

// --- Usuario (autenticación) ---
export interface User {
  id: Id;
  email: string;
  nombre: string;
  password: string; // En demo se guarda en claro; en producción usar backend con hash
  createdAt: string;
}

export interface SessionUser {
  id: Id;
  email: string;
  nombre: string;
}

// --- Fincas y parcelas ---
export interface Finca {
  id: Id;
  nombre: string;
  ubicacion: string;
  hectareas?: number;
  notas?: string;
  createdAt: string;
}

export interface Parcela {
  id: Id;
  fincaId: Id;
  nombre: string;
  superficieHa?: number;
  referencia?: string;
  notas?: string;
  createdAt: string;
  /** Coordenadas opcionales de la parcela (WGS84) */
  lat?: number;
  lon?: number;
}

export interface Cultivo {
  id: Id;
  parcelaId: Id;
  nombre: string;
  variedad?: string;
  fechaPlantacion: string;
  estado: "planificado" | "activo" | "cosechado" | "abandonado";
  notas?: string;
  createdAt: string;
}

// --- Labores agrícolas (unificado: riego, abonado, tratamiento, poda, cosecha, otro) ---
export type TipoLabor =
  | "riego"
  | "abonado"
  | "tratamiento"
  | "poda"
  | "cosecha"
  | "otro";

export interface Labor {
  id: Id;
  parcelaId: Id;
  cultivoId?: Id;
  fecha: string;
  tipo: TipoLabor;
  descripcion: string;
  producto?: string;
  cantidad?: string;
  unidad?: string;
  notas?: string;
  createdAt: string;
}

// Compatibilidad con export antiguo (riegos, abonados, tratamientos)
export interface Riego {
  id: Id;
  parcelaId: Id;
  cultivoId?: Id;
  fecha: string;
  cantidad?: string;
  unidad?: string;
  tipo?: string;
  notas?: string;
  createdAt: string;
}
export interface Abonado {
  id: Id;
  parcelaId: Id;
  cultivoId?: Id;
  fecha: string;
  producto: string;
  dosis?: string;
  tipo?: string;
  notas?: string;
  createdAt: string;
}
export interface Tratamiento {
  id: Id;
  parcelaId: Id;
  cultivoId?: Id;
  fecha: string;
  producto: string;
  objetivo?: string;
  dosis?: string;
  plagaEnfermedad?: string;
  notas?: string;
  createdAt: string;
}

// --- Incidencias ---
export type TipoIncidencia =
  | "plaga"
  | "enfermedad"
  | "helada"
  | "sequía"
  | "granizo"
  | "viento"
  | "otro";

export interface Incidencia {
  id: Id;
  parcelaId: Id;
  cultivoId?: Id;
  fecha: string;
  tipo: TipoIncidencia;
  descripcion: string;
  severidad?: "leve" | "moderada" | "grave";
  resuelta?: boolean;
  fechaResolucion?: string;
  notas?: string;
  createdAt: string;
}

// --- Dispositivos y telemetría ---
export type DeviceType = "humedad_suelo" | "estacion_clima";

export interface Device {
  id: Id;
  userId: Id;
  nombre: string;
  tipo: DeviceType;
  descripcion?: string;
  ubicacion?: string; // texto libre o "lat,lon"
  createdAt: string;
}

export interface Telemetry {
  id: Id;
  deviceId: Id;
  timestamp: string; // ISO
  valor: number;
  unidad: string; // "%", "kPa", "°C", "mm", etc.
}

export interface Store {
  fincas: Finca[];
  parcelas: Parcela[];
  cultivos: Cultivo[];
  labores: Labor[];
  incidencias: Incidencia[];
}

export const STORE_KEY = "gestor-fincas-data";
export const AUTH_KEY = "gestor-fincas-auth";

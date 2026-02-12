/**
 * Base de datos local IndexedDB (Dexie) para modo offline.
 * Almacena copia de fincas, parcelas y labores, más cola de sincronización.
 */

import Dexie, { type Table } from "dexie";

export interface LocalFinca {
  id: string;
  nombre: string;
  ubicacion: string | null;
  superficie: number | null;
  notas: string | null;
  referenciaCatastral?: string | null;
  createdAt: string;
  parcelasCount?: number;
}

export interface LocalParcela {
  id: string;
  fincaId: string;
  nombre: string;
  cultivo: string | null;
  superficie: number | null;
  notas: string | null;
  referenciaCatastral?: string | null;
  createdAt: string;
  finca?: { id: string; nombre: string };
  lat?: number | null;
  lon?: number | null;
}

export interface LocalLabor {
  id: string;
  parcelaId: string;
  tipo: string;
  fecha: string;
  descripcion: string;
  producto: string | null;
  cantidad: string | null;
  estado?: string;
  realizadaAt?: string | null;
  lat?: number | null;
  lon?: number | null;
   nKgHa?: number | null;
   pKgHa?: number | null;
   kKgHa?: number | null;
  createdAt: string;
  parcela?: { id: string; nombre: string; finca?: { id: string; nombre: string } };
}

export type SyncEntity = "finca" | "parcela" | "labor";
export type SyncOp = "create" | "update" | "delete";

export interface SyncQueueItem {
  id: string;
  entity: SyncEntity;
  op: SyncOp;
  /** ID del recurso (puede ser tempId para create) */
  resourceId: string;
  /** Para create/update: cuerpo enviado al servidor. Para delete: vacío */
  payload: Record<string, unknown>;
  /** Solo para parcelas create: fincaId */
  fincaId?: string;
  createdAt: number;
}

const DB_NAME = "gestor-fincas-offline";
const DB_VERSION = 1;

class OfflineDatabase extends Dexie {
  fincas!: Table<LocalFinca, string>;
  parcelas!: Table<LocalParcela, string>;
  labores!: Table<LocalLabor, string>;
  syncQueue!: Table<SyncQueueItem, string>;

  constructor() {
    super(DB_NAME);
    this.version(DB_VERSION).stores({
      fincas: "id, createdAt",
      parcelas: "id, fincaId, createdAt",
      labores: "id, parcelaId, tipo, createdAt",
      syncQueue: "id, createdAt, entity",
    });
  }
}

export const db = new OfflineDatabase();

/** Genera un ID temporal para crear recursos offline (el servidor devolverá el id real) */
export function tempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

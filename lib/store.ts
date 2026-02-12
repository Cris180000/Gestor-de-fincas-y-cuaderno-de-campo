"use client";

import {
  Store,
  Finca,
  Parcela,
  Cultivo,
  Labor,
  Riego,
  Abonado,
  Tratamiento,
  Incidencia,
  STORE_KEY,
} from "./types";

const emptyStore: Store = {
  fincas: [],
  parcelas: [],
  cultivos: [],
  labores: [],
  incidencias: [],
};

function migrateToLabores(parsed: Record<string, unknown>): Labor[] {
  const labores: Labor[] = [];
  const riegos = (parsed.riegos as Riego[] | undefined) ?? [];
  for (const r of riegos) {
    labores.push({
      id: r.id,
      parcelaId: r.parcelaId,
      cultivoId: r.cultivoId,
      fecha: r.fecha,
      tipo: "riego",
      descripcion: r.cantidad && r.unidad ? `${r.cantidad} ${r.unidad}` : "Riego",
      cantidad: r.cantidad,
      unidad: r.unidad as Labor["unidad"],
      notas: r.notas,
      createdAt: r.createdAt,
    });
  }
  const abonados = (parsed.abonados as Abonado[] | undefined) ?? [];
  for (const a of abonados) {
    labores.push({
      id: a.id,
      parcelaId: a.parcelaId,
      cultivoId: a.cultivoId,
      fecha: a.fecha,
      tipo: "abonado",
      descripcion: a.producto,
      producto: a.producto,
      cantidad: a.dosis,
      notas: a.notas,
      createdAt: a.createdAt,
    });
  }
  const tratamientos = (parsed.tratamientos as Tratamiento[] | undefined) ?? [];
  for (const t of tratamientos) {
    labores.push({
      id: t.id,
      parcelaId: t.parcelaId,
      cultivoId: t.cultivoId,
      fecha: t.fecha,
      tipo: "tratamiento",
      descripcion: t.plagaEnfermedad || t.producto,
      producto: t.producto,
      cantidad: t.dosis,
      notas: t.notas,
      createdAt: t.createdAt,
    });
  }
  return labores;
}

function loadStore(): Store {
  if (typeof window === "undefined") return emptyStore;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return emptyStore;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const hasOld =
      Array.isArray(parsed.riegos) || Array.isArray(parsed.abonados) || Array.isArray(parsed.tratamientos);
    const existingLabores = (parsed.labores as Labor[] | undefined) ?? [];
    const labores = hasOld && existingLabores.length === 0
      ? migrateToLabores(parsed)
      : existingLabores;
    return {
      fincas: (parsed.fincas as Finca[]) ?? [],
      parcelas: (parsed.parcelas as Parcela[]) ?? [],
      cultivos: (parsed.cultivos as Cultivo[]) ?? [],
      labores,
      incidencias: (parsed.incidencias as Incidencia[]) ?? [],
    };
  } catch {
    return emptyStore;
  }
}

function saveStore(store: Store): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getStore(): Store {
  return loadStore();
}

export type ExportPayload = { version: number; exportedAt: string; data: Store };

export function exportData(): string {
  const store = loadStore();
  const payload: ExportPayload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    data: store,
  };
  return JSON.stringify(payload, null, 2);
}

export function importData(json: string): { ok: true } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(json) as ExportPayload | Store | Record<string, unknown>;
    let store: Store;
    if (parsed && typeof parsed === "object" && "data" in parsed && (parsed as ExportPayload).data) {
      store = (parsed as ExportPayload).data;
    } else if (parsed && typeof parsed === "object" && "fincas" in parsed) {
      store = parsed as Store;
    } else {
      return { ok: false, error: "Formato de archivo no válido" };
    }
    const hasOld =
      Array.isArray((parsed as Record<string, unknown>).riegos) ||
      Array.isArray((parsed as Record<string, unknown>).abonados) ||
      Array.isArray((parsed as Record<string, unknown>).tratamientos);
    const existingLabores = Array.isArray(store.labores) ? store.labores : [];
    store = {
      fincas: Array.isArray(store.fincas) ? store.fincas : [],
      parcelas: Array.isArray(store.parcelas) ? store.parcelas : [],
      cultivos: Array.isArray(store.cultivos) ? store.cultivos : [],
      labores:
        existingLabores.length > 0 ? existingLabores : hasOld ? migrateToLabores(store as unknown as Record<string, unknown>) : [],
      incidencias: Array.isArray(store.incidencias) ? store.incidencias : [],
    };
    saveStore(store);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error al importar" };
  }
}

// --- Fincas ---
export function addFinca(f: Omit<Finca, "id" | "createdAt">): Finca {
  const store = loadStore();
  const nueva: Finca = {
    ...f,
    id: genId(),
    createdAt: new Date().toISOString(),
  };
  store.fincas.push(nueva);
  saveStore(store);
  return nueva;
}

export function updateFinca(id: string, f: Partial<Finca>): void {
  const store = loadStore();
  const i = store.fincas.findIndex((x) => x.id === id);
  if (i >= 0) {
    store.fincas[i] = { ...store.fincas[i], ...f };
    saveStore(store);
  }
}

export function deleteFinca(id: string): void {
  const store = loadStore();
  const parcelaIds = store.parcelas.filter((p) => p.fincaId === id).map((p) => p.id);
  store.fincas = store.fincas.filter((x) => x.id !== id);
  store.parcelas = store.parcelas.filter((p) => p.fincaId !== id);
  store.cultivos = store.cultivos.filter((c) => !parcelaIds.includes(c.parcelaId));
  store.labores = store.labores.filter((l) => !parcelaIds.includes(l.parcelaId));
  store.incidencias = store.incidencias.filter((i) => !parcelaIds.includes(i.parcelaId));
  saveStore(store);
}

// --- Parcelas ---
export function addParcela(p: Omit<Parcela, "id" | "createdAt">): Parcela {
  const store = loadStore();
  const nueva: Parcela = {
    ...p,
    id: genId(),
    createdAt: new Date().toISOString(),
  };
  store.parcelas.push(nueva);
  saveStore(store);
  return nueva;
}

export function updateParcela(id: string, p: Partial<Parcela>): void {
  const store = loadStore();
  const i = store.parcelas.findIndex((x) => x.id === id);
  if (i >= 0) {
    store.parcelas[i] = { ...store.parcelas[i], ...p };
    saveStore(store);
  }
}

export function deleteParcela(id: string): void {
  const store = loadStore();
  store.parcelas = store.parcelas.filter((x) => x.id !== id);
  store.cultivos = store.cultivos.filter((c) => c.parcelaId !== id);
  store.labores = store.labores.filter((l) => l.parcelaId !== id);
  store.incidencias = store.incidencias.filter((i) => i.parcelaId !== id);
  saveStore(store);
}

// --- Cultivos ---
export function addCultivo(c: Omit<Cultivo, "id" | "createdAt">): Cultivo {
  const store = loadStore();
  const nuevo: Cultivo = {
    ...c,
    id: genId(),
    createdAt: new Date().toISOString(),
  };
  store.cultivos.push(nuevo);
  saveStore(store);
  return nuevo;
}

export function updateCultivo(id: string, c: Partial<Cultivo>): void {
  const store = loadStore();
  const i = store.cultivos.findIndex((x) => x.id === id);
  if (i >= 0) {
    store.cultivos[i] = { ...store.cultivos[i], ...c };
    saveStore(store);
  }
}

export function deleteCultivo(id: string): void {
  const store = loadStore();
  store.cultivos = store.cultivos.filter((x) => x.id !== id);
  saveStore(store);
}

// --- Labores ---
export function addLabor(l: Omit<Labor, "id" | "createdAt">): Labor {
  const store = loadStore();
  const nueva: Labor = {
    ...l,
    id: genId(),
    createdAt: new Date().toISOString(),
  };
  store.labores.push(nueva);
  saveStore(store);
  return nueva;
}

export function updateLabor(id: string, l: Partial<Labor>): void {
  const store = loadStore();
  const i = store.labores.findIndex((x) => x.id === id);
  if (i >= 0) {
    store.labores[i] = { ...store.labores[i], ...l };
    saveStore(store);
  }
}

export function deleteLabor(id: string): void {
  const store = loadStore();
  store.labores = store.labores.filter((x) => x.id !== id);
  saveStore(store);
}

// --- Incidencias ---
export function addIncidencia(i: Omit<Incidencia, "id" | "createdAt">): Incidencia {
  const store = loadStore();
  const nueva: Incidencia = {
    ...i,
    id: genId(),
    createdAt: new Date().toISOString(),
  };
  store.incidencias.push(nueva);
  saveStore(store);
  return nueva;
}

export function updateIncidencia(id: string, i: Partial<Incidencia>): void {
  const store = loadStore();
  const idx = store.incidencias.findIndex((x) => x.id === id);
  if (idx >= 0) {
    store.incidencias[idx] = { ...store.incidencias[idx], ...i };
    saveStore(store);
  }
}

export function deleteIncidencia(id: string): void {
  const store = loadStore();
  store.incidencias = store.incidencias.filter((x) => x.id !== id);
  saveStore(store);
}

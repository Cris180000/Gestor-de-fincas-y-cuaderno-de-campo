/**
 * Capa offline-first: usa IndexedDB cuando no hay red y sincroniza al recuperar conexión.
 * Reexporta los mismos tipos que api-client para que las vistas no cambien.
 */

import * as api from "@/lib/api-client";
import { db, tempId } from "@/lib/offline-db";
import type { SyncQueueItem } from "@/lib/offline-db";

export type FincaItem = api.FincaItem;
export type PaginatedFincas = api.PaginatedFincas;
export type ParcelaItem = api.ParcelaItem;
export type PaginatedParcelas = api.PaginatedParcelas;
export type LaborItem = api.LaborItem;
export type PaginatedLabores = api.PaginatedLabores;
export type LaboresListParams = api.LaboresListParams;

const BASE = "";

function isOnline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(Array.isArray(json.errors) ? json.errors.join(", ") : (json as { error?: string }).error || "Error en la petición");
  }
  return json as T;
}

/** Sincronizar todos los datos desde el servidor a IndexedDB (solo cuando hay red) */
export async function syncAllFromServer(): Promise<void> {
  if (!isOnline()) return;
  try {
    const [fincasRes, parcelasRes, laboresRes] = await Promise.all([
      api.fincasApi.list({ pageSize: 500 }),
      api.parcelasApi.list({ pageSize: 500 }),
      api.laboresApi.list({ pageSize: 500 }),
    ]);
    await db.fincas.clear();
    await db.parcelas.clear();
    await db.labores.clear();
    await db.fincas.bulkPut(fincasRes.data.map((f) => ({ ...f, createdAt: typeof f.createdAt === "string" ? f.createdAt : new Date(f.createdAt as unknown as number).toISOString() })));
    await db.parcelas.bulkPut(parcelasRes.data.map((p) => ({ ...p, createdAt: typeof p.createdAt === "string" ? p.createdAt : new Date(p.createdAt as unknown as number).toISOString() })));
    await db.labores.bulkPut(
      laboresRes.data.map((l) => ({
        ...l,
        fecha: typeof l.fecha === "string" ? l.fecha : new Date((l.fecha as unknown) as number).toISOString().slice(0, 10),
        createdAt: typeof l.createdAt === "string" ? l.createdAt : new Date((l.createdAt as unknown) as number).toISOString(),
        estado: l.estado ?? "pendiente",
        realizadaAt: l.realizadaAt ?? null,
        lat: l.lat ?? null,
        lon: l.lon ?? null,
        nKgHa: l.nKgHa ?? null,
        pKgHa: l.pKgHa ?? null,
        kKgHa: l.kKgHa ?? null,
      }))
    );
  } catch {
    // Red puede haber fallado; no bloquear
  }
}

/** Procesar cola de sincronización (llamar cuando vuelve la conexión) */
export async function processSyncQueue(): Promise<void> {
  const items = await db.syncQueue.orderBy("createdAt").toArray();
  const tempToReal: Record<string, string> = {};
  for (const item of items) {
    try {
      const resolvedId = tempToReal[item.resourceId] ?? item.resourceId;
      if (item.entity === "finca") {
        if (item.op === "create") {
          const res = await fetch(`${BASE}/api/fincas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item.payload),
          }).then((r) => handleResponse<{ data: api.FincaItem }>(r));
          tempToReal[item.resourceId] = res.data.id;
          await db.fincas.delete(item.resourceId);
          await db.fincas.put({ ...res.data, createdAt: typeof res.data.createdAt === "string" ? res.data.createdAt : new Date().toISOString() });
        } else if (item.op === "update") {
          await fetch(`${BASE}/api/fincas/${resolvedId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item.payload),
          }).then((r) => handleResponse<{ data: api.FincaItem }>(r));
          const updated = await api.fincasApi.get(resolvedId);
          await db.fincas.put({ ...updated.data, createdAt: typeof updated.data.createdAt === "string" ? updated.data.createdAt : new Date().toISOString() });
        } else if (item.op === "delete") {
          await fetch(`${BASE}/api/fincas/${resolvedId}`, { method: "DELETE" });
          const parcelaIds = await db.parcelas.where("fincaId").equals(resolvedId).primaryKeys();
          for (const pid of parcelaIds) await db.labores.where("parcelaId").equals(pid).delete();
          await db.parcelas.where("fincaId").equals(resolvedId).delete();
          await db.fincas.delete(resolvedId);
        }
      } else if (item.entity === "parcela") {
        const fincaId = (item.payload.fincaId as string) || item.fincaId;
        const realFincaId = tempToReal[fincaId ?? ""] ?? fincaId;
        if (item.op === "create") {
          const body = { nombre: item.payload.nombre as string, cultivo: item.payload.cultivo as string | undefined, superficie: item.payload.superficie as number | undefined, notas: item.payload.notas as string | undefined };
          const res = await fetch(`${BASE}/api/fincas/${realFincaId}/parcelas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }).then((r) => handleResponse<{ data: api.ParcelaItem }>(r));
          tempToReal[item.resourceId] = res.data.id;
          await db.parcelas.delete(item.resourceId);
          await db.parcelas.put({ ...res.data, createdAt: typeof res.data.createdAt === "string" ? res.data.createdAt : new Date().toISOString() });
        } else if (item.op === "update") {
          await fetch(`${BASE}/api/parcelas/${resolvedId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item.payload),
          }).then((r) => handleResponse<{ data: api.ParcelaItem }>(r));
          const updated = await api.parcelasApi.get(resolvedId);
          await db.parcelas.put({ ...updated.data, createdAt: typeof updated.data.createdAt === "string" ? updated.data.createdAt : new Date().toISOString() });
        } else if (item.op === "delete") {
          await fetch(`${BASE}/api/parcelas/${resolvedId}`, { method: "DELETE" });
          await db.labores.where("parcelaId").equals(resolvedId).delete();
          await db.parcelas.delete(resolvedId);
        }
      } else if (item.entity === "labor") {
        const parcelaId = (item.payload.parcelaId as string) || item.resourceId;
        const realParcelaId = tempToReal[parcelaId] ?? parcelaId;
        if (item.op === "create") {
          const body = {
            parcelaId: realParcelaId,
            tipo: item.payload.tipo as string,
            fecha: item.payload.fecha as string,
            descripcion: item.payload.descripcion as string,
            producto: item.payload.producto as string | undefined,
            cantidad: item.payload.cantidad as string | undefined,
          };
          const res = await fetch(`${BASE}/api/labores`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }).then((r) => handleResponse<{ data: api.LaborItem }>(r));
          tempToReal[item.resourceId] = res.data.id;
          await db.labores.delete(item.resourceId);
          await db.labores.put({
            ...res.data,
            fecha: typeof res.data.fecha === "string" ? res.data.fecha : new Date((res.data.fecha as unknown) as number).toISOString().slice(0, 10),
            createdAt: typeof res.data.createdAt === "string" ? res.data.createdAt : new Date().toISOString(),
          });
        } else if (item.op === "update") {
          await fetch(`${BASE}/api/labores/${resolvedId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item.payload),
          }).then((r) => handleResponse<{ data: api.LaborItem }>(r));
          const updated = await api.laboresApi.get(resolvedId);
          await db.labores.put({
            ...updated.data,
            fecha: typeof updated.data.fecha === "string" ? updated.data.fecha : new Date((updated.data.fecha as unknown) as number).toISOString().slice(0, 10),
            createdAt: typeof updated.data.createdAt === "string" ? updated.data.createdAt : new Date().toISOString(),
          });
        } else if (item.op === "delete") {
          await fetch(`${BASE}/api/labores/${resolvedId}`, { method: "DELETE" });
          await db.labores.delete(resolvedId);
        }
      }
      await db.syncQueue.delete(item.id);
    } catch (e) {
      console.warn("Sync queue item failed", item, e);
      // Dejar en cola para reintento
    }
  }
  await syncAllFromServer();
}

export function getSyncPendingCount(): Promise<number> {
  return db.syncQueue.count();
}

/** Fincas: offline-first */
export const fincasApi = {
  list: async (params?: { page?: number; pageSize?: number }): Promise<PaginatedFincas> => {
    const page = Math.max(1, params?.page ?? 1);
    const pageSize = Math.max(1, params?.pageSize ?? 10);
    if (isOnline()) {
      try {
        const res = await api.fincasApi.list(params);
        for (const f of res.data) {
          await db.fincas.put({ ...f, createdAt: typeof f.createdAt === "string" ? f.createdAt : new Date().toISOString() });
        }
        return res;
      } catch {
        // Fallback a local
      }
    }
    const all = await db.fincas.orderBy("createdAt").reverse().toArray();
    const start = (page - 1) * pageSize;
    const data = all.slice(start, start + pageSize);
    return { data, total: all.length, page, pageSize, totalPages: Math.ceil(all.length / pageSize) || 1 };
  },
  get: async (id: string): Promise<{ data: FincaItem }> => {
    if (isOnline()) {
      try {
        const res = await api.fincasApi.get(id);
        await db.fincas.put({ ...res.data, createdAt: typeof res.data.createdAt === "string" ? res.data.createdAt : new Date().toISOString() });
        return res;
      } catch {
        // Fallback
      }
    }
    const local = await db.fincas.get(id);
    if (!local) throw new Error("Finca no encontrada");
    return { data: local };
  },
  create: async (body: { nombre: string; ubicacion?: string; superficie?: number; notas?: string; referenciaCatastral?: string }): Promise<{ data: FincaItem }> => {
    const id = tempId();
    const now = new Date().toISOString();
    const newFinca: FincaItem = {
      id,
      nombre: body.nombre,
      ubicacion: body.ubicacion ?? null,
      superficie: body.superficie ?? null,
      notas: body.notas ?? null,
      referenciaCatastral: body.referenciaCatastral ?? null,
      createdAt: now,
    };
    if (isOnline()) {
      try {
        const res = await api.fincasApi.create(body);
        await db.fincas.put({ ...res.data, createdAt: typeof res.data.createdAt === "string" ? res.data.createdAt : now });
        return res;
      } catch (e) {
        throw e;
      }
    }
    await db.fincas.put(newFinca);
    const queueItem: SyncQueueItem = {
      id: tempId(),
      entity: "finca",
      op: "create",
      resourceId: id,
      payload: body,
      createdAt: Date.now(),
    };
    await db.syncQueue.add(queueItem);
    return { data: newFinca };
  },
  update: async (id: string, body: { nombre?: string; ubicacion?: string; superficie?: number; notas?: string; referenciaCatastral?: string }): Promise<{ data: FincaItem }> => {
    if (isOnline()) {
      try {
        const res = await api.fincasApi.update(id, body);
        await db.fincas.put({ ...res.data, createdAt: typeof res.data.createdAt === "string" ? res.data.createdAt : new Date().toISOString() });
        return res;
      } catch (e) {
        throw e;
      }
    }
    const existing = await db.fincas.get(id);
    if (!existing) throw new Error("Finca no encontrada");
    const updated = { ...existing, ...body };
    await db.fincas.put(updated);
    await db.syncQueue.add({
      id: tempId(),
      entity: "finca",
      op: "update",
      resourceId: id,
      payload: body,
      createdAt: Date.now(),
    });
    return { data: updated };
  },
  delete: async (id: string): Promise<{ ok: boolean }> => {
    if (isOnline()) {
      try {
        const res = await api.fincasApi.delete(id);
        await db.fincas.delete(id);
        await db.parcelas.where("fincaId").equals(id).delete();
        await db.labores.where("parcelaId").anyOf(await db.parcelas.where("fincaId").equals(id).primaryKeys()).delete();
        return res;
      } catch (e) {
        throw e;
      }
    }
    await db.fincas.delete(id);
    await db.parcelas.where("fincaId").equals(id).delete();
    const laborParcelaIds = await db.parcelas.where("fincaId").equals(id).primaryKeys();
    for (const pid of laborParcelaIds) await db.labores.where("parcelaId").equals(pid).delete();
    await db.syncQueue.add({
      id: tempId(),
      entity: "finca",
      op: "delete",
      resourceId: id,
      payload: {},
      createdAt: Date.now(),
    });
    return { ok: true };
  },
};

/** Parcelas: offline-first */
export const parcelasApi = {
  list: async (params?: { fincaId?: string; page?: number; pageSize?: number }): Promise<PaginatedParcelas> => {
    const page = Math.max(1, params?.page ?? 1);
    const pageSize = Math.max(1, params?.pageSize ?? 10);
    if (isOnline()) {
      try {
        const res = params?.fincaId
          ? await api.parcelasApi.listByFinca(params.fincaId, { page, pageSize })
          : await api.parcelasApi.list(params);
        for (const p of res.data) {
          await db.parcelas.put({ ...p, createdAt: typeof p.createdAt === "string" ? p.createdAt : new Date().toISOString() });
        }
        return res;
      } catch {
        // Fallback
      }
    }
    const all = params?.fincaId
      ? await db.parcelas.where("fincaId").equals(params.fincaId).toArray()
      : await db.parcelas.orderBy("createdAt").reverse().toArray();
    if (params?.fincaId) all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const start = (page - 1) * pageSize;
    const data = all.slice(start, start + pageSize);
    return { data, total: all.length, page, pageSize, totalPages: Math.ceil(all.length / pageSize) || 1 };
  },
  listByFinca: async (fincaId: string, params?: { page?: number; pageSize?: number }): Promise<PaginatedParcelas> => {
    return parcelasApi.list({ ...params, fincaId });
  },
  get: async (id: string): Promise<{ data: ParcelaItem & { finca?: { id: string; nombre: string } } }> => {
    if (isOnline()) {
      try {
        const res = await api.parcelasApi.get(id);
        await db.parcelas.put({ ...res.data, createdAt: typeof res.data.createdAt === "string" ? res.data.createdAt : new Date().toISOString() });
        return res;
      } catch {
        // Fallback
      }
    }
    const local = await db.parcelas.get(id);
    if (!local) throw new Error("Parcela no encontrada");
    return { data: local };
  },
  create: async (fincaId: string, body: { nombre: string; cultivo?: string; superficie?: number; notas?: string; referenciaCatastral?: string }): Promise<{ data: ParcelaItem }> => {
    const id = tempId();
    const now = new Date().toISOString();
    const newParcela: ParcelaItem = {
      id,
      fincaId,
      nombre: body.nombre,
      cultivo: body.cultivo ?? null,
      superficie: body.superficie ?? null,
      notas: body.notas ?? null,
      referenciaCatastral: body.referenciaCatastral ?? null,
      lat: (body as any).lat ?? null,
      lon: (body as any).lon ?? null,
      createdAt: now,
    };
    if (isOnline()) {
      try {
        const res = await api.parcelasApi.create(fincaId, body);
        await db.parcelas.put({ ...res.data, createdAt: typeof res.data.createdAt === "string" ? res.data.createdAt : now });
        return res;
      } catch (e) {
        throw e;
      }
    }
    await db.parcelas.put(newParcela);
    await db.syncQueue.add({
      id: tempId(),
      entity: "parcela",
      op: "create",
      resourceId: id,
      fincaId,
      payload: { ...body, fincaId },
      createdAt: Date.now(),
    });
    return { data: newParcela };
  },
  update: async (id: string, body: { nombre?: string; cultivo?: string; superficie?: number; notas?: string; referenciaCatastral?: string; lat?: number; lon?: number }): Promise<{ data: ParcelaItem }> => {
    if (isOnline()) {
      try {
        const res = await api.parcelasApi.update(id, body);
        await db.parcelas.put({ ...res.data, createdAt: typeof res.data.createdAt === "string" ? res.data.createdAt : new Date().toISOString() });
        return res;
      } catch (e) {
        throw e;
      }
    }
    const existing = await db.parcelas.get(id);
    if (!existing) throw new Error("Parcela no encontrada");
    const updated = { ...existing, ...body };
    await db.parcelas.put(updated);
    await db.syncQueue.add({
      id: tempId(),
      entity: "parcela",
      op: "update",
      resourceId: id,
      payload: body,
      createdAt: Date.now(),
    });
    return { data: updated };
  },
  delete: async (id: string): Promise<{ ok: boolean }> => {
    if (isOnline()) {
      try {
        const res = await api.parcelasApi.delete(id);
        await db.parcelas.delete(id);
        await db.labores.where("parcelaId").equals(id).delete();
        return res;
      } catch (e) {
        throw e;
      }
    }
    await db.parcelas.delete(id);
    await db.labores.where("parcelaId").equals(id).delete();
    await db.syncQueue.add({
      id: tempId(),
      entity: "parcela",
      op: "delete",
      resourceId: id,
      payload: {},
      createdAt: Date.now(),
    });
    return { ok: true };
  },
};

/** Labores: offline-first */
function laborMatchesFilter(
  l: { parcelaId: string; tipo: string; fecha: string },
  params?: LaboresListParams
): boolean {
  if (params?.parcelaId && l.parcelaId !== params.parcelaId) return false;
  if (params?.tipo && l.tipo !== params.tipo) return false;
  if (params?.desde && l.fecha < params.desde) return false;
  if (params?.hasta && l.fecha > params.hasta) return false;
  return true;
}

export const laboresApi = {
  list: async (params?: LaboresListParams): Promise<PaginatedLabores> => {
    const page = Math.max(1, params?.page ?? 1);
    const pageSize = Math.max(1, params?.pageSize ?? 10);
    if (isOnline()) {
      try {
        const res = await api.laboresApi.list(params);
        for (const l of res.data) {
          await db.labores.put({
            ...l,
            fecha: typeof l.fecha === "string" ? l.fecha : new Date((l.fecha as unknown) as number).toISOString().slice(0, 10),
            createdAt: typeof l.createdAt === "string" ? l.createdAt : new Date().toISOString(),
          });
        }
        return res;
      } catch {
        // Fallback
      }
    }
    let all = await db.labores.orderBy("createdAt").reverse().toArray();
    if (params?.fincaId) {
      const parcelaIds = await db.parcelas.where("fincaId").equals(params.fincaId).primaryKeys();
      all = all.filter((l) => parcelaIds.includes(l.parcelaId));
    }
    all = all.filter((l) => laborMatchesFilter(l, params));
    const start = (page - 1) * pageSize;
    const data = all.slice(start, start + pageSize);
    return { data, total: all.length, page, pageSize, totalPages: Math.ceil(all.length / pageSize) || 1 };
  },
  get: async (id: string): Promise<{ data: LaborItem }> => {
    if (isOnline()) {
      try {
        const res = await api.laboresApi.get(id);
        await db.labores.put({
          ...res.data,
          fecha: typeof res.data.fecha === "string" ? res.data.fecha : new Date((res.data.fecha as unknown) as number).toISOString().slice(0, 10),
          createdAt: typeof res.data.createdAt === "string" ? res.data.createdAt : new Date().toISOString(),
        });
        return res;
      } catch {
        // Fallback
      }
    }
    const local = await db.labores.get(id);
    if (!local) throw new Error("Labor no encontrada");
    return { data: local };
  },
  create: async (body: { parcelaId: string; tipo: string; fecha: string; descripcion: string; producto?: string; cantidad?: string }): Promise<{ data: LaborItem }> => {
    const id = tempId();
    const now = new Date().toISOString();
    const newLabor: LaborItem = {
      id,
      parcelaId: body.parcelaId,
      tipo: body.tipo,
      fecha: body.fecha,
      descripcion: body.descripcion,
      producto: body.producto ?? null,
      cantidad: body.cantidad ?? null,
      createdAt: now,
    };
    if (isOnline()) {
      try {
        const res = await api.laboresApi.create(body);
        await db.labores.put({
          ...res.data,
          fecha: typeof res.data.fecha === "string" ? res.data.fecha : res.data.fecha.slice(0, 10),
          createdAt: typeof res.data.createdAt === "string" ? res.data.createdAt : now,
        });
        return res;
      } catch (e) {
        throw e;
      }
    }
    await db.labores.put(newLabor);
    await db.syncQueue.add({
      id: tempId(),
      entity: "labor",
      op: "create",
      resourceId: id,
      payload: { ...body },
      createdAt: Date.now(),
    });
    return { data: newLabor };
  },
  update: async (
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
  ): Promise<{ data: LaborItem }> => {
    if (isOnline()) {
      try {
        const res = await api.laboresApi.update(id, body);
        await db.labores.put({
          ...res.data,
          fecha: typeof res.data.fecha === "string" ? res.data.fecha : new Date((res.data.fecha as unknown) as number).toISOString().slice(0, 10),
          createdAt: typeof res.data.createdAt === "string" ? res.data.createdAt : new Date().toISOString(),
        });
        return res;
      } catch (e) {
        throw e;
      }
    }
    const existing = await db.labores.get(id);
    if (!existing) throw new Error("Labor no encontrada");
    const estado = body.estado ?? existing.estado ?? "pendiente";
    const realizadaAt =
      estado === "realizada" ? new Date().toISOString() : body.estado === "pendiente" ? null : existing.realizadaAt ?? null;
    const lat = body.estado === "pendiente" ? null : body.lat !== undefined ? body.lat : existing.lat ?? null;
    const lon = body.estado === "pendiente" ? null : body.lon !== undefined ? body.lon : existing.lon ?? null;
    const updated: LaborItem = {
      ...existing,
      ...body,
      estado,
      realizadaAt,
      lat,
      lon,
    };
    await db.labores.put(updated);
    await db.syncQueue.add({
      id: tempId(),
      entity: "labor",
      op: "update",
      resourceId: id,
      payload: body,
      createdAt: Date.now(),
    });
    return { data: updated };
  },
  delete: async (id: string): Promise<{ ok: boolean }> => {
    if (isOnline()) {
      try {
        const res = await api.laboresApi.delete(id);
        await db.labores.delete(id);
        return res;
      } catch (e) {
        throw e;
      }
    }
    await db.labores.delete(id);
    await db.syncQueue.add({
      id: tempId(),
      entity: "labor",
      op: "delete",
      resourceId: id,
      payload: {},
      createdAt: Date.now(),
    });
    return { ok: true };
  },
};

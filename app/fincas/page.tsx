"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fincasApi, type FincaItem, type PaginatedFincas } from "@/lib/offline-api";

const PAGE_SIZE = 10;

export default function FincasPage() {
  const [result, setResult] = useState<PaginatedFincas | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fincasApi
      .list({ page, pageSize: PAGE_SIZE })
      .then(setResult)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [page]);

  const handleDelete = (id: string, nombre: string) => {
    if (!window.confirm(`¿Eliminar la finca "${nombre}" y todas sus parcelas y datos?`)) return;
    fincasApi
      .delete(id)
      .then(() => load())
      .catch((e) => setError(e.message));
  };

  if (error) {
    return (
      <div className="card text-red-600">
        <p>{error}</p>
        <button type="button" onClick={() => { setError(null); load(); }} className="btn-secondary mt-2">
          Reintentar
        </button>
      </div>
    );
  }

  const fincas = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-tierra-800">Mis Fincas</h2>
        <Link href="/fincas/nueva" className="btn-primary">
          + Nueva finca
        </Link>
      </div>

      {loading && !result ? (
        <div className="card py-8 text-center text-tierra-600">Cargando…</div>
      ) : fincas.length === 0 ? (
        <div className="card text-center py-12 text-tierra-600">
          <p className="mb-4">Aún no tienes ninguna finca registrada.</p>
          <Link href="/fincas/nueva" className="btn-primary">
            Registrar primera finca
          </Link>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {fincas.map((f: FincaItem) => (
              <li key={f.id}>
                <div className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/fincas/${f.id}`}
                      className="font-medium text-verde-800 hover:underline block truncate"
                    >
                      {f.nombre}
                    </Link>
                    {f.ubicacion && (
                      <p className="text-sm text-tierra-600 truncate">{f.ubicacion}</p>
                    )}
                    {f.superficie != null && (
                      <p className="text-sm text-tierra-500">{f.superficie} ha</p>
                    )}
                    <p className="text-sm text-tierra-500">
                      {(f as FincaItem & { parcelasCount?: number }).parcelasCount ?? 0} parcela(s)
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link href={`/fincas/${f.id}/editar`} className="btn-ghost text-sm">
                      Editar
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(f.id, f.nombre)}
                      className="btn-ghost text-sm text-red-600 hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <div className="flex items-center justify-between card">
              <p className="text-sm text-tierra-600">
                Total: {total} finca(s) · Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="btn-ghost text-sm disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="btn-ghost text-sm disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

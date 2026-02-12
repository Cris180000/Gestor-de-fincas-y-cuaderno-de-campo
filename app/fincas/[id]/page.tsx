"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fincasApi, parcelasApi, type FincaItem, type ParcelaItem, type PaginatedParcelas } from "@/lib/offline-api";

const PAGE_SIZE = 10;

export default function FincaDetallePage() {
  const params = useParams();
  const id = params.id as string;
  const [finca, setFinca] = useState<FincaItem | null>(null);
  const [parcelasResult, setParcelasResult] = useState<PaginatedParcelas | null>(null);
  const [parcelaPage, setParcelaPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFinca = () => {
    fincasApi.get(id).then((r) => setFinca(r.data)).catch((e) => setError(e.message));
  };

  const loadParcelas = () => {
    parcelasApi.listByFinca(id, { page: parcelaPage, pageSize: PAGE_SIZE }).then(setParcelasResult).catch(() => {});
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    fincasApi
      .get(id)
      .then((r) => {
        setFinca(r.data);
        return parcelasApi.listByFinca(id, { page: 1, pageSize: PAGE_SIZE });
      })
      .then(setParcelasResult)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!finca) return;
    parcelasApi.listByFinca(id, { page: parcelaPage, pageSize: PAGE_SIZE }).then(setParcelasResult);
  }, [id, finca, parcelaPage]);

  if (error) {
    return (
      <div className="card text-red-600">
        <p>{error}</p>
        <Link href="/fincas" className="btn-secondary mt-2 inline-block">Volver a fincas</Link>
      </div>
    );
  }

  if (loading || !finca) {
    return <div className="card py-8 text-center text-tierra-600">Cargando…</div>;
  }

  const parcelas = parcelasResult?.data ?? [];
  const totalParcelas = parcelasResult?.total ?? 0;
  const totalPages = parcelasResult?.totalPages ?? 0;
  const fincaData = finca as FincaItem & { parcelasCount?: number };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h2 className="text-xl font-semibold text-tierra-800">{finca.nombre}</h2>
          {finca.ubicacion && <p className="text-tierra-600">{finca.ubicacion}</p>}
          {finca.superficie != null && <p className="text-sm text-tierra-500">{finca.superficie} ha</p>}
          {finca.referenciaCatastral && (
            <p className="text-sm text-tierra-500 font-mono">Ref. catastral: {finca.referenciaCatastral}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/fincas/${id}/editar`} className="btn-secondary">Editar</Link>
          <Link href={`/fincas/${id}/parcelas/nueva`} className="btn-primary">+ Parcela</Link>
        </div>
      </div>

      {finca.notas && (
        <div className="card">
          <h3 className="text-sm font-medium text-tierra-600 mb-1">Notas</h3>
          <p className="text-tierra-800 whitespace-pre-wrap">{finca.notas}</p>
        </div>
      )}

      <section>
        <h3 className="text-lg font-semibold text-tierra-800 mb-3">
          Parcelas {totalParcelas > 0 && `(${totalParcelas})`}
        </h3>
        {parcelas.length === 0 ? (
          <div className="card text-center py-8 text-tierra-600">
            <p className="mb-4">No hay parcelas en esta finca.</p>
            <Link href={`/fincas/${id}/parcelas/nueva`} className="btn-primary">
              Añadir parcela
            </Link>
          </div>
        ) : (
          <>
            <ul className="space-y-2">
              {parcelas.map((p: ParcelaItem) => (
                <li key={p.id}>
                  <Link
                    href={`/parcelas/${p.id}`}
                    className="card flex justify-between items-center hover:border-verde-400 transition block"
                  >
                    <span className="font-medium">{p.nombre}</span>
                    {p.superficie != null && (
                      <span className="text-sm text-tierra-500">{p.superficie} ha</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-3">
                <p className="text-sm text-tierra-600">
                  Página {parcelaPage} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={parcelaPage <= 1}
                    onClick={() => setParcelaPage((p) => p - 1)}
                    className="btn-ghost text-sm disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    disabled={parcelaPage >= totalPages}
                    onClick={() => setParcelaPage((p) => p + 1)}
                    className="btn-ghost text-sm disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

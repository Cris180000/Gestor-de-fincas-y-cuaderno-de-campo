"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getStore, deleteCultivo } from "@/lib/store";
import type { Cultivo as CultivoType, Parcela, Finca } from "@/lib/types";

export default function CultivoDetallePage() {
  const params = useParams();
  const id = params.id as string;
  const [store, setStore] = useState(getStore());

  const refresh = () => setStore(getStore());
  useEffect(refresh, []);

  const cultivo = store.cultivos.find((c: CultivoType) => c.id === id);
  const parcela = cultivo ? store.parcelas.find((p: Parcela) => p.id === cultivo.parcelaId) : null;
  const finca = parcela ? store.fincas.find((f: Finca) => f.id === parcela.fincaId) : null;

  const laboresParcela = (store.labores ?? []).filter((l) => l.parcelaId === cultivo?.parcelaId);
  const numRiegos = laboresParcela.filter((l) => l.tipo === "riego").length;
  const numAbonados = laboresParcela.filter((l) => l.tipo === "abonado").length;
  const numTratamientos = laboresParcela.filter((l) => l.tipo === "tratamiento").length;

  const handleDelete = () => {
    if (!cultivo) return;
    if (window.confirm(`¿Eliminar el cultivo "${cultivo.nombre}"?`)) {
      deleteCultivo(id);
      window.location.href = `/parcelas/${cultivo.parcelaId}`;
    }
  };

  if (!cultivo) {
    return (
      <div className="card text-center py-8">
        <p className="text-tierra-600 mb-4">Cultivo no encontrado.</p>
        <Link href="/fincas" className="btn-primary">Ver fincas</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <p className="text-sm text-tierra-500">
            <Link href={`/fincas/${parcela?.fincaId}`} className="hover:underline">{finca?.nombre}</Link>
            {" · "}
            <Link href={`/parcelas/${cultivo.parcelaId}`} className="hover:underline">{parcela?.nombre}</Link>
          </p>
          <h2 className="text-xl font-semibold text-tierra-800">{cultivo.nombre}</h2>
          {cultivo.variedad && (
            <p className="text-tierra-600">Variedad: {cultivo.variedad}</p>
          )}
          <p className="text-sm text-tierra-500">
            Plantación: {cultivo.fechaPlantacion} · Estado: {cultivo.estado}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/cultivos/${id}/editar`} className="btn-secondary">Editar</Link>
          <button type="button" onClick={handleDelete} className="btn-ghost text-red-600 hover:bg-red-50">
            Eliminar
          </button>
        </div>
      </div>

      {cultivo.notas && (
        <div className="card">
          <h3 className="text-sm font-medium text-tierra-600 mb-1">Notas</h3>
          <p className="text-tierra-800 whitespace-pre-wrap">{cultivo.notas}</p>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-3">
        <Link href={`/labores?parcela=${cultivo.parcelaId}&tipo=riego`} className="card hover:border-verde-400">
          <span className="text-2xl font-display font-semibold text-verde-700">{numRiegos}</span>
          <span className="text-sm text-tierra-600">Riegos</span>
        </Link>
        <Link href={`/labores?parcela=${cultivo.parcelaId}&tipo=abonado`} className="card hover:border-verde-400">
          <span className="text-2xl font-display font-semibold text-verde-700">{numAbonados}</span>
          <span className="text-sm text-tierra-600">Abonados</span>
        </Link>
        <Link href={`/labores?parcela=${cultivo.parcelaId}&tipo=tratamiento`} className="card hover:border-verde-400">
          <span className="text-2xl font-display font-semibold text-verde-700">{numTratamientos}</span>
          <span className="text-sm text-tierra-600">Tratamientos</span>
        </Link>
      </div>

      <Link href={`/incidencias?parcela=${cultivo.parcelaId}`} className="btn-ghost block w-fit">
        Ver incidencias de esta parcela
      </Link>
    </div>
  );
}

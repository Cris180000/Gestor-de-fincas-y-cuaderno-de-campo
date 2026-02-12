"use client";

import { useState } from "react";
import { getStore, addAbonado, deleteAbonado } from "@/lib/store";
import type { Store, Abonado as AbonadoType, Parcela, Finca } from "@/lib/types";

const TIPOS = ["orgánico", "mineral", "foliar", "otro"];

export function AbonadosList({
  store,
  parcelaId,
  refresh,
}: {
  store: Store;
  parcelaId?: string;
  refresh: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [producto, setProducto] = useState("");
  const [dosis, setDosis] = useState("");
  const [tipo, setTipo] = useState("");
  const [parcelaSel, setParcelaSel] = useState(parcelaId || "");
  const [notas, setNotas] = useState("");

  let abonados = store.abonados;
  if (parcelaId) abonados = abonados.filter((a) => a.parcelaId === parcelaId);
  abonados = [...abonados].sort((a, b) => (b.fecha > a.fecha ? 1 : -1));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pid = parcelaId || parcelaSel;
    if (!pid) return;
    addAbonado({
      parcelaId: pid,
      fecha,
      producto: producto.trim(),
      dosis: dosis.trim() || undefined,
      tipo: tipo || undefined,
      notas: notas.trim() || undefined,
    });
    setShowForm(false);
    setProducto("");
    setDosis("");
    setNotas("");
    refresh();
  };

  const getParcelaName = (pId: string) => {
    const p = store.parcelas.find((x: Parcela) => x.id === pId);
    if (!p) return pId;
    const f = store.fincas.find((x: Finca) => x.id === p.fincaId);
    return f ? `${f.nombre} – ${p.nombre}` : p.nombre;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? "Cerrar" : "+ Nuevo abonado"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-3">
          <h3 className="font-medium text-tierra-800">Nuevo abonado</h3>
          {!parcelaId && (
            <div>
              <label className="label">Parcela *</label>
              <select
                className="input"
                value={parcelaSel}
                onChange={(e) => setParcelaSel(e.target.value)}
                required
              >
                <option value="">Seleccionar</option>
                {store.parcelas.map((p: Parcela) => (
                  <option key={p.id} value={p.id}>{getParcelaName(p.id)}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label">Fecha *</label>
            <input
              type="date"
              className="input"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Producto *</label>
            <input
              type="text"
              className="input"
              value={producto}
              onChange={(e) => setProducto(e.target.value)}
              placeholder="Nombre del abono"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Dosis</label>
              <input
                type="text"
                className="input"
                value={dosis}
                onChange={(e) => setDosis(e.target.value)}
                placeholder="Ej. 200 kg/ha"
              />
            </div>
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="">—</option>
                {TIPOS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Notas</label>
            <input type="text" className="input" value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary">Guardar abonado</button>
        </form>
      )}

      {abonados.length === 0 ? (
        <div className="card text-center py-8 text-tierra-600">
          No hay abonados registrados{parcelaId ? " en esta parcela" : ""}.
        </div>
      ) : (
        <ul className="space-y-2">
          {abonados.map((a: AbonadoType) => (
            <li key={a.id}>
              <div className="card flex flex-wrap justify-between items-center gap-2">
                <div>
                  <span className="font-medium">{a.fecha}</span>
                  <span className="font-medium text-tierra-800 ml-2">{a.producto}</span>
                  {!parcelaId && (
                    <span className="text-sm text-tierra-500 ml-2">{getParcelaName(a.parcelaId)}</span>
                  )}
                  {a.dosis && <span className="text-sm text-tierra-600 block">{a.dosis}</span>}
                  {a.tipo && <span className="text-sm text-tierra-500">Tipo: {a.tipo}</span>}
                  {a.notas && <p className="text-sm text-tierra-500 mt-1">{a.notas}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("¿Eliminar este abonado?")) {
                      deleteAbonado(a.id);
                      refresh();
                    }
                  }}
                  className="btn-ghost text-sm text-red-600"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

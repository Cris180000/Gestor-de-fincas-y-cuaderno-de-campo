"use client";

import { useState } from "react";
import Link from "next/link";
import { getStore, addRiego, deleteRiego } from "@/lib/store";
import type { Store, Riego as RiegoType, Parcela, Finca } from "@/lib/types";

const TIPOS = ["goteo", "aspersión", "manta", "manual", "otro"];
const UNIDADES = ["m³", "L", "minutos", "horas"];

export function RiegosList({
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
  const [cantidad, setCantidad] = useState("");
  const [unidad, setUnidad] = useState<"m³" | "L" | "minutos" | "horas">("m³");
  const [tipo, setTipo] = useState("");
  const [parcelaSel, setParcelaSel] = useState(parcelaId || "");
  const [notas, setNotas] = useState("");

  let riegos = store.riegos;
  if (parcelaId) riegos = riegos.filter((r) => r.parcelaId === parcelaId);
  riegos = [...riegos].sort((a, b) => (b.fecha > a.fecha ? 1 : -1));

  const parcelas = parcelaId ? store.parcelas.filter((p) => p.id === parcelaId) : store.parcelas;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pid = parcelaId || parcelaSel;
    if (!pid) return;
    addRiego({
      parcelaId: pid,
      fecha,
      cantidad: cantidad.trim() || undefined,
      unidad: cantidad ? unidad : undefined,
      tipo: tipo || undefined,
      notas: notas.trim() || undefined,
    });
    setShowForm(false);
    setCantidad("");
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
          {showForm ? "Cerrar" : "+ Nuevo riego"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-3">
          <h3 className="font-medium text-tierra-800">Nuevo riego</h3>
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
          <div className="grid grid-cols-2 gap-3">
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
              <label className="label">Cantidad</label>
              <input
                type="text"
                className="input"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                placeholder="Ej. 50"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Unidad</label>
              <select className="input" value={unidad} onChange={(e) => setUnidad(e.target.value as "m³" | "L" | "minutos" | "horas")}>
                {UNIDADES.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
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
          <button type="submit" className="btn-primary">Guardar riego</button>
        </form>
      )}

      {riegos.length === 0 ? (
        <div className="card text-center py-8 text-tierra-600">
          No hay riegos registrados{parcelaId ? " en esta parcela" : ""}.
        </div>
      ) : (
        <ul className="space-y-2">
          {riegos.map((r: RiegoType) => (
            <li key={r.id}>
              <div className="card flex flex-wrap justify-between items-center gap-2">
                <div>
                  <span className="font-medium">{r.fecha}</span>
                  {!parcelaId && (
                    <span className="text-sm text-tierra-500 ml-2">{getParcelaName(r.parcelaId)}</span>
                  )}
                  {r.cantidad && (
                    <span className="text-sm text-tierra-600 ml-2">{r.cantidad} {r.unidad}</span>
                  )}
                  {r.tipo && (
                    <span className="text-sm text-tierra-500 ml-2">· {r.tipo}</span>
                  )}
                  {r.notas && <p className="text-sm text-tierra-500 mt-1">{r.notas}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("¿Eliminar este riego?")) {
                      deleteRiego(r.id);
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

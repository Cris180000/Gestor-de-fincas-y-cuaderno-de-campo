"use client";

import { useState } from "react";
import { getStore, addTratamiento, deleteTratamiento } from "@/lib/store";
import type { Store, Tratamiento as TratamientoType, Parcela, Finca } from "@/lib/types";

export function TratamientosList({
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
  const [objetivo, setObjetivo] = useState("");
  const [plagaEnfermedad, setPlagaEnfermedad] = useState("");
  const [dosis, setDosis] = useState("");
  const [parcelaSel, setParcelaSel] = useState(parcelaId || "");
  const [notas, setNotas] = useState("");

  let tratamientos = store.tratamientos;
  if (parcelaId) tratamientos = tratamientos.filter((t) => t.parcelaId === parcelaId);
  tratamientos = [...tratamientos].sort((a, b) => (b.fecha > a.fecha ? 1 : -1));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pid = parcelaId || parcelaSel;
    if (!pid) return;
    addTratamiento({
      parcelaId: pid,
      fecha,
      producto: producto.trim(),
      objetivo: objetivo.trim() || undefined,
      plagaEnfermedad: plagaEnfermedad.trim() || undefined,
      dosis: dosis.trim() || undefined,
      notas: notas.trim() || undefined,
    });
    setShowForm(false);
    setProducto("");
    setObjetivo("");
    setPlagaEnfermedad("");
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
          {showForm ? "Cerrar" : "+ Nuevo tratamiento"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-3">
          <h3 className="font-medium text-tierra-800">Nuevo tratamiento</h3>
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
              placeholder="Nombre del producto fitosanitario"
              required
            />
          </div>
          <div>
            <label className="label">Plaga / Enfermedad</label>
            <input
              type="text"
              className="input"
              value={plagaEnfermedad}
              onChange={(e) => setPlagaEnfermedad(e.target.value)}
              placeholder="Ej. Pulgón, Mildiu"
            />
          </div>
          <div>
            <label className="label">Objetivo / Tipo</label>
            <input
              type="text"
              className="input"
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
              placeholder="Ej. Insecticida, Fungicida"
            />
          </div>
          <div>
            <label className="label">Dosis</label>
            <input
              type="text"
              className="input"
              value={dosis}
              onChange={(e) => setDosis(e.target.value)}
              placeholder="Ej. 0.5 L/ha"
            />
          </div>
          <div>
            <label className="label">Notas</label>
            <input type="text" className="input" value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary">Guardar tratamiento</button>
        </form>
      )}

      {tratamientos.length === 0 ? (
        <div className="card text-center py-8 text-tierra-600">
          No hay tratamientos registrados{parcelaId ? " en esta parcela" : ""}.
        </div>
      ) : (
        <ul className="space-y-2">
          {tratamientos.map((t: TratamientoType) => (
            <li key={t.id}>
              <div className="card flex flex-wrap justify-between items-center gap-2">
                <div>
                  <span className="font-medium">{t.fecha}</span>
                  <span className="font-medium text-tierra-800 ml-2">{t.producto}</span>
                  {!parcelaId && (
                    <span className="text-sm text-tierra-500 ml-2">{getParcelaName(t.parcelaId)}</span>
                  )}
                  {t.plagaEnfermedad && (
                    <span className="text-sm text-tierra-600 block">Objetivo: {t.plagaEnfermedad}</span>
                  )}
                  {t.dosis && <span className="text-sm text-tierra-500">{t.dosis}</span>}
                  {t.notas && <p className="text-sm text-tierra-500 mt-1">{t.notas}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("¿Eliminar este tratamiento?")) {
                      deleteTratamiento(t.id);
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

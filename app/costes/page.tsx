"use client";

import { useCallback, useEffect, useState } from "react";
import { costesApi, fincasApi, parcelasApi } from "@/lib/api-client";
import type { CosteItem } from "@/lib/api-client";
import type { FincaItem } from "@/lib/api-client";
import type { ParcelaItem } from "@/lib/api-client";

const TIPOS = [
  { value: "directo", label: "Directo" },
  { value: "indirecto", label: "Indirecto" },
] as const;

const CATEGORIAS = [
  { value: "semillas", label: "Semillas" },
  { value: "fitosanitarios", label: "Fitosanitarios" },
  { value: "amortizacion", label: "Amortización maquinaria" },
  { value: "seguros", label: "Seguros" },
  { value: "otros", label: "Otros" },
] as const;

const PAGE_SIZE = 20;

function formatEuros(centimos: number): string {
  return (centimos / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

export default function CostesPage() {
  const [costes, setCostes] = useState<CosteItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [fincas, setFincas] = useState<FincaItem[]>([]);
  const [parcelas, setParcelas] = useState<ParcelaItem[]>([]);

  const [fincaId, setFincaId] = useState("");
  const [parcelaId, setParcelaId] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [tipoFilter, setTipoFilter] = useState("");

  const loadFincas = useCallback(() => {
    fincasApi.list({ pageSize: 200 }).then((r) => setFincas(r.data)).catch(() => setFincas([]));
  }, []);
  useEffect(loadFincas, [loadFincas]);

  useEffect(() => {
    if (!fincaId) {
      setParcelas([]);
      setParcelaId("");
      return;
    }
    parcelasApi.list({ fincaId, pageSize: 200 }).then((r) => setParcelas(r.data)).catch(() => setParcelas([]));
  }, [fincaId]);

  const loadCostes = useCallback(() => {
    setLoading(true);
    costesApi
      .list({
        page,
        pageSize: PAGE_SIZE,
        ...(fincaId && { fincaId }),
        ...(parcelaId && { parcelaId }),
        ...(desde && { desde }),
        ...(hasta && { hasta }),
        ...(tipoFilter && { tipo: tipoFilter }),
      })
      .then((r) => {
        setCostes(r.data);
        setTotal(r.total);
        setTotalPages(r.totalPages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, fincaId, parcelaId, desde, hasta, tipoFilter]);
  useEffect(loadCostes, [loadCostes]);

  const [showForm, setShowForm] = useState(false);
  const [formFincaId, setFormFincaId] = useState("");
  const [formParcelas, setFormParcelas] = useState<ParcelaItem[]>([]);
  const [formParcelaId, setFormParcelaId] = useState("");
  const [formFecha, setFormFecha] = useState(new Date().toISOString().slice(0, 10));
  const [formTipo, setFormTipo] = useState<"directo" | "indirecto">("directo");
  const [formCategoria, setFormCategoria] = useState("semillas");
  const [formConcepto, setFormConcepto] = useState("");
  const [formImporte, setFormImporte] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (formFincaId) {
      parcelasApi.list({ fincaId: formFincaId, pageSize: 200 }).then((r) => setFormParcelas(r.data)).catch(() => setFormParcelas([]));
    } else {
      setFormParcelas([]);
      setFormParcelaId("");
    }
  }, [formFincaId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const importeNum = parseFloat(formImporte.replace(",", "."));
    if (Number.isNaN(importeNum) || importeNum < 0) {
      setFormError("Introduzca un importe válido en euros.");
      return;
    }
    setFormError(null);
    setSaving(true);
    costesApi
      .create({
        fincaId: formFincaId || undefined,
        parcelaId: formParcelaId || undefined,
        fecha: formFecha,
        tipo: formTipo,
        categoria: formCategoria,
        concepto: formConcepto.trim(),
        importe: importeNum,
      })
      .then(() => {
        setShowForm(false);
        setFormConcepto("");
        setFormImporte("");
        loadCostes();
      })
      .catch((err) => setFormError(err instanceof Error ? err.message : "Error al guardar"))
      .finally(() => setSaving(false));
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("¿Eliminar este coste?")) return;
    costesApi.delete(id).then(() => loadCostes()).catch(() => {});
  };

  const [resumen, setResumen] = useState<{ totalEuros: number; totalCentimos: number } | null>(null);
  const [produccionEsperada, setProduccionEsperada] = useState("");
  const [unidadProduccion, setUnidadProduccion] = useState("kg");

  useEffect(() => {
    const q: { fincaId?: string; parcelaId?: string; desde?: string; hasta?: string } = {};
    if (fincaId) q.fincaId = fincaId;
    if (parcelaId) q.parcelaId = parcelaId;
    if (desde) q.desde = desde;
    if (hasta) q.hasta = hasta;
    costesApi.resumen(q).then((r) => setResumen({ totalEuros: r.totalEuros, totalCentimos: r.totalCentimos })).catch(() => setResumen(null));
  }, [fincaId, parcelaId, desde, hasta]);

  const cantidadNum = parseFloat(produccionEsperada.replace(",", "."));
  const breakEven = cantidadNum > 0 && resumen ? resumen.totalEuros / cantidadNum : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-xl font-semibold text-tierra-800">Control de costes</h2>
        <button type="button" onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? "Cerrar" : "+ Imputar coste"}
        </button>
      </div>

      <section className="card space-y-4">
        <h3 className="font-semibold text-tierra-800">Punto de equilibrio (break-even)</h3>
        <p className="text-sm text-tierra-600">
          ¿A qué precio necesito vender mi cosecha para no perder dinero? Indique el periodo y la producción esperada.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="label">Finca</label>
            <select className="input" value={fincaId} onChange={(e) => setFincaId(e.target.value)}>
              <option value="">Todas</option>
              {fincas.map((f) => (
                <option key={f.id} value={f.id}>{f.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Parcela</label>
            <select className="input" value={parcelaId} onChange={(e) => setParcelaId(e.target.value)} disabled={!fincaId}>
              <option value="">Todas</option>
              {parcelas.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Desde</label>
            <input type="date" className="input" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input type="date" className="input" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-4 pt-2 border-t border-tierra-200">
          <div>
            <span className="text-sm text-tierra-600">Costes totales (periodo): </span>
            <span className="font-semibold text-tierra-800">
              {resumen != null ? formatEuros(resumen.totalCentimos) : "—"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-tierra-600">Producción esperada</label>
            <input
              type="text"
              inputMode="decimal"
              className="input w-28"
              placeholder="Ej. 10000"
              value={produccionEsperada}
              onChange={(e) => setProduccionEsperada(e.target.value)}
            />
            <select className="input w-24" value={unidadProduccion} onChange={(e) => setUnidadProduccion(e.target.value)}>
              <option value="kg">kg</option>
              <option value="L">L</option>
              <option value="t">t</option>
              <option value="unidad">ud</option>
            </select>
          </div>
          {breakEven != null && (
            <div className="bg-verde-50 border border-verde-200 rounded-lg px-4 py-2">
              <span className="text-sm text-verde-800">Precio mínimo de venta: </span>
              <strong className="text-verde-900">
                {breakEven.toLocaleString("es-ES", { minimumFractionDigits: 4, maximumFractionDigits: 4 })} €/{unidadProduccion}
              </strong>
            </div>
          )}
        </div>
      </section>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-3">
          <h3 className="font-medium text-tierra-800">Nuevo coste</h3>
          {formError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded">{formError}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Finca (opcional)</label>
              <select className="input" value={formFincaId} onChange={(e) => { setFormFincaId(e.target.value); setFormParcelaId(""); }}>
                <option value="">—</option>
                {fincas.map((f) => (
                  <option key={f.id} value={f.id}>{f.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Parcela (opcional)</label>
              <select className="input" value={formParcelaId} onChange={(e) => setFormParcelaId(e.target.value)} disabled={!formFincaId}>
                <option value="">—</option>
                {formParcelas.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Fecha *</label>
              <input type="date" className="input" value={formFecha} onChange={(e) => setFormFecha(e.target.value)} required />
            </div>
            <div>
              <label className="label">Tipo *</label>
              <select className="input" value={formTipo} onChange={(e) => setFormTipo(e.target.value as "directo" | "indirecto")}>
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Categoría *</label>
              <select className="input" value={formCategoria} onChange={(e) => setFormCategoria(e.target.value)}>
                {CATEGORIAS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Importe (€) *</label>
              <input
                type="text"
                inputMode="decimal"
                className="input"
                placeholder="0,00"
                value={formImporte}
                onChange={(e) => setFormImporte(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className="label">Concepto *</label>
            <input
              type="text"
              className="input"
              placeholder="Ej. Semilla trigo blando, Seguro multirriesgo"
              value={formConcepto}
              onChange={(e) => setFormConcepto(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Guardando…" : "Guardar coste"}
          </button>
        </form>
      )}

      <div className="card">
        <h3 className="font-medium text-tierra-800 mb-3">Filtros</h3>
        <div className="flex flex-wrap gap-3 mb-4">
          <select className="input w-40" value={tipoFilter} onChange={(e) => setTipoFilter(e.target.value)}>
            <option value="">Todos los tipos</option>
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="py-8 text-center text-tierra-600">Cargando costes…</div>
        ) : costes.length === 0 ? (
          <div className="py-8 text-center text-tierra-600">No hay costes con los filtros seleccionados.</div>
        ) : (
          <>
            <ul className="space-y-2">
              {costes.map((c) => (
                <li key={c.id}>
                  <div className="flex flex-wrap justify-between items-start gap-2 py-2 border-b border-tierra-100 last:border-0">
                    <div>
                      <span className="font-medium text-tierra-800">{c.concepto}</span>
                      <span className="text-sm px-2 py-0.5 rounded bg-tierra-100 text-tierra-600 ml-2 capitalize">{c.tipo}</span>
                      <span className="text-sm px-2 py-0.5 rounded bg-tierra-100 text-tierra-600 capitalize">{c.categoria}</span>
                      <p className="text-sm text-tierra-500 mt-0.5">
                        {typeof c.fecha === "string" ? c.fecha.slice(0, 10) : String(c.fecha).slice(0, 10)}
                        {c.finca && ` · ${c.finca.nombre}`}
                        {c.parcela && ` · ${c.parcela.nombre}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold text-tierra-800">{formatEuros(c.importeCentimos)}</span>
                      <button type="button" onClick={() => handleDelete(c.id)} className="btn-ghost text-sm text-red-600">
                        Eliminar
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-4 pt-3 border-t border-tierra-200">
                <p className="text-sm text-tierra-600">{total} coste(s) · Página {page} de {totalPages}</p>
                <div className="flex gap-2">
                  <button type="button" className="btn-ghost text-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Anterior
                  </button>
                  <button type="button" className="btn-ghost text-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

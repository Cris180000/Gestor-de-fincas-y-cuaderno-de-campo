"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fincasApi, parcelasApi, laboresApi } from "@/lib/offline-api";
import type { FincaItem, ParcelaItem, LaborItem } from "@/lib/offline-api";
import type { ApiError } from "@/lib/api-client";

const FITOSANITARIO_CODES = ["NO_REGISTRADO", "CULTIVO_NO_INDICADO", "PROHIBIDO_CULTIVO", "DOSIS_SUPERADA"];
const NITROGENO_CODES = ["N_LIMITE_SUPERADO", "FERTILIZANTE_NO_REGISTRADO", "DOSIS_NO_RECONOCIDA"];

const TIPOS_LABOR = [
  { value: "riego", label: "Riego" },
  { value: "abonado", label: "Abonado" },
  { value: "tratamiento", label: "Tratamiento" },
  { value: "poda", label: "Poda" },
  { value: "cosecha", label: "Cosecha" },
  { value: "otros", label: "Otros" },
];

const PAGE_SIZE = 10;

function LaboresContent() {
  const searchParams = useSearchParams();
  const [fincas, setFincas] = useState<FincaItem[]>([]);
  const [parcelas, setParcelas] = useState<ParcelaItem[]>([]);
  const [labores, setLabores] = useState<LaborItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingForm, setLoadingForm] = useState(false);

  const fincaId = searchParams.get("fincaId") ?? "";
  const parcelaId = searchParams.get("parcelaId") ?? "";
  const tipo = searchParams.get("tipo") ?? "";
  const desde = searchParams.get("desde") ?? "";
  const hasta = searchParams.get("hasta") ?? "";

  const setFilters = useCallback(
    (updates: { fincaId?: string; parcelaId?: string; tipo?: string; desde?: string; hasta?: string; page?: number }) => {
      const p = new URLSearchParams(searchParams.toString());
      if (updates.fincaId !== undefined) (updates.fincaId ? p.set("fincaId", updates.fincaId) : p.delete("fincaId"));
      if (updates.parcelaId !== undefined) (updates.parcelaId ? p.set("parcelaId", updates.parcelaId) : p.delete("parcelaId"));
      if (updates.tipo !== undefined) (updates.tipo ? p.set("tipo", updates.tipo) : p.delete("tipo"));
      if (updates.desde !== undefined) (updates.desde ? p.set("desde", updates.desde) : p.delete("desde"));
      if (updates.hasta !== undefined) (updates.hasta ? p.set("hasta", updates.hasta) : p.delete("hasta"));
      if (updates.page !== undefined) (updates.page !== 1 ? p.set("page", String(updates.page)) : p.delete("page"));
      window.history.replaceState(null, "", `${window.location.pathname}?${p}`);
    },
    [searchParams]
  );

  useEffect(() => {
    fincasApi.list({ pageSize: 200 }).then((r) => setFincas(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    parcelasApi
      .list({ pageSize: 200, ...(fincaId ? { fincaId } : undefined) })
      .then((r) => setParcelas(r.data))
      .catch(() => setParcelas([]));
  }, [fincaId]);

  useEffect(() => {
    const currentPage = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    setPage(currentPage);
    setLoading(true);
    laboresApi
      .list({
        page: currentPage,
        pageSize: PAGE_SIZE,
        ...(fincaId && { fincaId }),
        ...(parcelaId && { parcelaId }),
        ...(tipo && { tipo }),
        ...(desde && { desde }),
        ...(hasta && { hasta }),
      })
      .then((r) => {
        setLabores(r.data);
        setTotal(r.total);
        setTotalPages(r.totalPages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fincaId, parcelaId, tipo, desde, hasta, searchParams]);

  const [showForm, setShowForm] = useState(false);
  const [formFincaId, setFormFincaId] = useState("");
  const [formParcelas, setFormParcelas] = useState<ParcelaItem[]>([]);
  const [formParcelaId, setFormParcelaId] = useState("");
  const [formFecha, setFormFecha] = useState(new Date().toISOString().slice(0, 10));
  const [formHora, setFormHora] = useState("08:00");
  const [formTipo, setFormTipo] = useState("riego");
  const [formDescripcion, setFormDescripcion] = useState("");
  const [formProducto, setFormProducto] = useState("");
  const [formCantidad, setFormCantidad] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (formFincaId) {
      parcelasApi.listByFinca(formFincaId, { pageSize: 200 }).then((r) => setFormParcelas(r.data)).catch(() => setFormParcelas([]));
    } else {
      setFormParcelas([]);
      setFormParcelaId("");
    }
  }, [formFincaId]);

  // Abrir formulario con campos pre-rellenados desde URL (ej. desde Doctor AI → Crear Tarea en Cuaderno)
  useEffect(() => {
    const openForm = searchParams.get("openForm");
    const descripcionParam = searchParams.get("descripcion");
    const tipoParam = searchParams.get("tipo");
    const parcelaIdParam = searchParams.get("parcelaId");
    const fechaParam = searchParams.get("fecha");
    if (openForm !== "1") return;

    setShowForm(true);
    if (tipoParam) setFormTipo(tipoParam);
    if (descripcionParam) setFormDescripcion(decodeURIComponent(descripcionParam));
    if (fechaParam && /^\d{4}-\d{2}-\d{2}$/.test(fechaParam)) setFormFecha(fechaParam);

    if (parcelaIdParam) {
      parcelasApi.list({ pageSize: 500 }).then((r) => {
        const p = r.data.find((x) => x.id === parcelaIdParam);
        if (p) {
          setFormFincaId(p.fincaId);
          setFormParcelaId(parcelaIdParam);
        } else {
          setFormParcelaId(parcelaIdParam);
        }
      }).catch(() => setFormParcelaId(parcelaIdParam));
    }
  }, [searchParams]);

  const [showRedWarning, setShowRedWarning] = useState(false);
  const [redWarningText, setRedWarningText] = useState<string | null>(null);

  const fechaISO = `${formFecha}T${formHora}:00`;

  const doCreate = (weatherWarningIgnored: boolean) => {
    setLoadingForm(true);
    laboresApi
      .create({
        parcelaId: formParcelaId,
        tipo: formTipo,
        fecha: fechaISO,
        descripcion: formDescripcion.trim(),
        producto: formProducto.trim() || undefined,
        cantidad: formCantidad.trim() || undefined,
        ...(weatherWarningIgnored && { weather_warning_ignored: true }),
      })
      .then(() => {
        setShowForm(false);
        setShowRedWarning(false);
        setFormDescripcion("");
        setFormProducto("");
        setFormCantidad("");
        setPage(1);
        setFilters({ page: 1 });
        laboresApi
          .list({
            page: 1,
            pageSize: PAGE_SIZE,
            ...(fincaId && { fincaId }),
            ...(parcelaId && { parcelaId }),
            ...(tipo && { tipo }),
            ...(desde && { desde }),
            ...(hasta && { hasta }),
          })
          .then((r) => {
            setLabores(r.data);
            setTotal(r.total);
            setTotalPages(r.totalPages);
          });
      })
      .catch((err: unknown) => {
        const apiErr = err as ApiError;
        const msg = apiErr instanceof Error ? apiErr.message : "Error al guardar";
        setFormError(msg + (apiErr.detalle ? ` ${apiErr.detalle}` : ""));
        if (apiErr.code && FITOSANITARIO_CODES.includes(apiErr.code)) {
          const alerta = apiErr.detalle ? `${msg}\n\n${apiErr.detalle}` : msg;
          window.alert("⚠️ Validación fitosanitaria\n\n" + alerta);
        } else if (apiErr.code && NITROGENO_CODES.includes(apiErr.code)) {
          const alerta = apiErr.detalle ? `${msg}\n\n${apiErr.detalle}` : msg;
          window.alert("⚠️ Control de nitrógeno (NPK)\n\n" + alerta);
        }
      })
      .finally(() => setLoadingForm(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formParcelaId || !formDescripcion.trim()) return;
    setFormError(null);

    const isWeatherRelevant = formTipo === "tratamiento" || formTipo === "abonado";
    const parcelaSelObj = formParcelas.find((p) => p.id === formParcelaId);
    const lat = (parcelaSelObj as { lat?: number } | undefined)?.lat ?? null;
    const lon = (parcelaSelObj as { lon?: number } | undefined)?.lon ?? null;

    if (isWeatherRelevant && lat != null && lon != null) {
      try {
        const res = await fetch(`/api/weather/spray-window?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`);
        const data = await res.json().catch(() => ({}));
        const slots = data.slots ?? [];
        if (slots.length > 0) {
          const targetTs = new Date(fechaISO).getTime();
          let slot = slots[0];
          let bestDiff = Math.abs(new Date(slot.hour).getTime() - targetTs);
          for (const s of slots) {
            const d = Math.abs(new Date(s.hour).getTime() - targetTs);
            if (d < bestDiff) {
              slot = s;
              bestDiff = d;
            }
          }
          if (slot.suitability === "FORBIDDEN") {
            const horaStr = new Date(slot.hour).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
            setRedWarningText(
              `Condiciones climáticas adversas. Hay mucho viento/lluvia previsto para esa hora (${horaStr}: viento ${slot.wind_speed} km/h${slot.rain_prob ? `, prob. lluvia ${slot.rain_prob}%` : ""}). ¿Estás seguro de que quieres registrar esto? Podrías incumplir la normativa.`
            );
            setShowRedWarning(true);
            return;
          }
        }
      } catch {
        // Si falla la consulta de clima, continuamos sin bloquear
      }
    }

    doCreate(false);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("¿Eliminar esta labor?")) return;
    laboresApi.delete(id).then(() => {
      laboresApi
        .list({
          page,
          pageSize: PAGE_SIZE,
          ...(fincaId && { fincaId }),
          ...(parcelaId && { parcelaId }),
          ...(tipo && { tipo }),
          ...(desde && { desde }),
          ...(hasta && { hasta }),
        })
        .then((r) => {
          setLabores(r.data);
          setTotal(r.total);
          setTotalPages(r.totalPages);
        });
    }).catch(() => {});
  };

  const [marcandoId, setMarcandoId] = useState<string | null>(null);
  const [errorGps, setErrorGps] = useState<string | null>(null);

  const handleMarcarRealizada = (laborId: string) => {
    if (!navigator.geolocation) {
      setErrorGps("Tu dispositivo no soporta geolocalización.");
      return;
    }
    setErrorGps(null);
    setMarcandoId(laborId);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        laboresApi
          .update(laborId, {
            estado: "realizada",
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          })
          .then(() => {
            setLabores((prev) =>
              prev.map((l) =>
                l.id === laborId
                  ? {
                      ...l,
                      estado: "realizada",
                      realizadaAt: new Date().toISOString(),
                      lat: position.coords.latitude,
                      lon: position.coords.longitude,
                    }
                  : l
              )
            );
          })
          .catch((err) => setErrorGps(err instanceof Error ? err.message : "Error al guardar"))
          .finally(() => setMarcandoId(null));
      },
      (err) => {
        setErrorGps(
          err.code === 1
            ? "Se necesita permiso de ubicación para verificar dónde se realizó la tarea."
            : err.code === 3
              ? "Tiempo de espera agotado. Comprueba que el GPS esté activado."
              : "No se pudo obtener la ubicación."
        );
        setMarcandoId(null);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const parcelasOptions = parcelas;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-xl font-semibold text-tierra-800">Cuaderno de campo (labores)</h2>
        <button type="button" onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? "Cerrar" : "+ Nueva labor"}
        </button>
      </div>

      <div className="card space-y-3">
        <h3 className="font-medium text-tierra-800">Filtros (combinables)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="label">Finca</label>
            <select
              className="input"
              value={fincaId}
              onChange={(e) => setFilters({ fincaId: e.target.value || undefined, parcelaId: undefined, page: 1 })}
            >
              <option value="">Todas</option>
              {fincas.map((f) => (
                <option key={f.id} value={f.id}>{f.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Parcela</label>
            <select
              className="input"
              value={parcelaId}
              onChange={(e) => setFilters({ parcelaId: e.target.value || undefined, page: 1 })}
            >
              <option value="">Todas</option>
              {parcelasOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tipo</label>
            <select
              className="input"
              value={tipo}
              onChange={(e) => setFilters({ tipo: e.target.value || undefined, page: 1 })}
            >
              <option value="">Todos</option>
              {TIPOS_LABOR.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Desde</label>
            <input
              type="date"
              className="input"
              value={desde}
              onChange={(e) => setFilters({ desde: e.target.value || undefined, page: 1 })}
            />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input
              type="date"
              className="input"
              value={hasta}
              onChange={(e) => setFilters({ hasta: e.target.value || undefined, page: 1 })}
            />
          </div>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-3">
          <h3 className="font-medium text-tierra-800">Nueva labor</h3>
          {formError && (
            <div
              className={`p-3 rounded text-sm border ${
                formError.includes("fitosanitar") || formError.includes("registro") || formError.includes("dosis") || formError.includes("cultivo")
                  ? "bg-red-50 border-red-400 text-red-800 font-medium"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
              role="alert"
            >
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Finca *</label>
              <select
                className="input"
                value={formFincaId}
                onChange={(e) => { setFormFincaId(e.target.value); setFormParcelaId(""); }}
                required
              >
                <option value="">Seleccionar</option>
                {fincas.map((f) => (
                  <option key={f.id} value={f.id}>{f.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Parcela *</label>
              <select
                className="input"
                value={formParcelaId}
                onChange={(e) => setFormParcelaId(e.target.value)}
                required
                disabled={!formFincaId}
              >
                <option value="">Seleccionar</option>
                {formParcelas.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Fecha *</label>
              <input
                type="date"
                className="input"
                value={formFecha}
                onChange={(e) => setFormFecha(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Hora *</label>
              <input
                type="time"
                className="input"
                value={formHora}
                onChange={(e) => setFormHora(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Tipo *</label>
              <select
                className="input"
                value={formTipo}
                onChange={(e) => setFormTipo(e.target.value)}
              >
                {TIPOS_LABOR.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Descripción *</label>
            <textarea
              className="input min-h-[80px]"
              value={formDescripcion}
              onChange={(e) => setFormDescripcion(e.target.value)}
              required
              placeholder="Qué se ha hecho..."
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Producto (opcional)</label>
              <input
                type="text"
                className="input"
                value={formProducto}
                onChange={(e) => setFormProducto(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Cantidad (opcional)</label>
              <input
                type="text"
                className="input"
                value={formCantidad}
                onChange={(e) => setFormCantidad(e.target.value)}
                placeholder="Ej. 50 L, 2.5 kg"
              />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={loadingForm}>
            {loadingForm ? "Guardando…" : "Guardar labor"}
          </button>
        </form>
      )}
      {showRedWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="alertdialog" aria-modal="true" aria-labelledby="weather-alert-title">
          <div className="card max-w-md w-full mx-4 space-y-3 border-2 border-rose-300 bg-rose-50/95">
            <h3 id="weather-alert-title" className="text-lg font-semibold text-rose-800 flex items-center gap-2">
              ⚠️ Condiciones climáticas adversas
            </h3>
            <p className="text-sm text-tierra-800 whitespace-pre-wrap">
              {redWarningText ??
                "Hay mucho viento o lluvia previsto para esa hora. ¿Estás seguro de que quieres registrar esto? Podrías incumplir la normativa."}
            </p>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowRedWarning(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary bg-rose-600 hover:bg-rose-700 text-white"
                onClick={() => {
                  setShowRedWarning(false);
                  doCreate(true);
                }}
                disabled={loadingForm}
              >
                Guardar de todas formas
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card text-center py-8 text-tierra-600">Cargando labores…</div>
      ) : labores.length === 0 ? (
        <div className="card text-center py-8 text-tierra-600">
          No hay labores con los filtros seleccionados.
        </div>
      ) : (
        <>
          {errorGps && (
            <div className="card bg-amber-50 border-amber-200 text-amber-800 text-sm p-3 flex justify-between items-start gap-2">
              <span>{errorGps}</span>
              <button type="button" onClick={() => setErrorGps(null)} className="text-amber-600 hover:underline shrink-0">
                Cerrar
              </button>
            </div>
          )}
          <ul className="space-y-2">
            {labores.map((l) => (
              <li key={l.id}>
                <div className="card flex flex-wrap justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/labores/${l.id}`} className="hover:underline">
                        <span className="font-medium">{typeof l.fecha === "string" ? l.fecha.slice(0, 10) : String(l.fecha).slice(0, 10)}</span>
                      </Link>
                      <span className="text-sm px-2 py-0.5 rounded bg-tierra-200 text-tierra-700 capitalize">
                        {l.tipo}
                      </span>
                      <span
                        className={`text-sm px-2 py-0.5 rounded capitalize ${
                          l.estado === "realizada" ? "bg-verde-200 text-verde-800" : "bg-tierra-100 text-tierra-600"
                        }`}
                      >
                        {l.estado === "realizada" ? "Realizada" : "Pendiente"}
                      </span>
                    </div>
                    <p className="font-medium text-tierra-800 mt-1">{l.descripcion}</p>
                    <p className="text-sm text-tierra-500">
                      {l.parcela?.finca ? `${l.parcela.finca.nombre} – ` : ""}{l.parcela?.nombre ?? l.parcelaId}
                    </p>
                    {(l.producto || l.cantidad) && (
                      <p className="text-sm text-tierra-600">
                        {l.producto}
                        {l.cantidad && ` · ${l.cantidad}`}
                      </p>
                    )}
                    {l.estado === "realizada" && l.lat != null && l.lon != null && (
                      <p className="text-xs text-tierra-500 mt-1">
                        Ubicación al marcar:{" "}
                        <a
                          href={`https://www.google.com/maps?q=${l.lat},${l.lon}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          {l.lat.toFixed(5)}, {l.lon.toFixed(5)}
                        </a>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {l.estado !== "realizada" && (
                      <button
                        type="button"
                        onClick={() => handleMarcarRealizada(l.id)}
                        disabled={marcandoId === l.id}
                        className="btn-primary text-sm"
                      >
                        {marcandoId === l.id ? "Obteniendo GPS…" : "Marcar realizada"}
                      </button>
                    )}
                    <Link href={`/labores/${l.id}/editar`} className="btn-secondary text-sm">Editar</Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(l.id)}
                      className="btn-ghost text-sm text-red-600"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-tierra-600">
                {total} labor(es) · Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-ghost text-sm"
                  disabled={page <= 1}
                  onClick={() => setFilters({ page: page - 1 })}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  className="btn-ghost text-sm"
                  disabled={page >= totalPages}
                  onClick={() => setFilters({ page: page + 1 })}
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

export default function LaboresPage() {
  return (
    <Suspense fallback={<div className="card py-8 text-center text-tierra-600">Cargando…</div>}>
      <LaboresContent />
    </Suspense>
  );
}

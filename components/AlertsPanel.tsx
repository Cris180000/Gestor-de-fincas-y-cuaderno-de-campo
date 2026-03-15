"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export interface AlertItem {
  id: string;
  parcelId: string | null;
  priority: "critical" | "high" | "medium";
  title: string;
  message: string;
  recommendationType: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  expiresAt: string;
  status: string;
  createdAt: string;
}

interface AlertsPanelProps {
  /** Si se pasa, se listan solo alertas de esta parcela */
  parcelId?: string;
  /** Si se pasa, al montar se llama a POST /api/alerts para generar alertas con esta ubicación */
  triggerGenerate?: { lat: number; lon: number; parcelId?: string; parcelName?: string };
  limit?: number;
}

export function AlertsPanel({ parcelId, triggerGenerate, limit = 10 }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const fetchAlerts = () => {
    const params = new URLSearchParams();
    if (parcelId) params.set("parcelId", parcelId);
    if (limit) params.set("limit", String(limit));
    fetch(`/api/alerts?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.alerts) setAlerts(data.alerts);
      })
      .catch(() => setAlerts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (triggerGenerate && triggerGenerate.lat != null && triggerGenerate.lon != null) {
      fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: triggerGenerate.lat,
          lon: triggerGenerate.lon,
          parcelId: triggerGenerate.parcelId,
          parcelName: triggerGenerate.parcelName,
        }),
      })
        .then((r) => r.json())
        .catch(() => ({}))
        .finally(() => fetchAlerts());
    } else {
      fetchAlerts();
    }
  }, [parcelId, limit, triggerGenerate?.lat, triggerGenerate?.lon, triggerGenerate?.parcelId]);

  const recordOutcome = (id: string, recommendationType: string, action: "accepted" | "rejected") => {
    fetch("/api/recommendation-outcomes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recommendationId: id, recommendationType, action }),
    }).catch(() => {});
  };

  const dismiss = (id: string) => {
    const alert = alerts.find((a) => a.id === id);
    if (alert) recordOutcome(id, alert.recommendationType, "rejected");
    setDismissingId(id);
    fetch(`/api/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "dismissed" }),
    })
      .then(() => setAlerts((prev) => prev.filter((a) => a.id !== id)))
      .finally(() => setDismissingId(null));
  };

  const markActioned = (id: string) => {
    const alert = alerts.find((a) => a.id === id);
    if (alert) recordOutcome(id, alert.recommendationType, "accepted");
    setDismissingId(id);
    fetch(`/api/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "actioned" }),
    })
      .then(() => setAlerts((prev) => prev.filter((a) => a.id !== id)))
      .finally(() => setDismissingId(null));
  };

  if (loading) {
    return (
      <div className="card">
        <p className="text-sm text-tierra-600">Cargando alertas…</p>
      </div>
    );
  }

  if (alerts.length === 0) {
    return null;
  }

  const priorityClass = (p: string) => {
    if (p === "critical") return "bg-red-50 border-red-200 text-red-800";
    if (p === "high") return "bg-amber-50 border-amber-200 text-amber-900";
    return "bg-tierra-50 border-tierra-200 text-tierra-800";
  };

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-tierra-800">Alertas agronómicas</h3>
      <ul className="space-y-2">
        {alerts.map((a) => (
          <li key={a.id} className={`card border ${priorityClass(a.priority)}`}>
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{a.title}</p>
                  <p className="text-sm opacity-90 mt-0.5">{a.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(a.id)}
                  disabled={dismissingId === a.id}
                  className="shrink-0 text-xs opacity-70 hover:opacity-100 disabled:opacity-50"
                  aria-label="Descartar"
                >
                  Descartar
                </button>
              </div>
              {a.ctaHref && a.ctaLabel && (
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={a.ctaHref}
                    className="btn-primary text-sm"
                    onClick={() => markActioned(a.id)}
                  >
                    {a.ctaLabel}
                  </Link>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

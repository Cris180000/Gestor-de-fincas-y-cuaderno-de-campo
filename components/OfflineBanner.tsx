"use client";

import { useEffect, useState } from "react";
import { syncAllFromServer, processSyncQueue, getSyncPendingCount } from "@/lib/offline-api";

export function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setOnline(navigator.onLine);
    getSyncPendingCount().then(setPending);

    const handleOnline = () => {
      setOnline(true);
      setSyncing(true);
      processSyncQueue()
        .then(() => getSyncPendingCount().then(setPending))
        .finally(() => setSyncing(false));
    };

    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (navigator.onLine) {
      setSyncing(true);
      syncAllFromServer()
        .then(() => getSyncPendingCount().then(setPending))
        .finally(() => setSyncing(false));
    } else {
      getSyncPendingCount().then(setPending);
    }

    const interval = setInterval(() => {
      getSyncPendingCount().then(setPending);
    }, 3000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  if (online && !syncing && pending === 0) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-20 px-4 py-2 text-center text-sm font-medium shadow"
      style={{
        backgroundColor: online ? (pending > 0 ? "#fef3c7" : "#d1fae5") : "#fee2e2",
        color: online ? (pending > 0 ? "#92400e" : "#065f46") : "#991b1b",
      }}
    >
      {!online && (
        <span>Sin conexión. Los cambios se guardan en este dispositivo y se sincronizarán al recuperar la conexión.</span>
      )}
      {online && syncing && <span>Sincronizando…</span>}
      {online && !syncing && pending > 0 && (
        <span>{pending} cambio(s) pendiente(s) de sincronizar.</span>
      )}
    </div>
  );
}

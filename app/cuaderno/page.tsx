"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function RedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const parcela = searchParams.get("parcela") || "";
    const tab = searchParams.get("tab") || "";
    const tipo = tab === "riegos" ? "riego" : tab === "abonados" ? "abonado" : tab === "tratamientos" ? "tratamiento" : "";
    const q = new URLSearchParams();
    if (parcela) q.set("parcela", parcela);
    if (tipo) q.set("tipo", tipo);
    router.replace(`/labores${q.toString() ? `?${q.toString()}` : ""}`);
  }, [router, searchParams]);

  return (
    <div className="card py-8 text-center text-tierra-600">
      Redirigiendo al cuaderno de campo…
    </div>
  );
}

export default function CuadernoRedirectPage() {
  return (
    <Suspense fallback={<div className="card py-8 text-center text-tierra-600">Cargando…</div>}>
      <RedirectContent />
    </Suspense>
  );
}

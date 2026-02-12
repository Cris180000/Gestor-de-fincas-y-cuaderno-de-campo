"use client";

import { useSession } from "next-auth/react";

const PUBLIC_PATHS = ["/login", "/registro"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (isPublic) return <>{children}</>;
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-tierra-600">Cargando…</p>
      </div>
    );
  }
  if (status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-tierra-600">Redirigiendo a inicio de sesión…</p>
      </div>
    );
  }
  return <>{children}</>;
}

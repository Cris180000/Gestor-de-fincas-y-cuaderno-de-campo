"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const PUBLIC_PATHS = ["/login", "/registro", "/olvidaste-contrasena", "/restablecer-contrasena"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname() ?? "";
  const router = useRouter();

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  useEffect(() => {
    if (isPublic || status !== "unauthenticated") return;
    const path =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : pathname;
    router.replace(`/login?callbackUrl=${encodeURIComponent(path)}`);
  }, [isPublic, status, pathname, router]);

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

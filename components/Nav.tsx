"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/fincas", label: "Fincas" },
  { href: "/labores", label: "Cuaderno" },
  { href: "/ndvi", label: "NDVI" },
  { href: "/dashboard/diagnosis", label: "Doctor" },
  { href: "/costes", label: "Costes" },
  { href: "/incidencias", label: "Incidencias" },
  { href: "/ajustes", label: "Ajustes" },
];

export function Nav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const isPublic = pathname === "/login" || pathname === "/registro";
  if (isPublic) {
    return (
      <nav className="flex gap-1 px-4 py-2 bg-tierra-700/80">
        <Link
          href="/login"
          className="px-4 py-2 rounded-lg text-sm font-medium text-tierra-200 hover:bg-tierra-600 hover:text-white"
        >
          Iniciar sesión
        </Link>
        <Link
          href="/registro"
          className="px-4 py-2 rounded-lg text-sm font-medium text-tierra-200 hover:bg-tierra-600 hover:text-white"
        >
          Registrarse
        </Link>
      </nav>
    );
  }

  return (
    <nav className="hidden md:flex items-center gap-1 overflow-x-auto px-4 py-2 bg-tierra-700/80 scrollbar-hide">
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
            pathname === href || (href !== "/" && pathname.startsWith(href))
              ? "bg-verde-600 text-white"
              : "text-tierra-200 hover:bg-tierra-600 hover:text-white"
          }`}
        >
          {label}
        </Link>
      ))}
      {status === "authenticated" && session?.user && (
        <span className="ml-auto flex items-center gap-2 shrink-0">
          <span className="text-tierra-200 text-sm truncate max-w-[120px]" title={session.user.email ?? ""}>
            {session.user.name ?? session.user.email}
          </span>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="px-3 py-1.5 rounded-lg text-sm text-tierra-200 hover:bg-tierra-600"
          >
            Cerrar sesión
          </button>
        </span>
      )}
    </nav>
  );
}

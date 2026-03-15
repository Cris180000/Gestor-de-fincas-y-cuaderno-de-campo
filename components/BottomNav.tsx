"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Inicio", icon: HomeIcon },
  { href: "/ndvi", label: "Mapas", icon: MapIcon },
  { href: "/labores", label: "Tareas", icon: TasksIcon },
  { href: "/ajustes", label: "Perfil", icon: UserIcon },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
}

export function BottomNav() {
  const pathname = usePathname();
  const isPublic =
    pathname === "/login" ||
    pathname === "/registro" ||
    pathname === "/olvidaste-contrasena" ||
    pathname === "/restablecer-contrasena";

  if (isPublic) return null;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-tierra-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <ul className="mx-auto max-w-4xl grid grid-cols-4 px-1 pb-[max(env(safe-area-inset-bottom),0.35rem)] pt-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 min-h-14 ${
                  active ? "text-primary bg-tierra-100/70" : "text-tierra-600"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[11px] font-medium leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 9.8V20h14V9.8" />
    </svg>
  );
}

function MapIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  );
}

function TasksIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4 6l1.2 1.2L7.8 4.6M4 12l1.2 1.2L7.8 10.6M4 18l1.2 1.2 2.6-2.6" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.8-3.2 4.4-5 8-5s6.2 1.8 8 5" />
    </svg>
  );
}


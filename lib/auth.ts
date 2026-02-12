"use client";

/**
 * @deprecated La autenticación usa ahora NextAuth (sesión en BD/cookie).
 * Ver lib/auth.config.ts, /api/auth/[...nextauth] y /api/auth/register.
 */

import type { User, SessionUser } from "./types";
import { AUTH_KEY } from "./types";

interface AuthStore {
  currentUser: SessionUser | null;
  users: User[];
}

function id(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function loadAuth(): AuthStore {
  if (typeof window === "undefined") {
    return { currentUser: null, users: [] };
  }
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return { currentUser: null, users: [] };
    const parsed = JSON.parse(raw) as AuthStore;
    return {
      currentUser: parsed.currentUser ?? null,
      users: Array.isArray(parsed.users) ? parsed.users : [],
    };
  } catch {
    return { currentUser: null, users: [] };
  }
}

function saveAuth(auth: AuthStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export function getCurrentUser(): SessionUser | null {
  return loadAuth().currentUser;
}

export function login(email: string, password: string): { ok: true; user: SessionUser } | { ok: false; error: string } {
  const auth = loadAuth();
  const user = auth.users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
  if (!user) {
    return { ok: false, error: "Email o contraseña incorrectos" };
  }
  const session: SessionUser = { id: user.id, email: user.email, nombre: user.nombre };
  auth.currentUser = session;
  saveAuth(auth);
  return { ok: true, user: session };
}

export function register(
  email: string,
  nombre: string,
  password: string
): { ok: true; user: SessionUser } | { ok: false; error: string } {
  const auth = loadAuth();
  if (auth.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return { ok: false, error: "Ya existe un usuario con ese email" };
  }
  if (!nombre.trim()) return { ok: false, error: "El nombre es obligatorio" };
  if (password.length < 4) return { ok: false, error: "La contraseña debe tener al menos 4 caracteres" };
  const newUser: User = {
    id: id(),
    email: email.trim(),
    nombre: nombre.trim(),
    password,
    createdAt: new Date().toISOString(),
  };
  auth.users.push(newUser);
  const session: SessionUser = { id: newUser.id, email: newUser.email, nombre: newUser.nombre };
  auth.currentUser = session;
  saveAuth(auth);
  return { ok: true, user: session };
}

export function logout(): void {
  const auth = loadAuth();
  auth.currentUser = null;
  saveAuth(auth);
}

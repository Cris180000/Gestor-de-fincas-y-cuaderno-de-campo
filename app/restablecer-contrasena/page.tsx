"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function RestablecerContrasenaForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) setMessage("Falta el enlace de restablecimiento. Solicita uno nuevo desde «Olvidaste la contraseña».");
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setMessage("Las contraseñas no coinciden");
      setStatus("error");
      return;
    }
    if (password.length < 4) {
      setMessage("La contraseña debe tener al menos 4 caracteres");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Error al restablecer la contraseña");
        return;
      }
      setStatus("success");
      setMessage(data.message || "Contraseña actualizada. Ya puedes iniciar sesión.");
    } catch {
      setStatus("error");
      setMessage("Error de conexión");
    }
  };

  if (!token) {
    return (
      <div className="max-w-sm mx-auto space-y-6">
        <h2 className="text-xl font-semibold text-tierra-800">Restablecer contraseña</h2>
        <div className="card">
          <p className="text-sm text-red-600">{message}</p>
          <Link href="/olvidaste-contrasena" className="btn-primary mt-3 w-full block text-center">
            Solicitar enlace
          </Link>
          <Link href="/login" className="block text-center text-sm text-verde-600 mt-2 hover:underline">
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-tierra-800">Nueva contraseña</h2>
      {status === "success" ? (
        <div className="card space-y-3">
          <p className="text-sm text-tierra-800">{message}</p>
          <Link href="/login" className="btn-primary w-full block text-center">
            Iniciar sesión
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label">Nueva contraseña</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={4}
              autoComplete="new-password"
              disabled={status === "loading"}
            />
          </div>
          <div>
            <label className="label">Repetir contraseña</label>
            <input
              type="password"
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={4}
              autoComplete="new-password"
              disabled={status === "loading"}
            />
          </div>
          {message && (
            <p className={`text-sm ${status === "error" ? "text-red-600" : "text-tierra-600"}`}>
              {message}
            </p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={status === "loading"}>
            {status === "loading" ? "Guardando…" : "Cambiar contraseña"}
          </button>
          <p className="text-sm text-tierra-600 text-center">
            <Link href="/login" className="text-verde-600 font-medium hover:underline">
              Volver a iniciar sesión
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}

export default function RestablecerContrasenaPage() {
  return (
    <Suspense fallback={<div className="max-w-sm mx-auto card py-8 text-center text-tierra-600">Cargando…</div>}>
      <RestablecerContrasenaForm />
    </Suspense>
  );
}

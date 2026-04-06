"use client";

import { useState } from "react";
import Link from "next/link";

export default function OlvidasteContrasenaPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [devResetLink, setDevResetLink] = useState("");
  const [emailPreviewUrl, setEmailPreviewUrl] = useState("");
  const [devNote, setDevNote] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    setDevResetLink("");
    setEmailPreviewUrl("");
    setDevNote("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "No se pudo enviar la solicitud.");
        return;
      }
      setStatus("done");
      setDevResetLink(typeof data.devResetLink === "string" ? data.devResetLink : "");
      setEmailPreviewUrl(typeof data.emailPreviewUrl === "string" ? data.emailPreviewUrl : "");
      setDevNote(typeof data.devNote === "string" ? data.devNote : "");
      setMessage(
        data.message ||
          "Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña."
      );
    } catch {
      setStatus("error");
      setMessage("Error de conexión");
    }
  };

  return (
    <div className="max-w-sm mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-tierra-800">¿Olvidaste la contraseña?</h2>
      <p className="text-sm text-tierra-600">
        Escribe tu correo y, si hay una cuenta asociada, te enviaremos un enlace para elegir una nueva
        contraseña.
      </p>
      {status === "done" ? (
        <div className="card space-y-4">
          <p className="text-sm text-tierra-800">{message}</p>
          {devNote && (
            <p className="text-xs text-tierra-600 border border-tierra-200 rounded-lg p-2 bg-tierra-50">{devNote}</p>
          )}
          {emailPreviewUrl ? (
            <div className="rounded-lg border border-verde-200 bg-verde-50/80 p-3 text-sm space-y-2">
              <p className="font-medium text-tierra-800">Vista previa del correo (desarrollo / Ethereal)</p>
              <a
                href={emailPreviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-verde-700 break-all underline hover:text-verde-800"
              >
                Abrir mensaje en el navegador
              </a>
              <p className="text-xs text-tierra-600">
                El enlace de restablecimiento está dentro del correo. Con Gmail u otro SMTP real en{" "}
                <code className="bg-tierra-100 px-1 rounded text-[11px]">.env</code>, el mensaje irá a tu bandeja.
              </p>
            </div>
          ) : null}
          {devResetLink ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50/90 p-3 text-sm space-y-2">
              <p className="font-medium text-tierra-800">Enlace para restablecer (solo desarrollo)</p>
              <a
                href={devResetLink}
                className="text-verde-700 break-all underline hover:text-verde-800"
              >
                {devResetLink}
              </a>
            </div>
          ) : null}
          {!emailPreviewUrl && !devResetLink ? (
            <p className="text-xs text-tierra-600">
              Si no ves el correo, revisa la carpeta de spam. Para envío real a tu Gmail u otro proveedor, define{" "}
              <code className="text-xs bg-tierra-100 px-1 rounded">SMTP_HOST</code>,{" "}
              <code className="text-xs bg-tierra-100 px-1 rounded">SMTP_USER</code> y{" "}
              <code className="text-xs bg-tierra-100 px-1 rounded">SMTP_PASS</code> en <code className="text-xs bg-tierra-100 px-1 rounded">.env</code>.
            </p>
          ) : null}
          <Link href="/login" className="btn-primary w-full block text-center">
            Volver a iniciar sesión
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={status === "loading"}
            />
          </div>
          {message && <p className="text-sm text-red-600">{message}</p>}
          <button type="submit" className="btn-primary w-full" disabled={status === "loading"}>
            {status === "loading" ? "Enviando…" : "Enviar enlace"}
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

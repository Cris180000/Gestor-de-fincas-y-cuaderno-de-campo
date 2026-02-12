"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegistroPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nombre.trim(),
        email: email.trim(),
        password,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Error al crear la cuenta");
      return;
    }
    const signInRes = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });
    if (signInRes?.ok) {
      router.push("/");
      router.refresh();
      return;
    }
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="max-w-sm mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-tierra-800">Crear cuenta</h2>
      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">Nombre</label>
          <input
            type="text"
            className="input"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            autoComplete="name"
          />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label className="label">Contraseña (mín. 4 caracteres)</label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={4}
            autoComplete="new-password"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="btn-primary w-full">Registrarse</button>
        <p className="text-sm text-tierra-600 text-center">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-verde-600 font-medium hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </form>
    </div>
  );
}

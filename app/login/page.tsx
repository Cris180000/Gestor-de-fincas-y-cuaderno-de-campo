"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });
    if (res?.error) {
      setError("Email o contraseña incorrectos");
      return;
    }
    if (res?.ok) {
      router.push(callbackUrl);
      router.refresh();
      return;
    }
    setError("Error al iniciar sesión");
  };

  return (
    <div className="max-w-sm mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-tierra-800">Iniciar sesión</h2>
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
          />
        </div>
        <div>
          <label className="label">Contraseña</label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="btn-primary w-full">Entrar</button>
        <p className="text-sm text-tierra-600 text-center">
          <Link href="/olvidaste-contrasena" className="text-verde-600 font-medium hover:underline">
            ¿Olvidaste la contraseña?
          </Link>
        </p>
        <p className="text-sm text-tierra-600 text-center">
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="text-verde-600 font-medium hover:underline">
            Registrarse
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="card py-8 text-center text-tierra-600">Cargando…</div>}>
      <LoginForm />
    </Suspense>
  );
}

import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Nav } from "@/components/Nav";
import { AuthGuard } from "@/components/AuthGuard";
import { OfflineBanner } from "@/components/OfflineBanner";

export const metadata: Metadata = {
  title: "Gestor de Fincas y Cuaderno de Campo",
  description: "Gestiona tus fincas, parcelas, cultivos, riegos, abonados, tratamientos e incidencias",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Cuaderno Campo" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4f4032",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <Providers>
        <div className="flex flex-col min-h-screen">
          <header className="sticky top-0 z-10 bg-tierra-800 text-white shadow-md">
            <div className="max-w-4xl mx-auto px-4 py-3">
              <h1 className="font-display text-xl sm:text-2xl font-semibold">
                🌾 Cuaderno de Campo
              </h1>
            </div>
            <Suspense fallback={<div className="h-10 bg-tierra-700/80" />}>
              <Nav />
            </Suspense>
          </header>
          <OfflineBanner />
          <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 pb-24">
            <AuthGuard>{children}</AuthGuard>
          </main>
        </div>
        </Providers>
      </body>
    </html>
  );
}

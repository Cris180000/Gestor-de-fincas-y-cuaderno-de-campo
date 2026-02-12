import { NextRequest, NextResponse } from "next/server";
import { consultarPorReferencia } from "@/lib/catastro";

/**
 * GET /api/catastro/consulta?rc=REFERENCIA&provincia=...&municipio=...
 * Proxy de consulta al Catastro (datos no protegidos). No requiere auth para consulta pública.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rc = searchParams.get("rc")?.trim();
  const provincia = searchParams.get("provincia")?.trim() || undefined;
  const municipio = searchParams.get("municipio")?.trim() || undefined;

  if (!rc) {
    return NextResponse.json({ error: "Falta el parámetro rc (referencia catastral)." }, { status: 400 });
  }

  const result = await consultarPorReferencia(rc, provincia, municipio);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ datos: result.datos });
}

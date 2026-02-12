import { NextRequest, NextResponse } from "next/server";
import { consultarCoordenadas } from "@/lib/catastro";

/** GET /api/catastro/coordenadas?rc=REFERENCIA_CATASTRAL (14 dígitos) */
export async function GET(request: NextRequest) {
  const rc = request.nextUrl.searchParams.get("rc")?.trim();
  if (!rc) {
    return NextResponse.json({ error: "Falta el parámetro rc (referencia catastral de 14 caracteres)." }, { status: 400 });
  }

  const result = await consultarCoordenadas(rc, "EPSG:4326");

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ lat: result.lat, lon: result.lon, direccion: result.direccion });
}

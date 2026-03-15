import { NextRequest, NextResponse } from "next/server";
import { consultarCoordenadas } from "@/lib/catastro";

/** GET /api/catastro/coordenadas?rc=REF&provincia=GR&municipio=NOMBRE (provincia y municipio opcionales; el Catastro a veces los exige) */
export async function GET(request: NextRequest) {
  const rc = request.nextUrl.searchParams.get("rc")?.trim();
  const provincia = request.nextUrl.searchParams.get("provincia")?.trim() || undefined;
  const municipio = request.nextUrl.searchParams.get("municipio")?.trim() || undefined;
  if (!rc) {
    return NextResponse.json({ error: "Falta el parámetro rc (referencia catastral de 14, 18 o 20 caracteres)." }, { status: 400 });
  }
  if (rc.length < 14) {
    return NextResponse.json({ error: "La referencia catastral debe tener al menos 14 caracteres." }, { status: 400 });
  }

  const result = await consultarCoordenadas(rc, "EPSG:4326", provincia, municipio);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ lat: result.lat, lon: result.lon, direccion: result.direccion });
}

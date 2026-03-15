import { NextRequest, NextResponse } from "next/server";
import { getSprayWindow } from "@/lib/services/weather-service";

/**
 * GET /api/weather/spray-window?lat=xx&lon=yy
 * Devuelve las próximas 48 h con suitability (OPTIMAL / WARNING / FORBIDDEN) por hora.
 */
export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lon = request.nextUrl.searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json(
      { error: "Faltan parámetros lat y lon." },
      { status: 400 }
    );
  }

  const latNum = Number(lat);
  const lonNum = Number(lon);
  if (Number.isNaN(latNum) || Number.isNaN(lonNum)) {
    return NextResponse.json(
      { error: "lat y lon deben ser números." },
      { status: 400 }
    );
  }

  try {
    const slots = await getSprayWindow(latNum, lonNum);
    return NextResponse.json({ slots });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al obtener ventana de pulverización";
    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }
}

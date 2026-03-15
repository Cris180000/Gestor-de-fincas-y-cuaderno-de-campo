import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/api-auth";
import {
  listAlertsForUser,
  generateAlertsForLocation,
  type AlertStatus,
} from "@/lib/services/alerts-service";

/** GET /api/alerts?parcelId=&status=&limit= - Lista alertas activas del usuario */
export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const parcelId = searchParams.get("parcelId") ?? undefined;
  const status = searchParams.get("status") as AlertStatus | undefined;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;
  try {
    const alerts = await listAlertsForUser(userId, { parcelId, status, limit });
    return NextResponse.json({ alerts });
  } catch (e) {
    console.error("GET /api/alerts error:", e);
    return NextResponse.json({ error: "Error al listar alertas" }, { status: 500 });
  }
}

/** POST /api/alerts - Genera alertas para una ubicación (lat, lon). Body: { lat, lon, parcelId?, parcelName? } */
export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  let body: { lat?: number; lon?: number; parcelId?: string; parcelName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }
  const lat = typeof body.lat === "number" ? body.lat : undefined;
  const lon = typeof body.lon === "number" ? body.lon : undefined;
  if (lat == null || lon == null) {
    return NextResponse.json({ error: "Se requieren lat y lon" }, { status: 400 });
  }
  try {
    const alerts = await generateAlertsForLocation(userId, lat, lon, {
      parcelId: body.parcelId,
      parcelName: body.parcelName,
      cultivo: undefined,
    });
    return NextResponse.json({ alerts });
  } catch (e) {
    console.error("POST /api/alerts error:", e);
    return NextResponse.json({ error: "Error al generar alertas" }, { status: 500 });
  }
}

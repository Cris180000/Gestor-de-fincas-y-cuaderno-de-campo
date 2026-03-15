import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/api-auth";
import { updateAlertStatus } from "@/lib/services/alerts-service";
import type { AlertStatus } from "@/lib/services/alerts-service";

/** PATCH /api/alerts/[id] - Actualiza estado (seen, dismissed, actioned). Body: { status } */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }
  const status = body.status as AlertStatus | undefined;
  if (!status || !["seen", "dismissed", "actioned"].includes(status)) {
    return NextResponse.json({ error: "status debe ser seen, dismissed o actioned" }, { status: 400 });
  }
  const ok = await updateAlertStatus(id, userId, status);
  if (!ok) {
    return NextResponse.json({ error: "Alerta no encontrada" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

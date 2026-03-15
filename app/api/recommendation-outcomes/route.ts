import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/api-auth";
import { recordOutcome } from "@/lib/services/outcomes-service";

/** POST /api/recommendation-outcomes - Registra resultado de una recomendación. Body: { recommendationId, recommendationType, action: "accepted"|"rejected", worked?: boolean } */
export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  let body: { recommendationId?: string; recommendationType?: string; action?: string; worked?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }
  const recommendationId = typeof body.recommendationId === "string" ? body.recommendationId.trim() : undefined;
  const recommendationType = typeof body.recommendationType === "string" ? body.recommendationType.trim() : undefined;
  const action = body.action === "accepted" || body.action === "rejected" ? body.action : undefined;
  if (!recommendationId || !recommendationType || !action) {
    return NextResponse.json({ error: "Faltan recommendationId, recommendationType o action (accepted|rejected)" }, { status: 400 });
  }
  try {
    await recordOutcome(userId, {
      recommendationId,
      recommendationType,
      action,
      worked: typeof body.worked === "boolean" ? body.worked : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/recommendation-outcomes error:", e);
    return NextResponse.json({ error: "Error al registrar" }, { status: 500 });
  }
}

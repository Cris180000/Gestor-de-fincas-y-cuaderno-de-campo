import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/api-auth";
import { getOutcomeStats } from "@/lib/services/outcomes-service";

/** GET /api/recommendation-outcomes/stats - Estadísticas de efectividad por tipo de recomendación */
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    const stats = await getOutcomeStats(userId);
    return NextResponse.json({ stats });
  } catch (e) {
    console.error("GET /api/recommendation-outcomes/stats error:", e);
    return NextResponse.json({ error: "Error al obtener estadísticas" }, { status: 500 });
  }
}

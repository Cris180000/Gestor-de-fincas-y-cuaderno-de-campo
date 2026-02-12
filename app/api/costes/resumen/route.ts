import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/api-auth";

/** Total de costes (en céntimos y euros) para el punto de equilibrio. Filtros: fincaId, parcelaId, desde, hasta */
export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const fincaId = searchParams.get("fincaId") ?? undefined;
  const parcelaId = searchParams.get("parcelaId") ?? undefined;
  const desde = searchParams.get("desde") ?? undefined;
  const hasta = searchParams.get("hasta") ?? undefined;

  const where: { userId: string; fincaId?: string | null; parcelaId?: string | null; fecha?: { gte?: Date; lte?: Date } } = { userId };
  if (fincaId) where.fincaId = fincaId;
  if (parcelaId) where.parcelaId = parcelaId;
  if (desde || hasta) {
    where.fecha = {};
    if (desde) {
      const d = new Date(desde);
      if (!Number.isNaN(d.getTime())) where.fecha.gte = d;
    }
    if (hasta) {
      const d = new Date(hasta);
      if (!Number.isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        where.fecha.lte = d;
      }
    }
  }

  const agg = await prisma.coste.aggregate({
    where,
    _sum: { importeCentimos: true },
    _count: true,
  });

  const totalCentimos = agg._sum.importeCentimos ?? 0;
  const totalEuros = Math.round(totalCentimos) / 100;

  return NextResponse.json({
    totalCentimos,
    totalEuros,
    count: agg._count,
  });
}

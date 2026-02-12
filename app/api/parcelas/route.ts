import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/api-auth";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

/** Listar todas las parcelas del usuario (para filtros, etc.). Opcional fincaId. */
export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const fincaId = searchParams.get("fincaId") ?? undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
  );
  const skip = (page - 1) * pageSize;

  const where = {
    finca: fincaId ? { userId, id: fincaId } : { userId },
  };

  const [parcelas, total] = await Promise.all([
    prisma.parcela.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: { finca: { select: { id: true, nombre: true } } },
    }),
    prisma.parcela.count({ where }),
  ]);

  const data = parcelas.map((p) => ({
    id: p.id,
    fincaId: p.fincaId,
    nombre: p.nombre,
    cultivo: p.cultivo,
    superficie: p.superficie,
    notas: p.notas,
    referenciaCatastral: p.referenciaCatastral,
    createdAt: p.createdAt,
    finca: p.finca,
  }));

  return NextResponse.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

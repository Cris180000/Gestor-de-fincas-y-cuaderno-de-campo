import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId, getFincaForUser } from "@/lib/api-auth";
import { validateParcela } from "@/lib/validations/parcela";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

/** Index: listado de parcelas de una finca (solo si la finca es del usuario) */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id: fincaId } = await params;
  const finca = await getFincaForUser(prisma, fincaId, userId);
  if (!finca) {
    return NextResponse.json({ error: "Finca no encontrada" }, { status: 404 });
  }
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
  );
  const skip = (page - 1) * pageSize;

  const [parcelas, total] = await Promise.all([
    prisma.parcela.findMany({
      where: { fincaId },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.parcela.count({ where: { fincaId } }),
  ]);

  return NextResponse.json({
    data: parcelas,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    finca: { id: finca.id, nombre: finca.nombre },
  });
}

/** Store: crear parcela en la finca */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id: fincaId } = await params;
  const finca = await getFincaForUser(prisma, fincaId, userId);
  if (!finca) {
    return NextResponse.json({ error: "Finca no encontrada" }, { status: 404 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }
  const result = validateParcela(body);
  if (!result.ok) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }
  const parcela = await prisma.parcela.create({
    data: {
      fincaId,
      nombre: result.data.nombre,
      cultivo: result.data.cultivo,
      superficie: result.data.superficie,
      notas: result.data.notas,
      referenciaCatastral: result.data.referenciaCatastral,
    },
  });
  return NextResponse.json({ data: parcela }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/api-auth";
import { validateFinca } from "@/lib/validations/finca";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

/** Index: listado de fincas del usuario con paginación */
export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
  );
  const skip = (page - 1) * pageSize;

  const [fincas, total] = await Promise.all([
    prisma.finca.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        _count: { select: { parcelas: true } },
      },
    }),
    prisma.finca.count({ where: { userId } }),
  ]);

  const data = fincas.map((f) => ({
    id: f.id,
    nombre: f.nombre,
    ubicacion: f.ubicacion,
    superficie: f.superficie,
    notas: f.notas,
    referenciaCatastral: f.referenciaCatastral,
    createdAt: f.createdAt,
    parcelasCount: f._count.parcelas,
  }));

  return NextResponse.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

/** Store: crear finca */
export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }
  const result = validateFinca(body);
  if (!result.ok) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }
  const finca = await prisma.finca.create({
    data: {
      userId,
      nombre: result.data.nombre,
      ubicacion: result.data.ubicacion,
      superficie: result.data.superficie,
      notas: result.data.notas,
      referenciaCatastral: result.data.referenciaCatastral,
    },
  });
  return NextResponse.json({ data: finca }, { status: 201 });
}

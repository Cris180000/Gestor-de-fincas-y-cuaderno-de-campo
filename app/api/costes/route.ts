import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/api-auth";
import { validateCosteCreate } from "@/lib/validations/coste";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

/** Listar costes del usuario con filtros (fincaId, parcelaId, desde, hasta, tipo) */
export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE));
  const skip = (page - 1) * pageSize;
  const fincaId = searchParams.get("fincaId") ?? undefined;
  const parcelaId = searchParams.get("parcelaId") ?? undefined;
  const desde = searchParams.get("desde") ?? undefined;
  const hasta = searchParams.get("hasta") ?? undefined;
  const tipo = searchParams.get("tipo") ?? undefined;

  const where: { userId: string; fincaId?: string | null; parcelaId?: string | null; tipo?: string; fecha?: { gte?: Date; lte?: Date } } = { userId };
  if (fincaId) where.fincaId = fincaId;
  if (parcelaId) where.parcelaId = parcelaId;
  if (tipo && (tipo === "directo" || tipo === "indirecto")) where.tipo = tipo;
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

  const [costes, total] = await Promise.all([
    prisma.coste.findMany({
      where,
      orderBy: { fecha: "desc" },
      skip,
      take: pageSize,
      include: {
        finca: { select: { id: true, nombre: true } },
        parcela: { select: { id: true, nombre: true } },
      },
    }),
    prisma.coste.count({ where }),
  ]);

  const data = costes.map((c) => ({
    id: c.id,
    fincaId: c.fincaId,
    parcelaId: c.parcelaId,
    fecha: c.fecha,
    tipo: c.tipo,
    categoria: c.categoria,
    concepto: c.concepto,
    importeCentimos: c.importeCentimos,
    createdAt: c.createdAt,
    finca: c.finca,
    parcela: c.parcela,
  }));

  return NextResponse.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

/** Crear coste */
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
  const result = validateCosteCreate(body);
  if (!result.ok) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  if (result.data.fincaId) {
    const finca = await prisma.finca.findFirst({ where: { id: result.data.fincaId, userId } });
    if (!finca) return NextResponse.json({ error: "Finca no encontrada o no autorizada" }, { status: 404 });
  }
  if (result.data.parcelaId) {
    const parcela = await prisma.parcela.findFirst({ where: { id: result.data.parcelaId, finca: { userId } } });
    if (!parcela) return NextResponse.json({ error: "Parcela no encontrada o no autorizada" }, { status: 404 });
  }

  const coste = await prisma.coste.create({
    data: {
      userId,
      fincaId: result.data.fincaId ?? null,
      parcelaId: result.data.parcelaId ?? null,
      fecha: new Date(result.data.fecha),
      tipo: result.data.tipo,
      categoria: result.data.categoria,
      concepto: result.data.concepto,
      importeCentimos: result.data.importeCentimos,
    },
    include: {
      finca: { select: { id: true, nombre: true } },
      parcela: { select: { id: true, nombre: true } },
    },
  });

  return NextResponse.json({
    data: {
      id: coste.id,
      fincaId: coste.fincaId,
      parcelaId: coste.parcelaId,
      fecha: coste.fecha,
      tipo: coste.tipo,
      categoria: coste.categoria,
      concepto: coste.concepto,
      importeCentimos: coste.importeCentimos,
      createdAt: coste.createdAt,
      finca: coste.finca,
      parcela: coste.parcela,
    },
  }, { status: 201 });
}

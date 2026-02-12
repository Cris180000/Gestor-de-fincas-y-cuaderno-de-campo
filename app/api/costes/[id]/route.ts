import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId, getCosteForUser } from "@/lib/api-auth";
import { validateCosteUpdate } from "@/lib/validations/coste";

/** Obtener un coste */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const coste = await getCosteForUser(prisma, id, userId);
  if (!coste) {
    return NextResponse.json({ error: "Coste no encontrado" }, { status: 404 });
  }
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
  });
}

/** Actualizar coste */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const coste = await getCosteForUser(prisma, id, userId);
  if (!coste) {
    return NextResponse.json({ error: "Coste no encontrado" }, { status: 404 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }
  const result = validateCosteUpdate(body);
  if (!result.ok) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  if (result.data.fincaId !== undefined && result.data.fincaId) {
    const finca = await prisma.finca.findFirst({ where: { id: result.data.fincaId, userId } });
    if (!finca) return NextResponse.json({ error: "Finca no encontrada" }, { status: 404 });
  }
  if (result.data.parcelaId !== undefined && result.data.parcelaId) {
    const parcela = await prisma.parcela.findFirst({ where: { id: result.data.parcelaId, finca: { userId } } });
    if (!parcela) return NextResponse.json({ error: "Parcela no encontrada" }, { status: 404 });
  }

  const updated = await prisma.coste.update({
    where: { id },
    data: {
      ...(result.data.fincaId !== undefined && { fincaId: result.data.fincaId }),
      ...(result.data.parcelaId !== undefined && { parcelaId: result.data.parcelaId }),
      ...(result.data.fecha !== undefined && { fecha: new Date(result.data.fecha) }),
      ...(result.data.tipo !== undefined && { tipo: result.data.tipo }),
      ...(result.data.categoria !== undefined && { categoria: result.data.categoria }),
      ...(result.data.concepto !== undefined && { concepto: result.data.concepto }),
      ...(result.data.importeCentimos !== undefined && { importeCentimos: result.data.importeCentimos }),
    },
    include: {
      finca: { select: { id: true, nombre: true } },
      parcela: { select: { id: true, nombre: true } },
    },
  });

  return NextResponse.json({
    data: {
      id: updated.id,
      fincaId: updated.fincaId,
      parcelaId: updated.parcelaId,
      fecha: updated.fecha,
      tipo: updated.tipo,
      categoria: updated.categoria,
      concepto: updated.concepto,
      importeCentimos: updated.importeCentimos,
      createdAt: updated.createdAt,
      finca: updated.finca,
      parcela: updated.parcela,
    },
  });
}

/** Eliminar coste */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const coste = await getCosteForUser(prisma, id, userId);
  if (!coste) {
    return NextResponse.json({ error: "Coste no encontrado" }, { status: 404 });
  }
  await prisma.coste.delete({ where: { id } });
  return NextResponse.json({ ok: true }, { status: 200 });
}

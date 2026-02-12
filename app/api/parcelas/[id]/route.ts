import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId, getParcelaForUser } from "@/lib/api-auth";
import { validateParcela } from "@/lib/validations/parcela";

/** Show: una parcela (solo si la finca es del usuario) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const parcela = await getParcelaForUser(prisma, id, userId);
  if (!parcela) {
    return NextResponse.json({ error: "Parcela no encontrada" }, { status: 404 });
  }
  return NextResponse.json({
    data: {
      ...parcela,
      finca: parcela.finca
        ? { id: parcela.finca.id, nombre: parcela.finca.nombre }
        : undefined,
    },
  });
}

/** Update: editar parcela */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const parcela = await getParcelaForUser(prisma, id, userId);
  if (!parcela) {
    return NextResponse.json({ error: "Parcela no encontrada" }, { status: 404 });
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
  const updated = await prisma.parcela.update({
    where: { id },
    data: {
      nombre: result.data.nombre,
      cultivo: result.data.cultivo,
      superficie: result.data.superficie,
      notas: result.data.notas,
      referenciaCatastral: result.data.referenciaCatastral,
    },
  });
  return NextResponse.json({ data: updated });
}

/** Destroy: eliminar parcela */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const parcela = await getParcelaForUser(prisma, id, userId);
  if (!parcela) {
    return NextResponse.json({ error: "Parcela no encontrada" }, { status: 404 });
  }
  await prisma.parcela.delete({ where: { id } });
  return NextResponse.json({ ok: true }, { status: 200 });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId, getFincaForUser } from "@/lib/api-auth";
import { validateFinca } from "@/lib/validations/finca";

/** Show: una finca (solo si es del usuario) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const finca = await getFincaForUser(prisma, id, userId);
  if (!finca) {
    return NextResponse.json({ error: "Finca no encontrada" }, { status: 404 });
  }
  const parcelasCount = finca.parcelas?.length ?? 0;
  return NextResponse.json({
    data: {
      id: finca.id,
      nombre: finca.nombre,
      ubicacion: finca.ubicacion,
      superficie: finca.superficie,
      notas: finca.notas,
      referenciaCatastral: finca.referenciaCatastral,
      createdAt: finca.createdAt,
      parcelasCount,
    },
  });
}

/** Update: editar finca */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const finca = await getFincaForUser(prisma, id, userId);
  if (!finca) {
    return NextResponse.json({ error: "Finca no encontrada" }, { status: 404 });
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
  const updated = await prisma.finca.update({
    where: { id },
    data: {
      nombre: result.data.nombre,
      ubicacion: result.data.ubicacion,
      superficie: result.data.superficie,
      notas: result.data.notas,
      referenciaCatastral: result.data.referenciaCatastral,
    },
  });
  return NextResponse.json({ data: updated });
}

/** Destroy: eliminar finca (cascade parcelas) */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const finca = await getFincaForUser(prisma, id, userId);
  if (!finca) {
    return NextResponse.json({ error: "Finca no encontrada" }, { status: 404 });
  }
  await prisma.finca.delete({ where: { id } });
  return NextResponse.json({ ok: true }, { status: 200 });
}

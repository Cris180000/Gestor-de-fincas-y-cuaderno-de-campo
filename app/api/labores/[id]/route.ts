import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId, getLaborForUser } from "@/lib/api-auth";
import { validateLaborUpdate } from "@/lib/validations/labor";
import { validateFitosanitario } from "@/lib/fitosanitarios";
import { calcularNpkParaAbonado, DEFAULT_N_LIMIT_ZV } from "@/lib/npk";

/** Show: una labor (solo si la parcela es del usuario) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const labor = await getLaborForUser(prisma, id, userId);
  if (!labor) {
    return NextResponse.json({ error: "Labor no encontrada" }, { status: 404 });
  }
  return NextResponse.json({
    data: {
      id: labor.id,
      parcelaId: labor.parcelaId,
      tipo: labor.tipo,
      fecha: labor.fecha,
      descripcion: labor.descripcion,
      producto: labor.producto,
      cantidad: labor.cantidad,
      estado: labor.estado,
      realizadaAt: labor.realizadaAt,
      lat: labor.lat,
      lon: labor.lon,
      createdAt: labor.createdAt,
      parcela: {
        id: labor.parcela.id,
        nombre: labor.parcela.nombre,
        finca: labor.parcela.finca ? { id: labor.parcela.finca.id, nombre: labor.parcela.finca.nombre } : undefined,
      },
    },
  });
}

/** Update: editar labor */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const labor = await getLaborForUser(prisma, id, userId);
  if (!labor) {
    return NextResponse.json({ error: "Labor no encontrada" }, { status: 404 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }
  const result = validateLaborUpdate(body);
  if (!result.ok) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  const tipoFinal = result.data.tipo ?? labor.tipo;
  if (tipoFinal === "tratamiento") {
    const productoFinal = result.data.producto ?? labor.producto ?? "";
    const cantidadFinal = result.data.cantidad ?? labor.cantidad ?? "";
    const cultivoParcela = labor.parcela.cultivo ?? null;
    const validacion = validateFitosanitario(productoFinal, cultivoParcela, cantidadFinal);
    if (!validacion.ok) {
      return NextResponse.json(
        {
          error: validacion.message,
          code: validacion.code,
          detalle: validacion.detalle,
        },
        { status: 400 }
      );
    }
  }

  let nKgHa: number | undefined = labor.nKgHa ?? undefined;
  let pKgHa: number | undefined = labor.pKgHa ?? undefined;
  let kKgHa: number | undefined = labor.kKgHa ?? undefined;

  if (tipoFinal === "abonado") {
    const productoFinal = result.data.producto ?? labor.producto ?? "";
    const cantidadFinal = result.data.cantidad ?? labor.cantidad ?? "";
    const npk = calcularNpkParaAbonado(productoFinal, cantidadFinal);
    if (!npk.ok) {
      return NextResponse.json(
        {
          error: npk.message,
          code: npk.code,
        },
        { status: 400 }
      );
    }
    nKgHa = npk.data.nKgHa;
    pKgHa = npk.data.pKgHa;
    kKgHa = npk.data.kKgHa;

    if (labor.parcela.zonaVulnerableNitratos) {
      const fechaFinalStr = result.data.fecha ?? labor.fecha.toISOString().slice(0, 10);
      const fechaFinal = new Date(fechaFinalStr);
      const year = fechaFinal.getFullYear();
      const desdeAnio = new Date(year, 0, 1);
      const hastaAnio = new Date(year, 11, 31, 23, 59, 59, 999);

      const agg = await prisma.labor.aggregate({
        where: {
          parcelaId: labor.parcelaId,
          tipo: "abonado",
          fecha: { gte: desdeAnio, lte: hastaAnio },
          NOT: { id: labor.id },
        },
        _sum: { nKgHa: true },
      });
      const nAcumuladoOtros = agg._sum.nKgHa ?? 0;
      const nTotalConEsta = nAcumuladoOtros + nKgHa;
      const limite = labor.parcela.limiteNAnualNkgHa ?? DEFAULT_N_LIMIT_ZV;
      if (nTotalConEsta > limite + 1e-6) {
        return NextResponse.json(
          {
            error: "Se supera el límite anual de Nitrógeno en Zona Vulnerable a Nitratos.",
            code: "N_LIMITE_SUPERADO",
            detalle: `N aplicado con esta aportación: ${nTotalConEsta.toFixed(
              1
            )} kg N/ha (límite ${limite} kg N/ha).`,
          },
          { status: 400 }
        );
      }
    }
  } else {
    // Si deja de ser abonado, limpiamos NPK
    nKgHa = undefined;
    pKgHa = undefined;
    kKgHa = undefined;
  }

  const updateData: Parameters<typeof prisma.labor.update>[0]["data"] = {
    ...(result.data.tipo !== undefined && { tipo: result.data.tipo }),
    ...(result.data.fecha !== undefined && { fecha: new Date(result.data.fecha) }),
    ...(result.data.descripcion !== undefined && { descripcion: result.data.descripcion }),
    ...(result.data.producto !== undefined && { producto: result.data.producto }),
    ...(result.data.cantidad !== undefined && { cantidad: result.data.cantidad }),
    ...(result.data.estado !== undefined && { estado: result.data.estado }),
    ...(result.data.lat !== undefined && { lat: result.data.lat }),
    ...(result.data.lon !== undefined && { lon: result.data.lon }),
    nKgHa,
    pKgHa,
    kKgHa,
  };
  if (result.data.estado === "realizada") {
    updateData.realizadaAt = new Date();
  }
  if (result.data.estado === "pendiente") {
    updateData.realizadaAt = null;
    updateData.lat = null;
    updateData.lon = null;
  }

  const updated = await prisma.labor.update({
    where: { id },
    data: updateData,
    include: {
      parcela: { include: { finca: { select: { id: true, nombre: true } } } },
    },
  });
  return NextResponse.json({
    data: {
      id: updated.id,
      parcelaId: updated.parcelaId,
      tipo: updated.tipo,
      fecha: updated.fecha,
      descripcion: updated.descripcion,
      producto: updated.producto,
      cantidad: updated.cantidad,
      estado: updated.estado,
      realizadaAt: updated.realizadaAt,
      lat: updated.lat,
      lon: updated.lon,
      createdAt: updated.createdAt,
      parcela: { id: updated.parcela.id, nombre: updated.parcela.nombre, finca: updated.parcela.finca },
    },
  });
}

/** Destroy: eliminar labor */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const labor = await getLaborForUser(prisma, id, userId);
  if (!labor) {
    return NextResponse.json({ error: "Labor no encontrada" }, { status: 404 });
  }
  await prisma.labor.delete({ where: { id } });
  return NextResponse.json({ ok: true }, { status: 200 });
}

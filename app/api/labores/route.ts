import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/api-auth";
import { validateLaborCreate } from "@/lib/validations/labor";
import { validateFitosanitario } from "@/lib/fitosanitarios";
import { calcularNpkParaAbonado, DEFAULT_N_LIMIT_ZV } from "@/lib/npk";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;
const TIPOS_VALIDOS = ["riego", "abonado", "tratamiento", "poda", "cosecha", "otros"];

/** Index: listado de labores del usuario con paginación y filtros combinables */
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
  const fincaId = searchParams.get("fincaId") ?? undefined;
  const parcelaId = searchParams.get("parcelaId") ?? undefined;
  const tipo = searchParams.get("tipo") ?? undefined;
  const desde = searchParams.get("desde") ?? undefined; // YYYY-MM-DD
  const hasta = searchParams.get("hasta") ?? undefined; // YYYY-MM-DD

  const parcelaWhere: { finca: { userId: string }; id?: string; fincaId?: string } = {
    finca: { userId },
  };
  if (fincaId) parcelaWhere.fincaId = fincaId;
  if (parcelaId) parcelaWhere.id = parcelaId;

  const fechaFilter: { gte?: Date; lte?: Date } = {};
  if (desde) {
    const d = new Date(desde);
    if (!Number.isNaN(d.getTime())) fechaFilter.gte = d;
  }
  if (hasta) {
    const d = new Date(hasta);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      fechaFilter.lte = d;
    }
  }

  const where = {
    parcela: parcelaWhere,
    ...(tipo && TIPOS_VALIDOS.includes(tipo) ? { tipo } : {}),
    ...(Object.keys(fechaFilter).length > 0 ? { fecha: fechaFilter } : {}),
  };

  const [labores, total] = await Promise.all([
    prisma.labor.findMany({
      where,
      orderBy: { fecha: "desc" },
      skip,
      take: pageSize,
      include: {
        parcela: { include: { finca: { select: { id: true, nombre: true } } } },
      },
    }),
    prisma.labor.count({ where }),
  ]);

  const data = labores.map((l) => ({
    id: l.id,
    parcelaId: l.parcelaId,
    tipo: l.tipo,
    fecha: l.fecha,
    descripcion: l.descripcion,
    producto: l.producto,
    cantidad: l.cantidad,
    estado: l.estado,
    realizadaAt: l.realizadaAt,
    lat: l.lat,
    lon: l.lon,
    weatherWarningIgnored: l.weatherWarningIgnored ?? false,
    createdAt: l.createdAt,
    parcela: { id: l.parcela.id, nombre: l.parcela.nombre, finca: l.parcela.finca },
  }));

  return NextResponse.json({
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

/** Store: crear labor (parcela debe ser del usuario) */
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
  const result = validateLaborCreate(body);
  if (!result.ok) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }
  const parcela = await prisma.parcela.findFirst({
    where: { id: result.data.parcelaId, finca: { userId } },
  });
  if (!parcela) {
    return NextResponse.json({ error: "Parcela no encontrada o no autorizada" }, { status: 404 });
  }

  if (result.data.tipo === "tratamiento") {
    const validacion = validateFitosanitario(
      result.data.producto ?? "",
      parcela.cultivo ?? null,
      result.data.cantidad ?? ""
    );
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

  let nKgHa: number | undefined;
  let pKgHa: number | undefined;
  let kKgHa: number | undefined;

  if (result.data.tipo === "abonado") {
    const npk = calcularNpkParaAbonado(result.data.producto ?? "", result.data.cantidad ?? "");
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

    if (parcela.zonaVulnerableNitratos) {
      const fecha = new Date(result.data.fecha);
      const year = fecha.getFullYear();
      const desdeAnio = new Date(year, 0, 1);
      const hastaAnio = new Date(year, 11, 31, 23, 59, 59, 999);

      const agg = await prisma.labor.aggregate({
        where: {
          parcelaId: parcela.id,
          tipo: "abonado",
          fecha: { gte: desdeAnio, lte: hastaAnio },
        },
        _sum: { nKgHa: true },
      });
      const nAcumuladoPrevio = agg._sum.nKgHa ?? 0;
      const nTotalConEsta = nAcumuladoPrevio + nKgHa;
      const limite = parcela.limiteNAnualNkgHa ?? DEFAULT_N_LIMIT_ZV;
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
  }

  const labor = await prisma.labor.create({
    data: {
      parcelaId: result.data.parcelaId,
      tipo: result.data.tipo,
      fecha: new Date(result.data.fecha),
      descripcion: result.data.descripcion,
      producto: result.data.producto,
      cantidad: result.data.cantidad,
      nKgHa,
      pKgHa,
      kKgHa,
      weatherWarningIgnored: result.data.weatherWarningIgnored ?? false,
    },
    include: {
      parcela: { include: { finca: { select: { id: true, nombre: true } } } },
    },
  });
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
      weatherWarningIgnored: labor.weatherWarningIgnored ?? false,
      createdAt: labor.createdAt,
      parcela: { id: labor.parcela.id, nombre: labor.parcela.nombre, finca: labor.parcela.finca },
    },
  }, { status: 201 });
}

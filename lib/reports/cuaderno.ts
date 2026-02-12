import { prisma } from "@/lib/prisma";

interface BuildCuadernoParams {
  userId: string;
  fincaId?: string;
  parcelaId?: string;
  desde?: string; // YYYY-MM-DD
  hasta?: string; // YYYY-MM-DD
}

export interface CuadernoReport {
  generatedAt: string;
  period: { desde: string; hasta: string };
  fincas: Array<{
    id: string;
    nombre: string;
    parcelas: Array<{
      id: string;
      nombre: string;
      cultivo: string | null;
      superficieHa: number | null;
      labores: Array<{
        id: string;
        fecha: string;
        tipo: string;
        descripcion: string;
        producto: string | null;
        cantidad: string | null;
      }>;
      incidencias: Array<{
        id: string;
        fecha: string;
        descripcion: string;
        estado: string;
      }>;
    }>;
  }>;
}

function parseDateOrNull(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function buildCuadernoReport(params: BuildCuadernoParams): Promise<CuadernoReport> {
  const hoy = new Date();
  const yearStart = new Date(hoy.getFullYear(), 0, 1);

  const desdeDate = parseDateOrNull(params.desde) ?? yearStart;
  const hastaDate = (() => {
    const d = parseDateOrNull(params.hasta) ?? hoy;
    d.setHours(23, 59, 59, 999);
    return d;
  })();

  const parcelaWhere: {
    finca: { userId: string; id?: string };
    id?: string;
  } = {
    finca: { userId: params.userId },
  };
  if (params.fincaId) parcelaWhere.finca.id = params.fincaId;
  if (params.parcelaId) parcelaWhere.id = params.parcelaId;

  const parcelas = await prisma.parcela.findMany({
    where: parcelaWhere,
    select: {
      id: true,
      nombre: true,
      cultivo: true,
      superficie: true,
      finca: { select: { id: true, nombre: true } },
    },
  });

  const parcelaIds = parcelas.map((p) => p.id);
  let labores: { id: string; parcelaId: string; fecha: Date; tipo: string; descripcion: string; producto: string | null; cantidad: string | null }[] = [];
  let incidencias: { id: string; parcelaId: string; fecha: Date; descripcion: string; estado: string }[] = [];

  if (parcelaIds.length > 0) {
    labores = await prisma.labor.findMany({
      where: {
        parcelaId: { in: parcelaIds },
        fecha: { gte: desdeDate, lte: hastaDate },
      },
      select: {
        id: true,
        parcelaId: true,
        fecha: true,
        tipo: true,
        descripcion: true,
        producto: true,
        cantidad: true,
      },
      orderBy: { fecha: "asc" },
    });

    incidencias = await prisma.incidencia.findMany({
      where: {
        parcelaId: { in: parcelaIds },
        fecha: { gte: desdeDate, lte: hastaDate },
      },
      select: {
        id: true,
        parcelaId: true,
        fecha: true,
        descripcion: true,
        estado: true,
      },
      orderBy: { fecha: "asc" },
    });
  }

  const fincasMap = new Map<
    string,
    {
      id: string;
      nombre: string;
      parcelas: CuadernoReport["fincas"][number]["parcelas"];
    }
  >();

  for (const p of parcelas) {
    const fincaId = p.finca.id;
    if (!fincasMap.has(fincaId)) {
      fincasMap.set(fincaId, { id: fincaId, nombre: p.finca.nombre, parcelas: [] });
    }
    const fincaEntry = fincasMap.get(fincaId)!;
    fincaEntry.parcelas.push({
      id: p.id,
      nombre: p.nombre,
      cultivo: p.cultivo ?? null,
      superficieHa: p.superficie ?? null,
      labores: [],
      incidencias: [],
    });
  }

  const parcelaEntryMap = new Map<string, CuadernoReport["fincas"][number]["parcelas"][number]>();
  for (const finca of fincasMap.values()) {
    for (const parcela of finca.parcelas) {
      parcelaEntryMap.set(parcela.id, parcela);
    }
  }

  for (const l of labores) {
    const parcela = parcelaEntryMap.get(l.parcelaId);
    if (!parcela) continue;
    parcela.labores.push({
      id: l.id,
      fecha: l.fecha.toISOString(),
      tipo: l.tipo,
      descripcion: l.descripcion,
      producto: l.producto,
      cantidad: l.cantidad,
    });
  }

  for (const i of incidencias) {
    const parcela = parcelaEntryMap.get(i.parcelaId);
    if (!parcela) continue;
    parcela.incidencias.push({
      id: i.id,
      fecha: i.fecha.toISOString(),
      descripcion: i.descripcion,
      estado: i.estado,
    });
  }

  const desdeStr = desdeDate.toISOString().slice(0, 10);
  const hastaStr = hastaDate.toISOString().slice(0, 10);

  return {
    generatedAt: new Date().toISOString(),
    period: { desde: desdeStr, hasta: hastaStr },
    fincas: Array.from(fincasMap.values()),
  };
}


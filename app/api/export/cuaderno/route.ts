import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/api-auth";
import { buildCuadernoReport } from "@/lib/reports/cuaderno";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const fincaId = searchParams.get("fincaId") ?? undefined;
  const parcelaId = searchParams.get("parcelaId") ?? undefined;
  const desde = searchParams.get("desde") ?? undefined;
  const hasta = searchParams.get("hasta") ?? undefined;
  const format = (searchParams.get("format") ?? "json").toLowerCase();

  const report = await buildCuadernoReport({ userId, fincaId, parcelaId, desde, hasta });

  if (format === "xml") {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<CuadernoCampo desde="${escapeXml(report.period.desde)}" hasta="${escapeXml(
      report.period.hasta
    )}" generado="${escapeXml(report.generatedAt)}">`;
    for (const finca of report.fincas) {
      xml += `\n  <Finca id="${escapeXml(finca.id)}" nombre="${escapeXml(finca.nombre)}">`;
      for (const parcela of finca.parcelas) {
        xml += `\n    <Parcela id="${escapeXml(parcela.id)}" nombre="${escapeXml(
          parcela.nombre
        )}" cultivo="${escapeXml(parcela.cultivo ?? "")}" superficieHa="${parcela.superficieHa ?? ""}">`;
        for (const labor of parcela.labores) {
          xml += `\n      <Labor id="${escapeXml(labor.id)}" fecha="${escapeXml(
            labor.fecha
          )}" tipo="${escapeXml(labor.tipo)}">`;
          xml += `\n        <Descripcion>${escapeXml(labor.descripcion)}</Descripcion>`;
          if (labor.producto) {
            xml += `\n        <Producto>${escapeXml(labor.producto)}</Producto>`;
          }
          if (labor.cantidad) {
            xml += `\n        <Cantidad>${escapeXml(labor.cantidad)}</Cantidad>`;
          }
          xml += `\n      </Labor>`;
        }
        for (const inc of parcela.incidencias) {
          xml += `\n      <Incidencia id="${escapeXml(inc.id)}" fecha="${escapeXml(
            inc.fecha
          )}" estado="${escapeXml(inc.estado)}">`;
          xml += `\n        <Descripcion>${escapeXml(inc.descripcion)}</Descripcion>`;
          xml += `\n      </Incidencia>`;
        }
        xml += `\n    </Parcela>`;
      }
      xml += `\n  </Finca>`;
    }
    xml += `\n</CuadernoCampo>\n`;

    return new Response(xml, {
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="cuaderno.xml"`,
      },
    });
  }

  // JSON (por defecto)
  return NextResponse.json(report, {
    headers: {
      "Content-Disposition": `attachment; filename="cuaderno.json"`,
    },
  });
}


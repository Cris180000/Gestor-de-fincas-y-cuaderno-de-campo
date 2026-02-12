import { NextRequest, NextResponse } from "next/server";

const COPERNICUS_WMS_BASE = "https://sh.dataspace.copernicus.eu/ogc/wms";

/**
 * Proxy WMS hacia Copernicus Data Space (Sentinel-2 NDVI y otras capas).
 * Requiere COPERNICUS_WMS_INSTANCE_ID en .env (registro gratuito en dataspace.copernicus.eu).
 * Uso: el cliente envía los parámetros WMS estándar; nosotros añadimos el instance ID.
 */
export async function GET(request: NextRequest) {
  const instanceId = process.env.COPERNICUS_WMS_INSTANCE_ID;
  if (!instanceId?.trim()) {
    return NextResponse.json(
      { error: "NDVI no configurado: falta COPERNICUS_WMS_INSTANCE_ID. Regístrate en dataspace.copernicus.eu y añade tu Instance ID en .env" },
      { status: 503 }
    );
  }

  const { searchParams } = request.nextUrl;
  const params = new URLSearchParams(searchParams);
  if (!params.get("TIME")) {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 30);
    params.set("TIME", `${start.toISOString().slice(0, 10)}/${end.toISOString().slice(0, 10)}`);
  }
  if (!params.get("LAYERS")) params.set("LAYERS", "NDVI");
  if (!params.get("VERSION")) params.set("VERSION", "1.3.0");
  if (!params.get("CRS") && !params.get("SRS")) params.set("CRS", "EPSG:3857");
  if (!params.get("FORMAT")) params.set("FORMAT", "image/png");

  const url = `${COPERNICUS_WMS_BASE}/${encodeURIComponent(instanceId.trim())}?${params.toString()}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "image/png, image/jpeg" },
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Servicio NDVI no disponible: ${res.status}. ${text.slice(0, 200)}` },
        { status: res.status }
      );
    }

    const contentType = res.headers.get("content-type") || "image/png";
    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error de conexión con el servicio de imágenes";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

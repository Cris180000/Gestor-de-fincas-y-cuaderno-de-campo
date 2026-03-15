import { NextRequest, NextResponse } from "next/server";

const COPERNICUS_WMS_BASE = "https://sh.dataspace.copernicus.eu/ogc/wms";

/**
 * GET /api/copernicus/wms
 * Proxy WMS hacia Copernicus con autenticación Bearer.
 * Query: token (obligatorio) + todos los parámetros WMS (REQUEST, LAYERS, BBOX, etc.).
 * No reenvía el parámetro "token" a Copernicus.
 */
export async function GET(request: NextRequest) {
  try {
    const instanceId = process.env.COPERNICUS_WMS_INSTANCE_ID;
    if (!instanceId?.trim()) {
      return NextResponse.json(
        { error: "Falta COPERNICUS_WMS_INSTANCE_ID en .env" },
        { status: 503 }
      );
    }

    const { searchParams } = request.nextUrl;
    const token = searchParams.get("token");
    if (!token?.trim()) {
      return NextResponse.json(
        { error: "Falta parámetro token en la petición WMS" },
        { status: 400 }
      );
    }

    const params = new URLSearchParams(searchParams);
    params.delete("token");
    if (!params.get("VERSION")) params.set("VERSION", "1.3.0");
    if (!params.get("CRS") && !params.get("SRS")) params.set("CRS", "EPSG:3857");

    const url = `${COPERNICUS_WMS_BASE}/${encodeURIComponent(instanceId.trim())}?${params.toString()}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "image/png, image/jpeg",
        Authorization: `Bearer ${token.trim()}`,
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `WMS Copernicus: ${res.status}. ${text.slice(0, 200)}` },
        { status: res.status >= 500 ? 502 : res.status }
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
    const msg = e instanceof Error ? e.message : "Error de conexión con WMS";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

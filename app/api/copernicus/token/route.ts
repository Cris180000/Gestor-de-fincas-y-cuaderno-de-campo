import { NextResponse } from "next/server";

const COPERNICUS_TOKEN_URL =
  "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";

/**
 * POST /api/copernicus/token
 * Obtiene un access_token de Copernicus Data Space (client credentials).
 * Requiere COPERNICUS_CLIENT_ID y COPERNICUS_CLIENT_SECRET en .env.
 */
export async function POST() {
  try {
    const clientId = process.env.COPERNICUS_CLIENT_ID;
    const clientSecret = process.env.COPERNICUS_CLIENT_SECRET;

    if (!clientId?.trim() || !clientSecret?.trim()) {
      return NextResponse.json(
        {
          error:
            "Copernicus no configurado: faltan COPERNICUS_CLIENT_ID o COPERNICUS_CLIENT_SECRET en .env",
        },
        { status: 503 }
      );
    }

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId.trim(),
      client_secret: clientSecret.trim(),
    });

    const res = await fetch(COPERNICUS_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      signal: AbortSignal.timeout(15000),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message =
        typeof data.error_description === "string"
          ? data.error_description
          : data.error ?? `Token no disponible: ${res.status}`;
      return NextResponse.json(
        { error: message },
        { status: res.status >= 500 ? 502 : res.status }
      );
    }

    const accessToken = data.access_token;
    if (!accessToken || typeof accessToken !== "string") {
      return NextResponse.json(
        { error: "Respuesta de Copernicus sin access_token" },
        { status: 502 }
      );
    }

    return NextResponse.json({ access_token: accessToken });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al obtener token";
    const isAbort = e instanceof Error && e.name === "AbortError";
    return NextResponse.json(
      { error: isAbort ? "Tiempo de espera agotado" : message },
      { status: 502 }
    );
  }
}

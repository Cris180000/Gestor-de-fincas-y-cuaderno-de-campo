import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId, getParcelaForUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { analyzeCropDisease } from "@/app/diagnosis/actions";

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

  const { imageBase64, parcelaId } = body as { imageBase64?: string; parcelaId?: string };

  if (!imageBase64 || typeof imageBase64 !== "string") {
    return NextResponse.json(
      { error: "Falta la imagen en formato base64 para el diagnóstico." },
      { status: 400 }
    );
  }

  let parcelaIdReal: string | null = null;
  if (parcelaId) {
    const parcela = await getParcelaForUser(prisma, parcelaId, userId);
    if (!parcela) {
      return NextResponse.json(
        { error: "Parcela no encontrada o no pertenece al usuario." },
        { status: 404 }
      );
    }
    parcelaIdReal = parcela.id;
  }

  try {
    const result = await analyzeCropDisease(imageBase64);

    // Intentamos guardar en BD, pero si el cliente de Prisma aún no tiene el modelo
    // Diagnostico (por no haber regenerado), no bloqueamos el flujo.
    try {
      await prisma.diagnostico.create({
        data: {
          userId,
          parcelaId: parcelaIdReal,
          sintomas: "Diagnóstico por imagen (IA).",
          resumen: result.summary,
          enfermedadPrincipal: result.enfermedad ?? null,
          confianza: typeof result.confianza === "number" ? Math.round(result.confianza) : null,
          tratamientoQuimico: result.tratamientoQuimico ?? null,
          tratamientoEcologico: result.tratamientoEcologico ?? null,
        },
      });
    } catch (dbError) {
      console.error("Error al guardar diagnóstico por imagen en BD:", dbError);
      // Seguimos adelante: devolvemos el resultado aunque no se haya guardado.
    }

    return NextResponse.json({ data: result });
  } catch (e) {
    console.error("Error al analizar imagen de cultivo:", e);
    return NextResponse.json(
      { error: "No se pudo analizar la imagen. Inténtalo de nuevo más tarde." },
      { status: 500 }
    );
  }
}


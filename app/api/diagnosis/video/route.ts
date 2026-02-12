import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId, getParcelaForUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { analyzeCropDiseaseFromFrames } from "@/app/diagnosis/actions";

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

  const { framesBase64, parcelaId } = body as {
    framesBase64?: string[];
    parcelaId?: string;
  };

  if (!Array.isArray(framesBase64) || framesBase64.length === 0) {
    return NextResponse.json(
      { error: "Se esperaba un array de frames en base64 para el diagnóstico por vídeo." },
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
    const result = await analyzeCropDiseaseFromFrames(framesBase64);

    // Guardamos en historial, pero si el cliente de Prisma aún no tiene el modelo Diagnostico
    // o la tabla no existe, no bloqueamos la respuesta.
    try {
      await prisma.diagnostico.create({
        data: {
          userId,
          parcelaId: parcelaIdReal,
          sintomas: "Diagnóstico por vídeo (IA).",
          resumen: result.summary,
          enfermedadPrincipal: result.enfermedad ?? null,
          confianza: typeof result.confianza === "number" ? Math.round(result.confianza) : null,
          tratamientoQuimico: result.tratamientoQuimico ?? null,
          tratamientoEcologico: result.tratamientoEcologico ?? null,
        },
      });
    } catch (dbError) {
      console.error("Error al guardar diagnóstico por vídeo en BD:", dbError);
    }

    return NextResponse.json({ data: result });
  } catch (e) {
    console.error("Error al analizar vídeo de cultivo:", e);
    return NextResponse.json(
      { error: "No se pudo analizar el vídeo. Inténtalo de nuevo más tarde." },
      { status: 500 }
    );
  }
}


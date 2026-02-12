import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId, getParcelaForUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { diagnoseFromTextWithAI } from "@/lib/diagnosis-text-ai";

export async function POST(request: NextRequest) {
  try {
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

    const b = body as { sintomas?: string; parcelaId?: string };
    const sintomas = (b.sintomas ?? "").trim();
    if (!sintomas) {
      return NextResponse.json(
        { error: "Los síntomas son obligatorios para generar un diagnóstico." },
        { status: 400 }
      );
    }

    // Si viene parcelaId, comprobamos que pertenece al usuario y obtenemos contexto
    let parcelaId: string | null = null;
    let contextoParcela: string | undefined;
    if (b.parcelaId) {
      const parcela = await getParcelaForUser(prisma, b.parcelaId, userId);
      if (!parcela) {
        return NextResponse.json(
          { error: "Parcela no encontrada o no pertenece al usuario." },
          { status: 404 }
        );
      }
      parcelaId = parcela.id;
      contextoParcela = parcela.cultivo
        ? `${parcela.nombre} (${parcela.cultivo})`
        : parcela.nombre;
    }

    let summary: string;
    let posiblesCausas: { causa: string; probabilidad: "baja" | "media" | "alta" }[];
    let accionesCampo: string[];
    let recomendacionesManejo: string[];

    // Intentar IA real si hay API key
    if (process.env.OPENAI_API_KEY) {
      try {
        const aiResult = await diagnoseFromTextWithAI(sintomas, contextoParcela);
        summary = aiResult.summary;
        posiblesCausas = aiResult.posiblesCausas;
        accionesCampo = aiResult.accionesCampo;
        recomendacionesManejo = aiResult.recomendacionesManejo;
      } catch (aiErr) {
        console.error("Fallo diagnóstico por texto con IA, usando mock:", aiErr);
        // Fallback a mock
        const mock = getMockDiagnosis(sintomas);
        summary = mock.summary;
        posiblesCausas = mock.posiblesCausas;
        accionesCampo = mock.accionesCampo;
        recomendacionesManejo = mock.recomendacionesManejo;
      }
    } else {
      const mock = getMockDiagnosis(sintomas);
      summary = mock.summary;
      posiblesCausas = mock.posiblesCausas;
      accionesCampo = mock.accionesCampo;
      recomendacionesManejo = mock.recomendacionesManejo;
    }

    const enfermedadPrincipal = posiblesCausas[0]?.causa ?? null;
    const confianzaHeuristica =
      posiblesCausas[0]?.probabilidad === "alta"
        ? 80
        : posiblesCausas[0]?.probabilidad === "media"
        ? 60
        : posiblesCausas[0]
        ? 30
        : null;

    try {
      await prisma.diagnostico.create({
        data: {
          userId,
          parcelaId: parcelaId ?? null,
          sintomas,
          resumen: summary,
          enfermedadPrincipal,
          confianza: confianzaHeuristica,
          tratamientoQuimico: null,
          tratamientoEcologico: null,
        },
      });
    } catch (dbError) {
      console.error("Error al guardar diagnóstico en BD:", dbError);
    }

    return NextResponse.json({
      data: {
        summary,
        posiblesCausas,
        accionesCampo,
        recomendacionesManejo,
      },
    });
  } catch (err) {
    console.error("Error en POST /api/diagnosis:", err);
    return NextResponse.json(
      { error: "Error interno al generar el diagnóstico. Inténtalo de nuevo." },
      { status: 500 }
    );
  }
}

function getMockDiagnosis(sintomas: string) {
  const lower = sintomas.toLowerCase();
  const posiblesCausas: { causa: string; probabilidad: "baja" | "media" | "alta" }[] = [];

  if (lower.includes("amarill") && lower.includes("hoja")) {
    posiblesCausas.push({ causa: "carencia de nitrógeno", probabilidad: "alta" });
  }
  if (lower.includes("mancha") && lower.includes("hoja")) {
    posiblesCausas.push({ causa: "enfermedad foliar (mildiu, roya u otra)", probabilidad: "media" });
  }
  if (lower.includes("baja") && lower.includes("vigor")) {
    posiblesCausas.push({ causa: "estrés hídrico o nutricional", probabilidad: "media" });
  }
  if (posiblesCausas.length === 0) {
    posiblesCausas.push({ causa: "causa no clara, requiere inspección en campo", probabilidad: "baja" });
  }

  const accionesCampo: string[] = [
    "Comparar zonas afectadas y sanas dentro de la misma parcela.",
    "Revisar si los síntomas se concentran en zonas con peor drenaje o compactación.",
    "Comprobar historial reciente de riegos, abonados y tratamientos.",
  ];

  const recomendacionesManejo: string[] = [
    "Tomar fotografías detalladas de hojas, tallos y suelo para futura consulta.",
    "Si se sospecha carencia nutricional, considerar un análisis de suelo o tejido antes de aplicar fertilizantes.",
    "Evitar tratamientos fitosanitarios sin confirmar la causa para no generar resistencias ni costes innecesarios.",
  ];

  const summary =
    "Este diagnóstico es orientativo y no sustituye a una visita de campo. " +
    "Utiliza las posibles causas como guía para tu comprobación en la parcela.";

  return { summary, posiblesCausas, accionesCampo, recomendacionesManejo };
}


"use server";

/**
 * Server Action: analiza una imagen de cultivo (en base64) y devuelve
 * un diagnóstico de posibles enfermedades o problemas.
 *
 * - Si existe OPENAI_API_KEY, intenta llamar a la API de OpenAI con este prompt:
 *   "Eres un agrónomo experto. Analiza esta imagen. Identifica la plaga o enfermedad,
 *    el nivel de confianza (0-100%) y recomienda un tratamiento químico y uno ecológico".
 * - Si falla la llamada o no hay API key, usa una lógica mock orientativa.
 */
export async function analyzeCropDisease(imageBase64: string): Promise<{
  summary: string;
  posiblesCausas: { causa: string; probabilidad: "baja" | "media" | "alta" }[];
  recomendaciones: string[];
  enfermedad?: string;
  confianza?: number;
  tratamientoQuimico?: string;
  tratamientoEcologico?: string;
}> {
  if (!imageBase64 || typeof imageBase64 !== "string") {
    throw new Error("Imagen inválida: se esperaba una cadena base64.");
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      const payload = {
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              'Eres un agrónomo experto. Analiza esta imagen. Identifica la plaga o enfermedad, el nivel de confianza (0-100%) y recomienda un tratamiento químico y uno ecológico. Responde estrictamente en JSON con el siguiente formato: {"plagaEnfermedad": string, "confianza": number, "tratamientoQuimico": string, "tratamientoEcologico": string}.',
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analiza esta imagen de cultivo y responde en el JSON indicado.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
      };

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        console.error("OpenAI error:", json);
        throw new Error(json.error?.message || "Error al llamar a OpenAI");
      }

      const content = json.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Respuesta vacía de OpenAI");
      }

      let parsed: {
        plagaEnfermedad: string;
        confianza: number;
        tratamientoQuimico: string;
        tratamientoEcologico: string;
      };
      try {
        parsed = JSON.parse(content);
      } catch {
        const match = content.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("No se pudo parsear el JSON devuelto por OpenAI");
        parsed = JSON.parse(match[0]);
      }

      const probabilidad: "baja" | "media" | "alta" =
        parsed.confianza >= 80 ? "alta" : parsed.confianza >= 50 ? "media" : "baja";

      const summary = `Posible problema identificado: ${parsed.plagaEnfermedad} (confianza aproximada ${parsed.confianza.toFixed(
        0
      )}%).`;

      const recomendaciones = [
        `Tratamiento químico sugerido: ${parsed.tratamientoQuimico}`,
        `Tratamiento ecológico sugerido: ${parsed.tratamientoEcologico}`,
        "Verifica siempre que cualquier tratamiento esté autorizado para el cultivo y zona, y respeta las dosis y plazos de seguridad.",
      ];

      return {
        summary,
        posiblesCausas: [
          {
            causa: parsed.plagaEnfermedad,
            probabilidad,
          },
        ],
        recomendaciones,
        enfermedad: parsed.plagaEnfermedad,
        confianza: parsed.confianza,
        tratamientoQuimico: parsed.tratamientoQuimico,
        tratamientoEcologico: parsed.tratamientoEcologico,
      };
    } catch (e) {
      console.error("Fallo al usar OpenAI, usando diagnóstico simulado:", e);
      // continúa hacia el fallback mock
    }
  }

  // Fallback mock cuando no hay API key o hay error
  const length = imageBase64.length;
  const posiblesCausas: { causa: string; probabilidad: "baja" | "media" | "alta" }[] = [];

  if (length > 200_000) {
    posiblesCausas.push({
      causa: "manchas foliares compatibles con enfermedad fúngica (mildiu, alternaria, etc.)",
      probabilidad: "media",
    });
  } else if (length > 100_000) {
    posiblesCausas.push({
      causa: "decoloraciones que podrían asociarse a deficiencias nutricionales",
      probabilidad: "media",
    });
  } else {
    posiblesCausas.push({
      causa: "no se identifican patrones claros; la resolución o el encuadre podrían ser insuficientes",
      probabilidad: "baja",
    });
  }

  const summary =
    "Este análisis de imagen es simulado y solo orientativo. " +
    "Para un diagnóstico fiable, combina las fotos con observaciones de campo y, " +
    "si es necesario, consulta con un técnico especializado.";

  const recomendaciones: string[] = [
    "Toma varias fotos: plano general de la planta y primeros planos de hojas afectadas.",
    "Asegúrate de que las fotos tengan buena luz y enfoque para facilitar el análisis.",
    "Anota en el cuaderno de campo la fecha, parcela y síntomas observados junto con la foto.",
  ];

  return {
    summary,
    posiblesCausas,
    recomendaciones,
    enfermedad: posiblesCausas[0]?.causa ?? "Enfermedad no identificada",
    confianza: 40,
    tratamientoQuimico:
      "Consulta el registro oficial de fitosanitarios y selecciona un producto autorizado para el cultivo y la plaga sospechada.",
    tratamientoEcologico:
      "Valora medidas preventivas: mejora de ventilación, reducción de estrés hídrico y uso de productos de bajo impacto (por ejemplo, extractos vegetales autorizados).",
  };
}

/**
 * Variante para vídeo: acepta varios frames en base64 y pide a la IA
 * que haga un único diagnóstico teniendo en cuenta todas las imágenes.
 */
export async function analyzeCropDiseaseFromFrames(
  framesBase64: string[]
): Promise<{
  summary: string;
  posiblesCausas: { causa: string; probabilidad: "baja" | "media" | "alta" }[];
  recomendaciones: string[];
  enfermedad?: string;
  confianza?: number;
  tratamientoQuimico?: string;
  tratamientoEcologico?: string;
}> {
  if (!Array.isArray(framesBase64) || framesBase64.length === 0) {
    throw new Error("Se esperaba un array de imágenes base64 (frames de vídeo).");
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      const imageContents = framesBase64.slice(0, 6).map((b64) => ({
        type: "image_url" as const,
        image_url: {
          url: `data:image/jpeg;base64,${b64}`,
        },
      }));

      const payload = {
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              'Eres un agrónomo experto. Analiza estas imágenes (frames de un vídeo de cultivo). Identifica la plaga o enfermedad predominante, el nivel de confianza (0-100%) y recomienda un tratamiento químico y uno ecológico. Responde estrictamente en JSON con el siguiente formato: {"plagaEnfermedad": string, "confianza": number, "tratamientoQuimico": string, "tratamientoEcologico": string}.',
          },
          {
            role: "user",
            content: [
              {
                type: "text" as const,
                text: "Analiza este conjunto de imágenes del cultivo (frames de un vídeo) y responde en el JSON indicado.",
              },
              ...imageContents,
            ],
          },
        ],
        response_format: { type: "json_object" as const },
      };

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        console.error("OpenAI error (vídeo):", json);
        throw new Error(json.error?.message || "Error al llamar a OpenAI (vídeo)");
      }

      const content = json.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Respuesta vacía de OpenAI (vídeo)");
      }

      let parsed: {
        plagaEnfermedad: string;
        confianza: number;
        tratamientoQuimico: string;
        tratamientoEcologico: string;
      };
      try {
        parsed = JSON.parse(content);
      } catch {
        const match = content.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("No se pudo parsear el JSON devuelto por OpenAI (vídeo)");
        parsed = JSON.parse(match[0]);
      }

      const probabilidad: "baja" | "media" | "alta" =
        parsed.confianza >= 80 ? "alta" : parsed.confianza >= 50 ? "media" : "baja";

      const summary = `Posible problema identificado a partir del vídeo: ${parsed.plagaEnfermedad} (confianza aproximada ${parsed.confianza.toFixed(
        0
      )}%).`;

      const recomendaciones = [
        `Tratamiento químico sugerido: ${parsed.tratamientoQuimico}`,
        `Tratamiento ecológico sugerido: ${parsed.tratamientoEcologico}`,
        "Verifica siempre que cualquier tratamiento esté autorizado para el cultivo y zona, y respeta las dosis y plazos de seguridad.",
      ];

      return {
        summary,
        posiblesCausas: [
          {
            causa: parsed.plagaEnfermedad,
            probabilidad,
          },
        ],
        recomendaciones,
        enfermedad: parsed.plagaEnfermedad,
        confianza: parsed.confianza,
        tratamientoQuimico: parsed.tratamientoQuimico,
        tratamientoEcologico: parsed.tratamientoEcologico,
      };
    } catch (e) {
      console.error("Fallo al usar OpenAI (vídeo), usando diagnóstico simulado:", e);
      // continúa hacia el fallback mock
    }
  }

  // Fallback mock para vídeo: usamos sólo el primer frame y el mismo mensaje orientativo
  return {
    summary:
      "Este análisis de vídeo es simulado y solo orientativo. Para un diagnóstico fiable, combina las observaciones en movimiento con inspecciones en campo.",
    posiblesCausas: [
      {
        causa: "no se identifican patrones claros; utiliza también fotos fijas y observación directa",
        probabilidad: "baja",
      },
    ],
    recomendaciones: [
      "Toma varias fotos estáticas de las zonas más afectadas además del vídeo.",
      "Revisa de cerca hojas, tallos y frutos en campo para confirmar síntomas.",
      "Consulta con un técnico especializado si la afección parece extenderse rápidamente.",
    ],
    enfermedad: "Enfermedad no identificada a partir del vídeo",
    confianza: 30,
    tratamientoQuimico:
      "Consulta el registro oficial de fitosanitarios y selecciona un producto autorizado solo cuando se confirme la plaga/enfermedad.",
    tratamientoEcologico:
      "Refuerza las prácticas preventivas: rotación de cultivos, manejo de riego adecuado y uso de cubiertas vegetales o fauna auxiliar.",
  };
}


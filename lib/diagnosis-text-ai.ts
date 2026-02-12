/**
 * Diagnóstico por texto usando OpenAI.
 * Devuelve el mismo formato que espera el cliente: summary, posiblesCausas, accionesCampo, recomendacionesManejo.
 */

export interface TextDiagnosisResult {
  summary: string;
  posiblesCausas: { causa: string; probabilidad: "baja" | "media" | "alta" }[];
  accionesCampo: string[];
  recomendacionesManejo: string[];
}

const SYSTEM_PROMPT = `Eres un agrónomo experto. El usuario te describe síntomas observados en su cultivo o parcela.
Tu tarea es dar un diagnóstico orientativo (no sustituye a una visita de campo).
Responde ÚNICAMENTE con un JSON válido, sin texto antes ni después, con esta estructura exacta:
{
  "resumen": "Un párrafo breve con tu valoración general.",
  "posiblesCausas": [
    { "causa": "nombre o descripción de la posible causa", "probabilidad": "alta" | "media" | "baja" }
  ],
  "accionesCampo": [
    "Acción 1 que debería revisar en campo.",
    "Acción 2..."
  ],
  "recomendacionesManejo": [
    "Recomendación 1 de manejo.",
    "Recomendación 2..."
  ]
}
Incluye entre 1 y 4 posibles causas, 2-4 acciones de campo y 2-4 recomendaciones. probabilidad debe ser exactamente "alta", "media" o "baja".`;

export async function diagnoseFromTextWithAI(
  sintomas: string,
  contextoParcela?: string
): Promise<TextDiagnosisResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no configurada");
  }

  const userContent = contextoParcela
    ? `Parcela/cultivo de referencia: ${contextoParcela}\n\nSíntomas observados:\n${sintomas}`
    : `Síntomas observados:\n${sintomas}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    const errMsg = json.error?.message || "Error al llamar a OpenAI";
    throw new Error(errMsg);
  }

  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Respuesta vacía de OpenAI");
  }

  let parsed: {
    resumen?: string;
    posiblesCausas?: { causa: string; probabilidad: string }[];
    accionesCampo?: string[];
    recomendacionesManejo?: string[];
  };
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No se pudo parsear el JSON de OpenAI");
    parsed = JSON.parse(match[0]);
  }

  const probabilidadValida = (
    p: string
  ): "baja" | "media" | "alta" =>
    p === "alta" || p === "media" ? p : "baja";

  const posiblesCausas = (parsed.posiblesCausas || []).slice(0, 6).map((c) => ({
    causa: typeof c.causa === "string" ? c.causa : "Causa no especificada",
    probabilidad: probabilidadValida(String(c.probabilidad || "baja")),
  }));

  if (posiblesCausas.length === 0) {
    posiblesCausas.push({
      causa: "Causa no clara, requiere inspección en campo",
      probabilidad: "baja",
    });
  }

  return {
    summary:
      typeof parsed.resumen === "string" && parsed.resumen.trim()
        ? parsed.resumen.trim()
        : "Diagnóstico orientativo. Utiliza las posibles causas como guía para tu comprobación en la parcela.",
    posiblesCausas,
    accionesCampo: Array.isArray(parsed.accionesCampo)
      ? parsed.accionesCampo.filter((a): a is string => typeof a === "string").slice(0, 8)
      : [],
    recomendacionesManejo: Array.isArray(parsed.recomendacionesManejo)
      ? parsed.recomendacionesManejo.filter((r): r is string => typeof r === "string").slice(0, 8)
      : [],
  };
}

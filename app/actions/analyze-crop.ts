"use server";

import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "diagnosis-images";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const SYSTEM_PROMPT = `Eres un Ingeniero Agrónomo experto en fitopatología. Analiza la imagen adjunta. Identifica la plaga, enfermedad o deficiencia nutricional.

Tu respuesta DEBE ser un JSON estricto con esta estructura:
{
  "disease_name": string,
  "confidence": number (0-100),
  "description": string,
  "is_healthy": boolean,
  "treatments": { "organic": string, "chemical": string },
  "urgency": "low"|"medium"|"high",
  "severity_now": "low"|"medium"|"high",
  "severity_48h": "low"|"medium"|"high",
  "action_plan": {
    "immediate": string (acciones en las próximas 24h),
    "within72h": string (acciones en 24-72h),
    "follow_up": string (seguimiento a medio plazo)
  },
  "checklist": {
    "epis": string (EPIs recomendados),
    "dose": string (dosis y forma de aplicación),
    "ideal_window": string (ventana ideal: mañana/tarde, sin viento, etc.),
    "evidence_to_record": string (qué anotar o fotografiar)
  },
  "follow_up_days": number (días recomendados para revisión, ej. 7 o 14)
}

Validación obligatoria: Si la imagen no es nítida o no es una planta/cultivo, disease_name debe ser "No identificado" y confidence 0. En ese caso description puede explicar el motivo; treatments, action_plan y checklist pueden ser cadenas vacías o valores por defecto y follow_up_days 0.`;

export interface ActionPlan {
  immediate: string;
  within72h: string;
  follow_up: string;
}

export interface DiagnosisChecklist {
  epis: string;
  dose: string;
  ideal_window: string;
  evidence_to_record: string;
}

export interface CropDiagnosisResult {
  disease_name: string;
  confidence: number;
  description: string;
  is_healthy: boolean;
  treatments: { organic: string; chemical: string };
  urgency: "low" | "medium" | "high";
  severity_now?: "low" | "medium" | "high";
  severity_48h?: "low" | "medium" | "high";
  action_plan?: ActionPlan;
  checklist?: DiagnosisChecklist;
  follow_up_days?: number;
}

export interface AnalyzeCropImageResult {
  ok: true;
  id: string;
  parcel_id: string;
  image_url: string;
  diagnosis_result: CropDiagnosisResult;
  status: string;
  created_at: string;
}

export interface AnalyzeCropImageError {
  ok: false;
  error: string;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env");
  }
  return createClient(url, key);
}

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Falta OPENAI_API_KEY en .env");
  return new OpenAI({ apiKey });
}

export async function analyzeCropImage(
  formData: FormData
): Promise<AnalyzeCropImageResult | AnalyzeCropImageError> {
  try {
    const image = formData.get("image");
    const parcelIdRaw = formData.get("parcel_id");

    if (!image || !(image instanceof File)) {
      return { ok: false, error: "FormData debe incluir un campo 'image' (archivo)." };
    }
    if (!parcelIdRaw || typeof parcelIdRaw !== "string" || !parcelIdRaw.trim()) {
      return { ok: false, error: "FormData debe incluir 'parcel_id' (uuid de la parcela)." };
    }
    const parcel_id = parcelIdRaw.trim();

    if (!ALLOWED_TYPES.includes(image.type)) {
      return { ok: false, error: "Tipo de imagen no permitido. Usa JPEG, PNG o WebP." };
    }
    if (image.size > MAX_FILE_SIZE) {
      return { ok: false, error: "La imagen no puede superar 10 MB." };
    }

    const supabase = getSupabase();
    const buffer = Buffer.from(await image.arrayBuffer());
    const ext = image.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${parcel_id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: image.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return { ok: false, error: `Error al subir la imagen: ${uploadError.message}` };
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const image_url = urlData.publicUrl;

    const openai = getOpenAI();
    const base64 = buffer.toString("base64");
    const mime = image.type;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analiza esta imagen y responde únicamente con el JSON indicado.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mime};base64,${base64}`,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1024,
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      return { ok: false, error: "OpenAI no devolvió respuesta." };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { ok: false, error: "La respuesta de la IA no es JSON válido." };
    }

    if (parsed && typeof parsed === "object" && "error" in parsed && typeof (parsed as { error: string }).error === "string") {
      return { ok: false, error: (parsed as { error: string }).error };
    }

    const d = parsed as Record<string, unknown>;
    const treatmentsObj = d.treatments as Record<string, string> | undefined;
    const actionPlanObj = d.action_plan as Record<string, string> | undefined;
    const checklistObj = d.checklist as Record<string, string> | undefined;
    const diagnosis_result: CropDiagnosisResult = {
      disease_name: typeof d.disease_name === "string" ? d.disease_name : "Desconocido",
      confidence: typeof d.confidence === "number" ? Math.max(0, Math.min(100, d.confidence)) : 0,
      description: typeof d.description === "string" ? d.description : "",
      is_healthy: typeof d.is_healthy === "boolean" ? d.is_healthy : false,
      treatments: {
        organic: treatmentsObj && typeof treatmentsObj.organic === "string" ? treatmentsObj.organic : "",
        chemical: treatmentsObj && typeof treatmentsObj.chemical === "string" ? treatmentsObj.chemical : "",
      },
      urgency: d.urgency === "low" || d.urgency === "medium" || d.urgency === "high" ? d.urgency : "medium",
      severity_now: d.severity_now === "low" || d.severity_now === "medium" || d.severity_now === "high" ? d.severity_now : undefined,
      severity_48h: d.severity_48h === "low" || d.severity_48h === "medium" || d.severity_48h === "high" ? d.severity_48h : undefined,
      action_plan: actionPlanObj && typeof actionPlanObj.immediate === "string"
        ? {
            immediate: actionPlanObj.immediate ?? "",
            within72h: actionPlanObj.within72h ?? "",
            follow_up: actionPlanObj.follow_up ?? "",
          }
        : undefined,
      checklist: checklistObj
        ? {
            epis: typeof checklistObj.epis === "string" ? checklistObj.epis : "",
            dose: typeof checklistObj.dose === "string" ? checklistObj.dose : "",
            ideal_window: typeof checklistObj.ideal_window === "string" ? checklistObj.ideal_window : "",
            evidence_to_record: typeof checklistObj.evidence_to_record === "string" ? checklistObj.evidence_to_record : "",
          }
        : undefined,
      follow_up_days: typeof d.follow_up_days === "number" && d.follow_up_days >= 0 ? d.follow_up_days : undefined,
    };

    const { data: row, error: insertError } = await supabase
      .from("crop_diagnoses")
      .insert({
        parcel_id,
        image_url,
        diagnosis_result: diagnosis_result as unknown as Record<string, unknown>,
        status: "pending",
      })
      .select("id, parcel_id, image_url, diagnosis_result, status, created_at")
      .single();

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      return { ok: false, error: `Error al guardar el diagnóstico: ${insertError.message}` };
    }

    return {
      ok: true,
      id: row.id,
      parcel_id: row.parcel_id,
      image_url: row.image_url ?? "",
      diagnosis_result,
      status: row.status ?? "pending",
      created_at: row.created_at ?? new Date().toISOString(),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("analyzeCropImage error:", e);
    return { ok: false, error: message };
  }
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { parcelasApi, type ParcelaItem } from "@/lib/offline-api";
import { CameraCapture } from "@/components/CameraCapture";
import { DiseaseResult } from "@/components/DiseaseResult";

interface DiagnosisResult {
  summary: string;
  posiblesCausas: { causa: string; probabilidad: "baja" | "media" | "alta" }[];
  accionesCampo: string[];
  recomendacionesManejo: string[];
}

interface ImageDiagnosisResult {
  summary: string;
  posiblesCausas: { causa: string; probabilidad: "baja" | "media" | "alta" }[];
  recomendaciones: string[];
  enfermedad?: string;
  confianza?: number;
  tratamientoQuimico?: string;
  tratamientoEcologico?: string;
}

type VideoDiagnosisResult = ImageDiagnosisResult;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        const base64 = result.split(",")[1] ?? result;
        resolve(base64);
      } else {
        reject(new Error("No se pudo leer el archivo como base64"));
      }
    };
    reader.onerror = () => reject(new Error("Error al leer el archivo"));
    reader.readAsDataURL(file);
  });
}

export default function DiagnosisPage() {
  const router = useRouter();
  const [parcelas, setParcelas] = useState<ParcelaItem[]>([]);
  const [parcelaId, setParcelaId] = useState("");
  const [sintomas, setSintomas] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiagnosisResult | null>(null);

  const [imageResult, setImageResult] = useState<ImageDiagnosisResult | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  const [videoResult, setVideoResult] = useState<VideoDiagnosisResult | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);

  useEffect(() => {
    parcelasApi
      .list({ pageSize: 200 })
      .then((r) => setParcelas(r.data))
      .catch(() => setParcelas([]));
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sintomas.trim()) {
      setError("Describe brevemente qué le ocurre al cultivo.");
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sintomas: sintomas.trim(), parcelaId: parcelaId || undefined }),
      });
      const text = await res.text();
      let data: { error?: string; data?: DiagnosisResult };
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setError("La respuesta del servidor no es válida. Inténtalo de nuevo.");
        return;
      }
      if (!res.ok) {
        throw new Error(data.error || "No se pudo generar el diagnóstico");
      }
      if (data.data) {
        setResult(data.data);
      } else {
        setError("No se recibieron datos del diagnóstico.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al generar el diagnóstico");
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelected = async (file: File) => {
    setImageError(null);
    setImageLoading(true);
    setImageResult(null);
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/diagnosis/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, parcelaId: parcelaId || undefined }),
      });
      const text = await res.text();
      let data: { error?: string; data?: ImageDiagnosisResult };
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setImageError("La respuesta del servidor no es válida. Inténtalo de nuevo.");
        return;
      }
      if (!res.ok) {
        throw new Error(data.error || "No se pudo analizar la imagen");
      }
      if (data.data) {
        setImageResult(data.data);
      } else {
        setImageError("No se recibieron datos del análisis.");
      }
    } catch (e) {
      setImageError(
        e instanceof Error
          ? e.message
          : "No se pudo analizar la imagen. Inténtalo de nuevo con otra foto."
      );
    } finally {
      setImageLoading(false);
    }
  };

  const extractFramesFromVideo = async (
    file: File,
    frameCount = 3
  ): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.src = url;
      video.crossOrigin = "anonymous";
      video.muted = true;

      video.onloadedmetadata = () => {
        const duration = video.duration;
        if (!duration || Number.isNaN(duration)) {
          URL.revokeObjectURL(url);
          reject(new Error("No se pudo leer la duración del vídeo"));
          return;
        }
        const captures: string[] = [];
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("No se pudo crear el canvas para extraer frames"));
          return;
        }

        const times = [];
        for (let i = 1; i <= frameCount; i++) {
          times.push((duration * i) / (frameCount + 1));
        }

        let index = 0;

        const captureNext = () => {
          if (index >= times.length) {
            URL.revokeObjectURL(url);
            resolve(captures);
            return;
          }
          const time = times[index++];
          video.currentTime = time;
        };

        video.onseeked = () => {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 360;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
          const base64 = dataUrl.split(",")[1] ?? dataUrl;
          captures.push(base64);
          captureNext();
        };

        captureNext();
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("No se pudo cargar el vídeo para análisis"));
      };
    });
  };

  const handleVideoSelected = async (file: File) => {
    setVideoError(null);
    setVideoLoading(true);
    setVideoResult(null);
    try {
      const frames = await extractFramesFromVideo(file, 4);
      const res = await fetch("/api/diagnosis/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ framesBase64: frames, parcelaId: parcelaId || undefined }),
      });
      const text = await res.text();
      let data: { error?: string; data?: VideoDiagnosisResult };
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        setVideoError("La respuesta del servidor no es válida. Inténtalo de nuevo.");
        return;
      }
      if (!res.ok) {
        throw new Error(data.error || "No se pudo analizar el vídeo");
      }
      if (data.data) {
        setVideoResult(data.data);
      } else {
        setVideoError("No se recibieron datos del análisis de vídeo.");
      }
    } catch (e) {
      setVideoError(
        e instanceof Error
          ? e.message
          : "No se pudo analizar el vídeo. Inténtalo de nuevo con otro archivo."
      );
    } finally {
      setVideoLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[100dvh]">
      <header className="px-4 pt-4 pb-2 border-b border-tierra-200 bg-white sticky top-0 z-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-tierra-500 hover:text-tierra-700 mb-1"
        >
          ← Volver
        </button>
        <h1 className="text-lg font-semibold text-tierra-800">Doctor de Cultivos</h1>
        <p className="text-xs text-tierra-600 mt-1">
          Describe los síntomas o sube una foto del cultivo. Si seleccionas parcela, el diagnóstico se
          guardará en su historial.
        </p>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Diagnóstico por texto */}
        <section className="space-y-3">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="label text-xs">Parcela (opcional)</label>
              <select
                className="input text-sm w-full"
                value={parcelaId}
                onChange={(e) => setParcelaId(e.target.value)}
              >
                <option value="">Sin especificar</option>
                {parcelas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="label text-xs">Síntomas observados *</label>
              <textarea
                className="input min-h-[120px] text-sm"
                value={sintomas}
                onChange={(e) => setSintomas(e.target.value)}
                placeholder="Ej. Hojas amarillas en bordes, zonas con plantas más bajas, manchas en hojas..."
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2 rounded">
                {error}
              </div>
            )}
          </form>

          {result && (
            <section className="space-y-3 pb-2">
              <div className="card space-y-2">
                <h2 className="font-medium text-tierra-800 text-sm">Resumen</h2>
                <p className="text-sm text-tierra-700 whitespace-pre-wrap">{result.summary}</p>
              </div>

              {result.posiblesCausas.length > 0 && (
                <div className="card space-y-2">
                  <h3 className="font-medium text-tierra-800 text-sm">Posibles causas</h3>
                  <ul className="list-disc list-inside text-sm text-tierra-700 space-y-1">
                    {result.posiblesCausas.map((c, idx) => (
                      <li key={idx}>
                        <span className="font-medium capitalize">{c.causa}</span>{" "}
                        <span className="text-xs text-tierra-500">({c.probabilidad})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.accionesCampo.length > 0 && (
                <div className="card space-y-2">
                  <h3 className="font-medium text-tierra-800 text-sm">Qué revisar en campo</h3>
                  <ul className="list-disc list-inside text-sm text-tierra-700 space-y-1">
                    {result.accionesCampo.map((a, idx) => (
                      <li key={idx}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.recomendacionesManejo.length > 0 && (
                <div className="card space-y-2">
                  <h3 className="font-medium text-tierra-800 text-sm">Recomendaciones de manejo</h3>
                  <ul className="list-disc list-inside text-sm text-tierra-700 space-y-1">
                    {result.recomendacionesManejo.map((r, idx) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
        </section>

        {/* Diagnóstico por imagen (IA) */}
        <section className="space-y-3">
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-tierra-800 text-sm">Diagnóstico por foto (IA)</h2>
              {imageLoading && (
                <span className="text-[11px] text-tierra-500">Analizando imagen…</span>
              )}
            </div>
            <p className="text-xs text-tierra-600">
              Haz una foto de hojas afectadas y, si es posible, del conjunto de la planta. La IA
              intentará identificar la enfermedad y sugerir tratamientos.
            </p>
            <CameraCapture
              buttonLabel={imageLoading ? "Analizando…" : "Añadir foto / Tomar foto"}
              onImageSelected={handleImageSelected}
            />

            {imageError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2 rounded">
                {imageError}
              </div>
            )}
          </div>

          {imageResult && (
            <div className="space-y-3">
              <DiseaseResult
                enfermedad={imageResult.enfermedad}
                confianza={imageResult.confianza}
                tratamientoQuimico={imageResult.tratamientoQuimico}
                tratamientoEcologico={imageResult.tratamientoEcologico}
                summary={imageResult.summary}
              />

              {imageResult.recomendaciones?.length > 0 && (
                <div className="card space-y-2">
                  <h3 className="font-medium text-tierra-800 text-sm">Recomendaciones adicionales</h3>
                  <ul className="list-disc list-inside text-sm text-tierra-700 space-y-1">
                    {imageResult.recomendaciones.map((r, idx) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Diagnóstico por vídeo (IA) */}
        <section className="space-y-3 pb-20">
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-tierra-800 text-sm">Diagnóstico por vídeo (IA)</h2>
              {videoLoading && (
                <span className="text-[11px] text-tierra-500">Analizando vídeo…</span>
              )}
            </div>
            <p className="text-xs text-tierra-600">
              Sube un vídeo corto del cultivo (5–10 segundos). Se extraerán varios fotogramas y la IA
              intentará identificar la enfermedad y sugerir tratamientos.
            </p>
            <input
              type="file"
              accept="video/*"
              className="text-xs"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  void handleVideoSelected(file);
                }
              }}
              disabled={videoLoading}
            />

            {videoError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2 rounded">
                {videoError}
              </div>
            )}
          </div>

          {videoResult && (
            <div className="space-y-3">
              <DiseaseResult
                enfermedad={videoResult.enfermedad}
                confianza={videoResult.confianza}
                tratamientoQuimico={videoResult.tratamientoQuimico}
                tratamientoEcologico={videoResult.tratamientoEcologico}
                summary={videoResult.summary}
              />

              {videoResult.recomendaciones?.length > 0 && (
                <div className="card space-y-2">
                  <h3 className="font-medium text-tierra-800 text-sm">
                    Recomendaciones adicionales a partir del vídeo
                  </h3>
                  <ul className="list-disc list-inside text-sm text-tierra-700 space-y-1">
                    {videoResult.recomendaciones.map((r, idx) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <div className="sticky bottom-0 left-0 right-0 px-4 py-3 border-t border-tierra-200 bg-white">
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={loading}
          className="btn-primary w-full py-2 text-sm"
        >
          {loading ? "Analizando cultivo…" : "Consultar Doctor de Cultivos (texto)"}
        </button>
      </div>
    </div>
  );
}


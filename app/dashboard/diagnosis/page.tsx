"use client";

import { useRef, useState } from "react";
import { analyzeCropImage } from "@/app/actions/analyze-crop";
import { toast } from "sonner";
import { DiagnosisResultCard } from "@/components/DiagnosisResultCard";

export default function DoctorAIPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [parcelId, setParcelId] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof analyzeCropImage>> | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Selecciona una imagen (JPEG, PNG o WebP).");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("La imagen no puede superar 10 MB.");
      return;
    }
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  }

  async function handleSubmit() {
    if (!file) {
      toast.error("Toma o selecciona una foto de la planta primero.");
      return;
    }
    const pid = parcelId.trim();
    if (!pid) {
      toast.error("Indica el ID de la parcela (Supabase) para guardar el diagnóstico.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.set("image", file);
      formData.set("parcel_id", pid);

      const res = await analyzeCropImage(formData);

      if (res.ok) {
        setResult(res);
        toast.success("Diagnóstico listo.");
      } else {
        setResult(null);
        toast.error(res.error || "Error al analizar la imagen.");
      }
    } catch (e) {
      setResult(null);
      toast.error(e instanceof Error ? e.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  function clearSelection() {
    setFile(null);
    setPreview(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center py-8 px-4">
      <h2 className="text-xl font-semibold text-tierra-800 mb-2">Doctor AI</h2>
      <p className="text-sm text-tierra-600 mb-6 text-center max-w-sm">
        Toma una foto de la planta para obtener un diagnóstico de plagas, enfermedades o carencias.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="sr-only"
        aria-label="Seleccionar o capturar imagen de la planta"
      />

      {!preview ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center w-56 h-56 sm:w-64 sm:h-64 rounded-full bg-tierra-100 border-2 border-dashed border-tierra-300 text-tierra-700 hover:bg-tierra-200 hover:border-tierra-400 focus:outline-none focus:ring-2 focus:ring-tierra-500 focus:ring-offset-2 transition"
          disabled={loading}
        >
          <span className="text-4xl mb-2" aria-hidden>🌿</span>
          <span className="text-center font-medium px-4">Tomar foto de la planta</span>
        </button>
      ) : (
        <div className="w-full max-w-sm space-y-4">
          <div className="relative rounded-xl overflow-hidden border border-tierra-200 bg-tierra-50">
            <img
              src={preview}
              alt="Vista previa de la planta"
              className="w-full h-auto max-h-72 object-contain"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-tierra-700">
              ID de parcela (Supabase)
            </label>
            <input
              type="text"
              value={parcelId}
              onChange={(e) => setParcelId(e.target.value)}
              placeholder="UUID de la parcela"
              className="input w-full"
              disabled={loading}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={clearSelection}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Cambiar foto
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="btn-primary flex-1"
              disabled={loading}
            >
              Analizar
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="mt-8 flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-tierra-500 border-t-tierra-200 animate-spin" />
          <p className="text-sm text-tierra-600">Consultando con el agrónomo virtual…</p>
        </div>
      )}

      {result && result.ok && (
        <div className="mt-8 w-full max-w-md">
          <DiagnosisResultCard
            result={result.diagnosis_result}
            parcelaId={parcelId.trim() || undefined}
          />
        </div>
      )}
    </div>
  );
}

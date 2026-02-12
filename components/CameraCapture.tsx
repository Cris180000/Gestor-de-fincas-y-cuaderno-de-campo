"use client";

import { useRef, useState } from "react";

export interface CameraCaptureProps {
  /** Llamado cuando el usuario selecciona o hace una foto */
  onImageSelected?: (file: File) => void;
  /** Texto del botón principal (por defecto: "Añadir foto") */
  buttonLabel?: string;
}

/**
 * Componente sencillo para capturar una foto con la cámara o subirla desde la galería.
 * Optimizado para móvil: usa un único input type="file" con `capture="environment"`.
 */
export function CameraCapture({ onImageSelected, buttonLabel = "Añadir foto" }: CameraCaptureProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      return;
    }
    const url = URL.createObjectURL(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(url);
    onImageSelected?.(file);
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        className="btn-secondary w-full justify-center text-sm"
      >
        📷 {buttonLabel}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
      {previewUrl && (
        <div className="mt-1">
          <p className="text-xs text-tierra-500 mb-1">Vista previa:</p>
          <div className="w-full max-w-[240px] aspect-video rounded-lg overflow-hidden border border-tierra-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Foto seleccionada"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}
    </div>
  );
}


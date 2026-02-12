"use client";

import { useState } from "react";

export interface DatosCatastrales {
  referenciaCatastral: string;
  tipo: string;
  superficie?: number;
  localizacion?: string;
  poligono?: string;
  parcela?: string;
  paraje?: string;
}

interface BuscarCatastroProps {
  /** Referencia catastral actual (controlada) */
  value: string;
  onChange: (rc: string) => void;
  /** Se llama con el primer resultado al encontrar datos */
  onDatos?: (d: DatosCatastrales) => void;
  /** Si true, no mostrar el botón de búsqueda (solo el input) */
  soloInput?: boolean;
  placeholder?: string;
  label?: string;
  className?: string;
}

/** Convierte m² del Catastro a hectáreas */
export function m2AHectareas(m2: number): number {
  return Math.round((m2 / 10000) * 1000) / 1000;
}

export function BuscarCatastro({
  value,
  onChange,
  onDatos,
  soloInput,
  placeholder = "Ej. 28390A0010000100000GP",
  label = "Referencia catastral",
  className = "",
}: BuscarCatastroProps) {
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBuscar = async () => {
    const rc = value.replace(/\s/g, "").trim();
    if (rc.length < 14) {
      setError("Introduce al menos 14 caracteres de la referencia catastral.");
      return;
    }
    setError(null);
    setBuscando(true);
    try {
      const res = await fetch(`/api/catastro/consulta?rc=${encodeURIComponent(rc)}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Error al consultar el Catastro");
        return;
      }
      const datos = json.datos as DatosCatastrales[];
      if (!datos?.length) {
        setError("No se encontraron datos para esa referencia.");
        return;
      }
      const primer = datos[0];
      onChange(primer.referenciaCatastral);
      onDatos?.(primer);
    } catch (e) {
      setError("No se pudo conectar con el Catastro. Compruebe la conexión.");
    } finally {
      setBuscando(false);
    }
  };

  return (
    <div className={className}>
      <label className="label">{label}</label>
      <div className="flex gap-2 flex-wrap">
        <input
          type="text"
          className="input flex-1 min-w-[180px] font-mono text-sm"
          value={value}
          onChange={(e) => { setError(null); onChange(e.target.value); }}
          placeholder={placeholder}
          maxLength={20}
        />
        {!soloInput && (
          <button
            type="button"
            onClick={handleBuscar}
            disabled={buscando || value.trim().length < 14}
            className="btn-secondary whitespace-nowrap"
          >
            {buscando ? "Buscando…" : "Buscar en Catastro"}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
      <p className="text-xs text-tierra-500 mt-1">
        Referencia de 14 dígitos (rústica) o 18/20. Consulta datos públicos del Catastro español.
      </p>
    </div>
  );
}

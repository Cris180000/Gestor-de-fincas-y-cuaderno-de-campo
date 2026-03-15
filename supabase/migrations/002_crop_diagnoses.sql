-- =============================================================================
-- Módulo Doctor de Cultivos: diagnósticos y almacenamiento de imágenes
-- Supabase (PostgreSQL). Ejecutar en SQL Editor o como migración.
-- Requiere: tabla public.parcels (id uuid, user_id uuid) existente.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- Tabla: crop_diagnoses
-- Diagnósticos del Doctor de Cultivos por parcela (foto + resultado IA + estado).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crop_diagnoses (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcel_id        uuid NOT NULL,
  image_url        text NULL,
  diagnosis_result jsonb NULL,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed_by_human', 'resolved')),
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- FK a parcelas (ajusta el nombre de tabla si usas 'parcel' en singular)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parcels') THEN
    ALTER TABLE public.crop_diagnoses
      ADD CONSTRAINT crop_diagnoses_parcel_id_fkey
      FOREIGN KEY (parcel_id) REFERENCES public.parcels(id) ON DELETE CASCADE;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parcel') THEN
    ALTER TABLE public.crop_diagnoses
      ADD CONSTRAINT crop_diagnoses_parcel_id_fkey
      FOREIGN KEY (parcel_id) REFERENCES public.parcel(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_crop_diagnoses_parcel_id ON public.crop_diagnoses(parcel_id);
CREATE INDEX IF NOT EXISTS idx_crop_diagnoses_status   ON public.crop_diagnoses(status);
CREATE INDEX IF NOT EXISTS idx_crop_diagnoses_created_at ON public.crop_diagnoses(created_at DESC);

COMMENT ON TABLE public.crop_diagnoses IS 'Diagnósticos del Doctor de Cultivos; image_url apunta a Supabase Storage (bucket diagnosis-images).';
COMMENT ON COLUMN public.crop_diagnoses.diagnosis_result IS 'Respuesta IA: enfermedad, confianza, tratamiento, etc.';
COMMENT ON COLUMN public.crop_diagnoses.status IS 'pending | confirmed_by_human | resolved';

-- -----------------------------------------------------------------------------
-- RLS: solo el dueño de la parcela ve sus diagnósticos
-- Requiere que parcels (o parcel) tenga columna user_id → auth.users(id).
-- -----------------------------------------------------------------------------
ALTER TABLE public.crop_diagnoses ENABLE ROW LEVEL SECURITY;

-- Función auxiliar: true si auth.uid() es dueño de la parcela (parcels o parcel).
CREATE OR REPLACE FUNCTION public.crop_diagnoses_owner_check(pid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.parcels p WHERE p.id = pid AND p.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.parcel p WHERE p.id = pid AND p.user_id = auth.uid());
$$;

-- Políticas RLS usando la función (válido para tabla 'parcels' o 'parcel' con user_id).
CREATE POLICY "owners_select_own_crop_diagnoses"
  ON public.crop_diagnoses FOR SELECT
  USING (public.crop_diagnoses_owner_check(parcel_id));

CREATE POLICY "owners_insert_own_crop_diagnoses"
  ON public.crop_diagnoses FOR INSERT
  WITH CHECK (public.crop_diagnoses_owner_check(parcel_id));

CREATE POLICY "owners_update_own_crop_diagnoses"
  ON public.crop_diagnoses FOR UPDATE
  USING (public.crop_diagnoses_owner_check(parcel_id))
  WITH CHECK (public.crop_diagnoses_owner_check(parcel_id));

CREATE POLICY "owners_delete_own_crop_diagnoses"
  ON public.crop_diagnoses FOR DELETE
  USING (public.crop_diagnoses_owner_check(parcel_id));

-- -----------------------------------------------------------------------------
-- Bucket de almacenamiento: diagnosis-images
-- Las imágenes del Doctor de Cultivos se suben aquí; image_url será la ruta
-- devuelta por Storage (ej. bucket 'diagnosis-images', path '{user_id}/{diagnosis_id}.jpg').
-- Si el INSERT falla (permisos o esquema), crea el bucket desde el Dashboard:
-- Storage → New bucket → nombre: diagnosis-images, público: no.
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('diagnosis-images', 'diagnosis-images', false)
ON CONFLICT (id) DO NOTHING;

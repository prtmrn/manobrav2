-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 004 : Table avis + colonne abonnement_pro
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Colonne abonnement_pro sur profiles_artisans ──────────────────────
ALTER TABLE public.profiles_artisans
  ADD COLUMN IF NOT EXISTS abonnement_pro boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles_artisans.abonnement_pro
  IS 'true si le artisan possède un abonnement Pro actif (badge vérifié).';

-- ── 2. Table avis (avis clients) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.avis (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  artisan_id uuid        NOT NULL
    REFERENCES public.profiles_artisans(id) ON DELETE CASCADE,
  client_id      uuid
    REFERENCES auth.users(id) ON DELETE SET NULL,
  nom_client     text        NOT NULL,
  note           smallint    NOT NULL CHECK (note >= 1 AND note <= 5),
  commentaire    text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.avis IS 'Avis laissés par les clients sur les artisans.';

-- ── 3. Index ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_avis_artisan_date
  ON public.avis (artisan_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_avis_client
  ON public.avis (client_id);

-- ── 4. Row Level Security ─────────────────────────────────────────────────────
ALTER TABLE public.avis ENABLE ROW LEVEL SECURITY;

-- Lecture publique (profils publics)
CREATE POLICY "avis_select_public"
  ON public.avis FOR SELECT
  USING (true);

-- Insertion : utilisateur authentifié uniquement
CREATE POLICY "avis_insert_authenticated"
  ON public.avis FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Modification / suppression : auteur uniquement
CREATE POLICY "avis_update_own"
  ON public.avis FOR UPDATE
  USING (auth.uid() = client_id);

CREATE POLICY "avis_delete_own"
  ON public.avis FOR DELETE
  USING (auth.uid() = client_id);

-- ── 5. Fonction + trigger : recalcul automatique note_moyenne ─────────────────
CREATE OR REPLACE FUNCTION public.refresh_note_artisan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_id uuid;
BEGIN
  target_id := COALESCE(NEW.artisan_id, OLD.artisan_id);

  UPDATE public.profiles_artisans
  SET
    note_moyenne = (
      SELECT COALESCE(ROUND(AVG(note::numeric), 1)::float4, 0)
      FROM   public.avis
      WHERE  artisan_id = target_id
    ),
    nombre_avis = (
      SELECT COUNT(*)::int
      FROM   public.avis
      WHERE  artisan_id = target_id
    )
  WHERE id = target_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_avis_change ON public.avis;
CREATE TRIGGER on_avis_change
  AFTER INSERT OR UPDATE OR DELETE ON public.avis
  FOR EACH ROW EXECUTE FUNCTION public.refresh_note_artisan();

-- ── 6. Données de démo (optionnel — commentez si non souhaité) ───────────────
-- INSERT INTO public.avis (artisan_id, nom_client, note, commentaire)
-- SELECT id, 'Marie D.', 5, 'Excellent travail, très professionnel et ponctuel !'
-- FROM public.profiles_artisans LIMIT 1;

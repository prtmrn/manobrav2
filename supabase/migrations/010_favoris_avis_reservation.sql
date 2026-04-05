-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 010 : Table favoris + liaison avis ↔ reservations
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Ajout de reservation_id sur la table avis ──────────────────────────────

ALTER TABLE public.avis
  ADD COLUMN IF NOT EXISTS reservation_id uuid
    REFERENCES public.reservations(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.avis.reservation_id
  IS 'Réservation liée à cet avis. Un seul avis par réservation.';

-- Contrainte d'unicité (index partiel : NULL exclu)
CREATE UNIQUE INDEX IF NOT EXISTS avis_reservation_id_unique
  ON public.avis (reservation_id)
  WHERE reservation_id IS NOT NULL;

-- nom_client devient optionnel (on le peuple depuis profiles_clients)
ALTER TABLE public.avis
  ALTER COLUMN nom_client DROP NOT NULL;

-- ── 2. Trigger : réservation doit être terminée avant création d'un avis ──────

CREATE OR REPLACE FUNCTION public.check_avis_reservation_termine()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.reservation_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM   public.reservations
      WHERE  id     = NEW.reservation_id
        AND  statut = 'termine'
    ) THEN
      RAISE EXCEPTION
        'avis_reservation_not_termine'
        USING HINT = 'Un avis ne peut être soumis que pour une réservation au statut « terminé ».';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_avis_reservation ON public.avis;
CREATE TRIGGER trg_check_avis_reservation
  BEFORE INSERT OR UPDATE OF reservation_id ON public.avis
  FOR EACH ROW EXECUTE FUNCTION public.check_avis_reservation_termine();

-- ── 3. Table favoris ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.favoris (
  client_id      uuid        NOT NULL
    REFERENCES public.profiles_clients(id)      ON DELETE CASCADE,
  artisan_id uuid        NOT NULL
    REFERENCES public.profiles_artisans(id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, artisan_id)
);

COMMENT ON TABLE public.favoris
  IS 'artisans mis en favoris par les clients.';

CREATE INDEX IF NOT EXISTS idx_favoris_client
  ON public.favoris (client_id);

CREATE INDEX IF NOT EXISTS idx_favoris_artisan
  ON public.favoris (artisan_id);

-- ── 4. Row Level Security — favoris ──────────────────────────────────────────

ALTER TABLE public.favoris ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favoris_select_own"
  ON public.favoris FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "favoris_insert_own"
  ON public.favoris FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "favoris_delete_own"
  ON public.favoris FOR DELETE
  USING (auth.uid() = client_id);

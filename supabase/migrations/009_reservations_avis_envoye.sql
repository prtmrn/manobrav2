-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 009 : Colonne avis_envoye_at sur reservations
-- Permet de tracker les emails de demande d'avis pour éviter les doublons.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS avis_envoye_at TIMESTAMPTZ;

COMMENT ON COLUMN public.reservations.avis_envoye_at
  IS 'Timestamp de l''envoi de l''email de demande d''avis. NULL = pas encore envoyé.';

-- Index pour que la cron de demande d''avis ne scanne que les lignes non traitées
CREATE INDEX IF NOT EXISTS idx_reservations_avis_envoye
  ON public.reservations (date, statut)
  WHERE avis_envoye_at IS NULL;

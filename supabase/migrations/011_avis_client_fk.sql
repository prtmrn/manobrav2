-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 011 : avis.client_id → profiles_clients (au lieu de auth.users)
-- La valeur des UUIDs est identique (profiles_clients.id est lui-même une FK
-- vers auth.users.id), donc les données existantes restent valides.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.avis
  DROP CONSTRAINT IF EXISTS avis_client_id_fkey;

ALTER TABLE public.avis
  ADD CONSTRAINT avis_client_id_fkey
    FOREIGN KEY (client_id)
    REFERENCES public.profiles_clients(id)
    ON DELETE SET NULL;

COMMENT ON COLUMN public.avis.client_id
  IS 'Client ayant laissé l''avis. NULL si le compte a été supprimé.';

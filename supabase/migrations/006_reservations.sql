-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 006 : Table reservations + RLS
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Type ENUM pour le statut ───────────────────────────────────────────────
-- On utilise un CHECK constraint plutôt qu'un ENUM Postgres pour faciliter les
-- évolutions futures sans migration ALTER TYPE.

CREATE TABLE IF NOT EXISTS public.reservations (
  id                       uuid         PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Parties
  client_id                uuid         NOT NULL
    REFERENCES public.profiles_clients(id)        ON DELETE RESTRICT,
  artisan_id           uuid         NOT NULL
    REFERENCES public.profiles_artisans(id)   ON DELETE RESTRICT,
  service_id               uuid
    REFERENCES public.services(id)                ON DELETE SET NULL,

  -- Créneau
  date                     date         NOT NULL,
  heure_debut              time         NOT NULL,
  heure_fin                time         NOT NULL,

  -- Statut
  statut                   text         NOT NULL DEFAULT 'en_attente'
    CONSTRAINT reservations_statut_valide CHECK (
      statut IN ('en_attente', 'confirme', 'en_cours', 'termine', 'annule')
    ),

  -- Logistique
  adresse_intervention     text,

  -- Évaluation post-prestation
  note_client              text,

  -- Finance
  montant_total            numeric(10,2),
  commission_plateforme    numeric(10,2),
  montant_artisan      numeric(10,2),

  -- Stripe
  stripe_payment_intent_id text,

  -- Horodatage
  created_at               timestamptz  NOT NULL DEFAULT now(),
  updated_at               timestamptz  NOT NULL DEFAULT now(),

  -- Cohérence horaire
  CONSTRAINT reservations_heure_coherente CHECK (heure_fin > heure_debut),

  -- Cohérence financière (optionnel mais utile)
  CONSTRAINT reservations_montants_positifs CHECK (
    montant_total IS NULL OR montant_total >= 0
  )
);

-- ── 2. Index de performance ───────────────────────────────────────────────────

-- Requêtes fréquentes : toutes les réservations d'un client
CREATE INDEX IF NOT EXISTS idx_reservations_client_id
  ON public.reservations (client_id, date DESC);

-- Requêtes fréquentes : agenda d'un artisan
CREATE INDEX IF NOT EXISTS idx_reservations_artisan_id
  ON public.reservations (artisan_id, date DESC);

-- Filtrage par statut (ex. : réservations en attente)
CREATE INDEX IF NOT EXISTS idx_reservations_statut
  ON public.reservations (statut) WHERE statut NOT IN ('termine', 'annule');

-- Recherche par Stripe payment intent (webhooks)
CREATE INDEX IF NOT EXISTS idx_reservations_stripe
  ON public.reservations (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- ── 3. Trigger updated_at ─────────────────────────────────────────────────────

-- Réutilise la fonction moby_updated_at si elle existe déjà, sinon la crée.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 4. RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- 4a. Lecture : client ou artisan concerné par la réservation
CREATE POLICY "reservations_select_parties"
  ON public.reservations
  FOR SELECT
  USING (
    auth.uid() = client_id
    OR
    auth.uid() = artisan_id
  );

-- 4b. Création : seul un client authentifié peut créer une réservation
--     (et uniquement pour son propre client_id)
CREATE POLICY "reservations_insert_client"
  ON public.reservations
  FOR INSERT
  WITH CHECK (
    auth.uid() = client_id
  );

-- 4c. Mise à jour par le client
--     Le client peut annuler (statut → 'annule') ou mettre à jour note_client
--     tant que la réservation n'est pas terminée/déjà annulée.
CREATE POLICY "reservations_update_client"
  ON public.reservations
  FOR UPDATE
  USING (
    auth.uid() = client_id
    AND statut NOT IN ('termine', 'annule')
  )
  WITH CHECK (
    auth.uid() = client_id
  );

-- 4d. Mise à jour par le artisan
--     Le artisan peut confirmer, marquer en cours / terminé.
CREATE POLICY "reservations_update_artisan"
  ON public.reservations
  FOR UPDATE
  USING (
    auth.uid() = artisan_id
    AND statut NOT IN ('annule')
  )
  WITH CHECK (
    auth.uid() = artisan_id
  );

-- 4e. Pas de DELETE : les réservations sont conservées pour l'historique.
--     Si besoin, on passe le statut à 'annule'.

-- ── 5. Vue pratique : réservations enrichies ──────────────────────────────────

CREATE OR REPLACE VIEW public.reservations_detail AS
SELECT
  r.id,
  r.date,
  r.heure_debut,
  r.heure_fin,
  r.statut,
  r.adresse_intervention,
  r.note_client,
  r.montant_total,
  r.commission_plateforme,
  r.montant_artisan,
  r.stripe_payment_intent_id,
  r.created_at,
  r.updated_at,
  r.client_id,
  r.artisan_id,
  r.service_id

FROM public.reservations r;

ALTER VIEW public.reservations_detail OWNER TO postgres;

-- ── 6. Fonction utilitaire : créneaux déjà pris ───────────────────────────────

-- Retourne les réservations actives d'un artisan pour une date donnée.
-- Utilisée pour vérifier la disponibilité avant de créer une réservation.
CREATE OR REPLACE FUNCTION public.creneaux_reserves(
  p_artisan_id uuid,
  p_date           date
)
RETURNS TABLE (
  reservation_id uuid,
  heure_debut    time,
  heure_fin      time,
  statut         text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    id            AS reservation_id,
    heure_debut,
    heure_fin,
    statut
  FROM public.reservations
  WHERE artisan_id = p_artisan_id
    AND date          = p_date
    AND statut        NOT IN ('annule')
  ORDER BY heure_debut;
$$;

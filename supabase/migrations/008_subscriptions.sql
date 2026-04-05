-- ============================================================
-- Migration 008 — Abonnements Stripe (colonnes sur profiles_artisans)
-- ============================================================

-- ── Nouvelles colonnes ──────────────────────────────────────────────────────

ALTER TABLE public.profiles_artisans
  ADD COLUMN IF NOT EXISTS stripe_customer_id       text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id   text,
  ADD COLUMN IF NOT EXISTS plan_actif               text NOT NULL DEFAULT 'aucun'
    CONSTRAINT pp_plan_actif_check CHECK (plan_actif IN ('aucun', 'essentiel', 'pro')),
  ADD COLUMN IF NOT EXISTS subscription_status      text,
  ADD COLUMN IF NOT EXISTS subscription_end_date    timestamptz;

-- ── Index ───────────────────────────────────────────────────────────────────

-- Lookup rapide par stripe_customer_id (webhooks subscription.*)
CREATE INDEX IF NOT EXISTS idx_pp_stripe_customer_id
  ON public.profiles_artisans (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Lookup rapide par stripe_subscription_id (webhooks subscription.updated)
CREATE INDEX IF NOT EXISTS idx_pp_stripe_subscription_id
  ON public.profiles_artisans (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- ── Commentaires ─────────────────────────────────────────────────────────────

COMMENT ON COLUMN public.profiles_artisans.stripe_customer_id IS
  'ID du Customer Stripe (cus_xxx). Créé automatiquement lors du premier abonnement.';

COMMENT ON COLUMN public.profiles_artisans.stripe_subscription_id IS
  'ID de l''abonnement Stripe actif (sub_xxx). NULL si aucun abonnement en cours.';

COMMENT ON COLUMN public.profiles_artisans.plan_actif IS
  'Plan d''abonnement actif : aucun | essentiel | pro. Mis à jour par le webhook Stripe.';

COMMENT ON COLUMN public.profiles_artisans.subscription_status IS
  'Statut Stripe de l''abonnement : active | trialing | past_due | canceled | unpaid.';

COMMENT ON COLUMN public.profiles_artisans.subscription_end_date IS
  'Date de fin de la période en cours (renouvellement ou expiration). Unix → timestamptz.';

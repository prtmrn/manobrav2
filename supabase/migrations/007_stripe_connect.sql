-- ============================================================
-- Migration 007 — Stripe Connect (colonnes sur profiles_artisans)
-- ============================================================

-- ── Nouvelles colonnes ──────────────────────────────────────────────────────

ALTER TABLE public.profiles_artisans
  ADD COLUMN IF NOT EXISTS stripe_account_id        text,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_complete boolean NOT NULL DEFAULT false;

-- ── Index ──────────────────────────────────────────────────────────────────

-- Recherche rapide par stripe_account_id (webhooks Stripe → user lookup)
CREATE INDEX IF NOT EXISTS idx_pp_stripe_account_id
  ON public.profiles_artisans (stripe_account_id)
  WHERE stripe_account_id IS NOT NULL;

-- ── Commentaires ──────────────────────────────────────────────────────────

COMMENT ON COLUMN public.profiles_artisans.stripe_account_id IS
  'ID du compte Stripe Express (acc_xxx). NULL si le artisan n''a pas encore démarré l''onboarding.';

COMMENT ON COLUMN public.profiles_artisans.stripe_onboarding_complete IS
  'true quand details_submitted ET charges_enabled sont vrais sur le compte Stripe.';

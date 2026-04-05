-- ─── Migration 014 : colonne onboarding_step ──────────────────────────────────
-- Ajoute onboarding_step à profiles_artisans pour suivre la progression
-- de l'onboarding guidé.
--
-- Valeurs :
--   0  → aucune étape complétée (juste inscrit)
--   1  → profil de base rempli (nom, prénom, métier, ville)
--   2  → au moins un service actif créé
--   3  → au moins une disponibilité active configurée
--   4  → Stripe Connect complété (stripe_onboarding_complete = true)
--   5  → abonnement actif (plan_actif != 'aucun')
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles_artisans
  ADD COLUMN IF NOT EXISTS onboarding_step SMALLINT NOT NULL DEFAULT 0
    CHECK (onboarding_step BETWEEN 0 AND 5);

-- Mettre à jour les artisans existants selon leur état réel
-- Étape 5 : abonnement actif
UPDATE profiles_artisans
SET    onboarding_step = 5
WHERE  onboarding_step < 5
  AND  plan_actif IS DISTINCT FROM 'aucun'
  AND  plan_actif IS NOT NULL;

-- Étape 4 : Stripe Connect complété (mais pas encore abonné)
UPDATE profiles_artisans
SET    onboarding_step = 4
WHERE  onboarding_step < 4
  AND  stripe_onboarding_complete = true;

-- Étape 3 : disponibilités configurées
UPDATE profiles_artisans pp
SET    onboarding_step = 3
WHERE  pp.onboarding_step < 3
  AND  EXISTS (
    SELECT 1 FROM disponibilites d
    WHERE  d.artisan_id = pp.id
      AND  d.actif = true
  );

-- Étape 2 : au moins un service actif
UPDATE profiles_artisans pp
SET    onboarding_step = 2
WHERE  pp.onboarding_step < 2
  AND  EXISTS (
    SELECT 1 FROM services s
    WHERE  s.artisan_id = pp.id
      AND  s.actif = true
  );

-- Étape 1 : profil de base rempli
UPDATE profiles_artisans
SET    onboarding_step = 1
WHERE  onboarding_step < 1
  AND  nom     IS NOT NULL AND nom     <> ''
  AND  prenom  IS NOT NULL AND prenom  <> ''
  AND  metier  IS NOT NULL AND metier  <> ''
  AND  ville   IS NOT NULL AND ville   <> '';

-- Index pour les requêtes de dashboard
CREATE INDEX IF NOT EXISTS idx_profiles_artisans_onboarding
  ON profiles_artisans (onboarding_step)
  WHERE onboarding_step < 5;

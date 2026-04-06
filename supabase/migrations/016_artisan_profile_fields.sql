-- Ajout des nouveaux champs au profil artisan
ALTER TABLE public.profiles_artisans
  ADD COLUMN IF NOT EXISTS telephone TEXT,
  ADD COLUMN IF NOT EXISTS siret TEXT,
  ADD COLUMN IF NOT EXISTS zone_intervention_km INT DEFAULT 20,
  ADD COLUMN IF NOT EXISTS tarif_horaire_min DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS tarif_horaire_max DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS frais_deplacement TEXT DEFAULT 'inclus',
  ADD COLUMN IF NOT EXISTS disponible_urgence BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS delai_urgence TEXT;

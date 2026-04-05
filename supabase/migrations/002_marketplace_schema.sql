-- ================================================================
-- Migration 002 : Schéma marketplace de services à domicile
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- Prérequis : migration 001 (table profiles) déjà exécutée
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- 1. TABLE : profiles_artisans
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles_artisans (
  id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom          TEXT,
  prenom       TEXT,
  bio          TEXT,
  metier       TEXT,                          -- ex: plombier, électricien, ménage
  adresse      TEXT,
  ville        TEXT,
  code_postal  TEXT,
  latitude     FLOAT8,
  longitude    FLOAT8,
  photo_url    TEXT,
  actif        BOOLEAN     NOT NULL DEFAULT false,
  note_moyenne FLOAT4      NOT NULL DEFAULT 0,
  nombre_avis  INT         NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────
-- 2. TABLE : profiles_clients
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles_clients (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom         TEXT,
  prenom      TEXT,
  adresse     TEXT,
  ville       TEXT,
  code_postal TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────
-- 3. TABLE : services
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.services (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  artisan_id UUID        NOT NULL REFERENCES public.profiles_artisans(id) ON DELETE CASCADE,
  titre          TEXT        NOT NULL,
  description    TEXT,
  prix           DECIMAL(10, 2),
  duree_minutes  INT,
  categorie      TEXT,
  actif          BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────
-- 4. INDEX DE PERFORMANCE
-- ────────────────────────────────────────────────────────────────

-- Recherche par ville / métier / artisan actif
CREATE INDEX IF NOT EXISTS idx_artisans_ville
  ON public.profiles_artisans (ville)
  WHERE actif = true;

CREATE INDEX IF NOT EXISTS idx_artisans_metier
  ON public.profiles_artisans (metier)
  WHERE actif = true;

CREATE INDEX IF NOT EXISTS idx_artisans_localisation
  ON public.profiles_artisans (latitude, longitude)
  WHERE actif = true;

-- Recherche de services par artisan / catégorie
CREATE INDEX IF NOT EXISTS idx_services_artisan
  ON public.services (artisan_id);

CREATE INDEX IF NOT EXISTS idx_services_categorie
  ON public.services (categorie)
  WHERE actif = true;

-- ────────────────────────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY — Activation
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles_artisans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles_clients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services              ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────
-- 6. RLS — profiles_artisans
-- ────────────────────────────────────────────────────────────────

-- Lecture publique : tout le monde peut voir les artisans actifs
CREATE POLICY "artisans_select_public"
  ON public.profiles_artisans
  FOR SELECT
  USING (
    actif = true
    OR auth.uid() = id       -- le artisan voit aussi son propre profil inactif
  );

-- Insertion : uniquement soi-même (id = uid())
CREATE POLICY "artisans_insert_self"
  ON public.profiles_artisans
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Mise à jour : uniquement son propre profil
CREATE POLICY "artisans_update_self"
  ON public.profiles_artisans
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Suppression : uniquement son propre profil
CREATE POLICY "artisans_delete_self"
  ON public.profiles_artisans
  FOR DELETE
  USING (auth.uid() = id);

-- ────────────────────────────────────────────────────────────────
-- 7. RLS — profiles_clients
-- ────────────────────────────────────────────────────────────────

-- Lecture : uniquement son propre profil
CREATE POLICY "clients_select_self"
  ON public.profiles_clients
  FOR SELECT
  USING (auth.uid() = id);

-- Insertion : uniquement soi-même
CREATE POLICY "clients_insert_self"
  ON public.profiles_clients
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Mise à jour : uniquement son propre profil
CREATE POLICY "clients_update_self"
  ON public.profiles_clients
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Suppression : uniquement son propre profil
CREATE POLICY "clients_delete_self"
  ON public.profiles_clients
  FOR DELETE
  USING (auth.uid() = id);

-- ────────────────────────────────────────────────────────────────
-- 8. RLS — services
-- ────────────────────────────────────────────────────────────────

-- Lecture publique : tout le monde peut voir les services actifs
-- Le artisan peut voir tous ses propres services (actifs ou non)
CREATE POLICY "services_select_public"
  ON public.services
  FOR SELECT
  USING (
    actif = true
    OR auth.uid() = artisan_id
  );

-- Insertion : uniquement le artisan propriétaire
CREATE POLICY "services_insert_owner"
  ON public.services
  FOR INSERT
  WITH CHECK (auth.uid() = artisan_id);

-- Mise à jour : uniquement le artisan propriétaire
CREATE POLICY "services_update_owner"
  ON public.services
  FOR UPDATE
  USING (auth.uid() = artisan_id)
  WITH CHECK (auth.uid() = artisan_id);

-- Suppression : uniquement le artisan propriétaire
CREATE POLICY "services_delete_owner"
  ON public.services
  FOR DELETE
  USING (auth.uid() = artisan_id);

-- ────────────────────────────────────────────────────────────────
-- 9. TRIGGER — création automatique du profil étendu à l'inscription
--    (mise à jour de la fonction définie dans la migration 001)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Récupère le rôle depuis les métadonnées (défini à l'inscription)
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');

  -- Insère dans la table de rôle unifiée (migration 001)
  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, v_role);

  -- Crée le profil étendu selon le rôle
  IF v_role = 'artisan' THEN
    INSERT INTO public.profiles_artisans (id)
    VALUES (NEW.id);
  ELSE
    INSERT INTO public.profiles_clients (id)
    VALUES (NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- Le trigger on_auth_user_created est déjà défini dans la migration 001,
-- il appelle handle_new_user() qui est maintenant mis à jour.

-- ────────────────────────────────────────────────────────────────
-- 10. VUE UTILITAIRE : artisans avec leurs services
--     Pratique pour afficher les fiches artisans côté client
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.artisans_avec_services AS
  SELECT
    pp.id,
    pp.nom,
    pp.prenom,
    pp.bio,
    pp.metier,
    pp.ville,
    pp.code_postal,
    pp.latitude,
    pp.longitude,
    pp.photo_url,
    pp.note_moyenne,
    pp.nombre_avis,
    pp.created_at,
    COALESCE(
      json_agg(
        json_build_object(
          'id',            s.id,
          'titre',         s.titre,
          'description',   s.description,
          'prix',          s.prix,
          'duree_minutes', s.duree_minutes,
          'categorie',     s.categorie
        )
      ) FILTER (WHERE s.id IS NOT NULL AND s.actif = true),
      '[]'::json
    ) AS services
  FROM public.profiles_artisans pp
  LEFT JOIN public.services s ON s.artisan_id = pp.id
  WHERE pp.actif = true
  GROUP BY pp.id;

-- ────────────────────────────────────────────────────────────────
-- 11. FONCTION UTILITAIRE : mise à jour automatique de note_moyenne
--     À appeler depuis une table avis (future migration)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_note_artisan(p_artisan_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Placeholder : à adapter quand la table `avis` sera créée
  -- UPDATE public.profiles_artisans
  -- SET
  --   note_moyenne = (SELECT AVG(note) FROM public.avis WHERE artisan_id = p_artisan_id),
  --   nombre_avis  = (SELECT COUNT(*)  FROM public.avis WHERE artisan_id = p_artisan_id)
  -- WHERE id = p_artisan_id;
  RAISE NOTICE 'update_note_artisan : à implémenter avec la table avis';
END;
$$;

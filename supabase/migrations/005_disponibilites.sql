-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 005 : Tables disponibilites & indisponibilites
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. disponibilites — planning hebdomadaire récurrent ───────────────────────

CREATE TABLE IF NOT EXISTS public.disponibilites (
  id             uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  artisan_id uuid      NOT NULL
    REFERENCES public.profiles_artisans(id) ON DELETE CASCADE,

  -- 0 = lundi, 1 = mardi, …, 6 = dimanche  (ISO weekday − 1)
  jour_semaine   smallint  NOT NULL CHECK (jour_semaine BETWEEN 0 AND 6),

  heure_debut    time      NOT NULL,
  heure_fin      time      NOT NULL,
  actif          boolean   NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),

  -- Intégrité : la fin doit être après le début
  CONSTRAINT dispo_heure_coherente CHECK (heure_fin > heure_debut)
);

COMMENT ON TABLE  public.disponibilites IS
  'Planning hebdomadaire récurrent des artisans (ex : lundi 09h-18h).';
COMMENT ON COLUMN public.disponibilites.jour_semaine IS
  '0 = lundi, 1 = mardi, 2 = mercredi, 3 = jeudi, 4 = vendredi, 5 = samedi, 6 = dimanche.';
COMMENT ON COLUMN public.disponibilites.heure_debut IS
  'Heure de début du créneau (format HH:MM, ex : 09:00).';
COMMENT ON COLUMN public.disponibilites.heure_fin IS
  'Heure de fin du créneau (format HH:MM, ex : 18:00).';

-- ── 2. indisponibilites — exceptions ponctuelles ──────────────────────────────

CREATE TABLE IF NOT EXISTS public.indisponibilites (
  id             uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  artisan_id uuid      NOT NULL
    REFERENCES public.profiles_artisans(id) ON DELETE CASCADE,

  date_debut     date      NOT NULL,
  date_fin       date      NOT NULL,

  -- Raison lisible : "Vacances", "Jour férié", "Formation", etc.
  motif          text,
  created_at     timestamptz NOT NULL DEFAULT now(),

  -- Intégrité : la fin doit être >= au début (même jour autorisé)
  CONSTRAINT indispo_dates_coherentes CHECK (date_fin >= date_debut)
);

COMMENT ON TABLE  public.indisponibilites IS
  'Exceptions au planning récurrent : congés, jours fériés, fermetures ponctuelles.';
COMMENT ON COLUMN public.indisponibilites.date_debut IS
  'Premier jour de la période d''indisponibilité (inclusif).';
COMMENT ON COLUMN public.indisponibilites.date_fin IS
  'Dernier jour de la période d''indisponibilité (inclusif).';
COMMENT ON COLUMN public.indisponibilites.motif IS
  'Raison optionnelle (ex : Vacances d''été, Pont du 8 mai…).';

-- ── 3. Index ──────────────────────────────────────────────────────────────────

-- Lookup rapide des créneaux actifs d'un artisan pour un jour donné
CREATE INDEX IF NOT EXISTS idx_disponibilites_artisan_jour
  ON public.disponibilites (artisan_id, jour_semaine)
  WHERE actif = true;

-- Lookup des indisponibilités actives dans une plage de dates
CREATE INDEX IF NOT EXISTS idx_indisponibilites_artisan_dates
  ON public.indisponibilites (artisan_id, date_debut, date_fin);

-- ── 4. Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE public.disponibilites   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indisponibilites ENABLE ROW LEVEL SECURITY;

-- ·· disponibilites ············································

-- Tout le monde peut lire le planning (profil public)
CREATE POLICY "dispo_select_public"
  ON public.disponibilites FOR SELECT
  USING (true);

-- Seul le artisan propriétaire peut gérer ses créneaux
CREATE POLICY "dispo_insert_own"
  ON public.disponibilites FOR INSERT
  WITH CHECK (auth.uid() = artisan_id);

CREATE POLICY "dispo_update_own"
  ON public.disponibilites FOR UPDATE
  USING (auth.uid() = artisan_id);

CREATE POLICY "dispo_delete_own"
  ON public.disponibilites FOR DELETE
  USING (auth.uid() = artisan_id);

-- ·· indisponibilites ··········································

CREATE POLICY "indispo_select_public"
  ON public.indisponibilites FOR SELECT
  USING (true);

CREATE POLICY "indispo_insert_own"
  ON public.indisponibilites FOR INSERT
  WITH CHECK (auth.uid() = artisan_id);

CREATE POLICY "indispo_update_own"
  ON public.indisponibilites FOR UPDATE
  USING (auth.uid() = artisan_id);

CREATE POLICY "indispo_delete_own"
  ON public.indisponibilites FOR DELETE
  USING (auth.uid() = artisan_id);

-- ── 5. Vue utilitaire : planning_hebdomadaire ─────────────────────────────────
-- Joint le planning avec les infos du artisan pour affichage côté client

CREATE OR REPLACE VIEW public.planning_hebdomadaire AS
SELECT
  d.id,
  d.artisan_id,
  p.nom,
  p.prenom,
  p.metier,
  p.ville,
  -- Libellé du jour lisible
  CASE d.jour_semaine
    WHEN 0 THEN 'Lundi'
    WHEN 1 THEN 'Mardi'
    WHEN 2 THEN 'Mercredi'
    WHEN 3 THEN 'Jeudi'
    WHEN 4 THEN 'Vendredi'
    WHEN 5 THEN 'Samedi'
    WHEN 6 THEN 'Dimanche'
  END AS jour_libelle,
  d.jour_semaine,
  d.heure_debut,
  d.heure_fin,
  d.actif
FROM public.disponibilites d
JOIN public.profiles_artisans p ON p.id = d.artisan_id
WHERE d.actif = true
ORDER BY d.artisan_id, d.jour_semaine, d.heure_debut;

-- ── 6. Fonction : est_disponible(artisan_id, date_cible) ─────────────────
-- Retourne true si le artisan a un créneau actif ce jour-là
-- ET qu'aucune indisponibilité ne couvre cette date.

CREATE OR REPLACE FUNCTION public.est_disponible(
  p_artisan_id uuid,
  p_date           date
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Condition 1 : au moins un créneau actif ce jour de la semaine
    -- ISODOW retourne 1=lundi…7=dimanche ; on soustrait 1 → 0=lundi…6=dimanche
    EXISTS (
      SELECT 1
      FROM   disponibilites
      WHERE  artisan_id = p_artisan_id
        AND  actif = true
        AND  jour_semaine = (EXTRACT(ISODOW FROM p_date)::int - 1)
    )
    AND
    -- Condition 2 : aucune indisponibilité ne couvre cette date
    NOT EXISTS (
      SELECT 1
      FROM   indisponibilites
      WHERE  artisan_id = p_artisan_id
        AND  p_date BETWEEN date_debut AND date_fin
    );
$$;

COMMENT ON FUNCTION public.est_disponible IS
  'Retourne true si le artisan a un créneau actif le jour de la semaine '
  'correspondant à p_date et qu''aucune indisponibilité ne la couvre.';

-- ── 7. Fonction : creneaux_disponibles(artisan_id, date_cible) ────────────
-- Retourne les créneaux horaires actifs du artisan pour une date donnée,
-- uniquement s'il n'y a pas d'indisponibilité couvrant cette date.

CREATE OR REPLACE FUNCTION public.creneaux_disponibles(
  p_artisan_id uuid,
  p_date           date
)
RETURNS TABLE (
  id           uuid,
  heure_debut  time,
  heure_fin    time
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.heure_debut, d.heure_fin
  FROM   disponibilites d
  WHERE  d.artisan_id = p_artisan_id
    AND  d.actif = true
    AND  d.jour_semaine = (EXTRACT(ISODOW FROM p_date)::int - 1)
    -- Exclure si une indisponibilité couvre cette date
    AND  NOT EXISTS (
      SELECT 1
      FROM   indisponibilites i
      WHERE  i.artisan_id = p_artisan_id
        AND  p_date BETWEEN i.date_debut AND i.date_fin
    )
  ORDER BY d.heure_debut;
$$;

COMMENT ON FUNCTION public.creneaux_disponibles IS
  'Retourne les créneaux horaires actifs du artisan pour p_date, '
  'après vérification des indisponibilités.';

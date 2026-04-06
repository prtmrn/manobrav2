-- 1. Supprimer les vues qui dépendent de metier
DROP VIEW IF EXISTS public.planning_hebdomadaire;
DROP VIEW IF EXISTS public.reservations_detail;
DROP VIEW IF EXISTS public.artisans_avec_services;

-- 2. Convertir metier de TEXT en TEXT[]
ALTER TABLE public.profiles_artisans
  ALTER COLUMN metier TYPE TEXT[]
  USING CASE WHEN metier IS NULL THEN NULL ELSE ARRAY[metier] END;

-- 3. Recréer reservations_detail
CREATE OR REPLACE VIEW public.reservations_detail AS
SELECT
  r.id, r.date, r.heure_debut, r.heure_fin, r.statut,
  r.adresse_intervention, r.note_client, r.montant_total,
  r.commission_plateforme, r.montant_artisan,
  r.stripe_payment_intent_id, r.created_at, r.updated_at,
  r.client_id, r.artisan_id, r.service_id
FROM public.reservations r;

-- 4. Recréer planning_hebdomadaire
CREATE OR REPLACE VIEW public.planning_hebdomadaire AS
SELECT
  d.id, d.artisan_id, p.nom, p.prenom, p.metier, p.ville,
  CASE d.jour_semaine
    WHEN 0 THEN 'Lundi'
    WHEN 1 THEN 'Mardi'
    WHEN 2 THEN 'Mercredi'
    WHEN 3 THEN 'Jeudi'
    WHEN 4 THEN 'Vendredi'
    WHEN 5 THEN 'Samedi'
    WHEN 6 THEN 'Dimanche'
  END AS jour_libelle,
  d.jour_semaine, d.heure_debut, d.heure_fin, d.actif
FROM public.disponibilites d
JOIN public.profiles_artisans p ON p.id = d.artisan_id
WHERE d.actif = true
ORDER BY d.artisan_id, d.jour_semaine, d.heure_debut;

-- 5. Recréer artisans_avec_services
CREATE OR REPLACE VIEW public.artisans_avec_services AS
SELECT
  pa.id, pa.nom, pa.prenom, pa.bio, pa.metier, pa.adresse,
  pa.ville, pa.code_postal, pa.latitude, pa.longitude,
  pa.photo_url, pa.actif, pa.note_moyenne, pa.nombre_avis, pa.created_at,
  s.id AS service_id, s.titre AS service_titre,
  s.description AS service_description, s.prix AS service_prix,
  s.duree_minutes AS service_duree_minutes,
  s.categorie AS service_categorie, s.actif AS service_actif
FROM public.profiles_artisans pa
LEFT JOIN public.services s ON s.artisan_id = pa.id AND s.actif = true;

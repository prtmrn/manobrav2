-- ================================================================
-- Migration 013 : Index de performance pour le lancement
-- Colonnes fréquemment filtrées : artisan_id, client_id,
--   statut, actif, ville
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- 1. TABLE : profiles_artisans
-- ────────────────────────────────────────────────────────────────

-- Filtre principal de la page /recherche (actif = true)
CREATE INDEX IF NOT EXISTS idx_artisans_actif
  ON public.profiles_artisans (actif)
  WHERE actif = true;          -- partial index : ne couvre que les actifs

-- Filtre par ville (recherche ilike → ne peut pas utiliser cet index,
-- mais utile pour les filtres exacts et le tri)
CREATE INDEX IF NOT EXISTS idx_artisans_ville
  ON public.profiles_artisans (ville);

-- Tri fréquent par note côté /recherche et /map
CREATE INDEX IF NOT EXISTS idx_artisans_note_moyenne
  ON public.profiles_artisans (note_moyenne DESC)
  WHERE actif = true;

-- Lookup par métier (filtre exact)
CREATE INDEX IF NOT EXISTS idx_artisans_metier
  ON public.profiles_artisans (metier)
  WHERE actif = true;

-- ────────────────────────────────────────────────────────────────
-- 2. TABLE : services
-- ────────────────────────────────────────────────────────────────

-- Jointure profiles_artisans ↔ services (très fréquente)
CREATE INDEX IF NOT EXISTS idx_services_artisan_id
  ON public.services (artisan_id);

-- Filtre actif dans la jointure
CREATE INDEX IF NOT EXISTS idx_services_artisan_actif
  ON public.services (artisan_id, actif)
  WHERE actif = true;

-- ────────────────────────────────────────────────────────────────
-- 3. TABLE : reservations
-- ────────────────────────────────────────────────────────────────

-- Toutes les requêtes dashboard client filtrent par client_id
CREATE INDEX IF NOT EXISTS idx_reservations_client_id
  ON public.reservations (client_id);

-- Toutes les requêtes dashboard artisan filtrent par artisan_id
CREATE INDEX IF NOT EXISTS idx_reservations_artisan_id
  ON public.reservations (artisan_id);

-- Filtre par statut (ex : statut = 'termine' pour les avis)
CREATE INDEX IF NOT EXISTS idx_reservations_statut
  ON public.reservations (statut);

-- Index composite : les dashboards filtrent par (client_id, statut) ou (artisan_id, statut)
CREATE INDEX IF NOT EXISTS idx_reservations_client_statut
  ON public.reservations (client_id, statut);

CREATE INDEX IF NOT EXISTS idx_reservations_artisan_statut
  ON public.reservations (artisan_id, statut);

-- Tri par date (planning, liste de réservations)
CREATE INDEX IF NOT EXISTS idx_reservations_date
  ON public.reservations (date DESC);

-- ────────────────────────────────────────────────────────────────
-- 4. TABLE : disponibilites
-- ────────────────────────────────────────────────────────────────

-- Filtre dispo par artisan + actif + jour (page /recherche, filtre dispo)
CREATE INDEX IF NOT EXISTS idx_disponibilites_artisan_actif
  ON public.disponibilites (artisan_id, actif, jour_semaine)
  WHERE actif = true;

-- ────────────────────────────────────────────────────────────────
-- 5. TABLE : avis
-- ────────────────────────────────────────────────────────────────

-- Récupération des avis par artisan (page de profil)
CREATE INDEX IF NOT EXISTS idx_avis_artisan_id
  ON public.avis (artisan_id);

-- Vérification d'un avis existant par réservation
CREATE INDEX IF NOT EXISTS idx_avis_reservation_id
  ON public.avis (reservation_id);

-- ────────────────────────────────────────────────────────────────
-- 6. TABLE : favoris
-- ────────────────────────────────────────────────────────────────

-- Dashboard client : liste des favoris du client
CREATE INDEX IF NOT EXISTS idx_favoris_client_id
  ON public.favoris (client_id);

-- Vérification rapide si un artisan est en favori
CREATE INDEX IF NOT EXISTS idx_favoris_client_artisan
  ON public.favoris (client_id, artisan_id);

-- ────────────────────────────────────────────────────────────────
-- Notes d'exécution
-- ────────────────────────────────────────────────────────────────
-- • Tous les index utilisent IF NOT EXISTS → idempotents
-- • Les partial indexes (WHERE actif = true / WHERE actif = true)
--   réduisent la taille de l'index et accélèrent les scans courants
-- • REINDEX CONCURRENTLY possible en production si nécessaire

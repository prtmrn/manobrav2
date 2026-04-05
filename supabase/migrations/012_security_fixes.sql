-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 012 : Correctifs sécurité RLS
-- Problèmes corrigés :
--   1. profiles INSERT → WITH CHECK (true) trop permissive
--   2. avis INSERT → WITH CHECK (auth.uid() IS NOT NULL) trop permissive
--      (n'importe quel utilisateur authentifié pouvait insérer un avis
--       pour une réservation qui ne lui appartient pas via l'API Supabase directe)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. TABLE profiles : restreindre INSERT à id = auth.uid() ─────────────────

DROP POLICY IF EXISTS "Insertion du profil" ON public.profiles;

-- Seul le trigger SECURITY DEFINER (handle_new_user) peut insérer dans profiles.
-- Le trigger s'exécute en SECURITY DEFINER → il contourne le RLS → OK.
-- Côté client, on ne doit pas pouvoir créer un profil pour un autre utilisateur.
CREATE POLICY "profiles_insert_self"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ── 2. TABLE avis : restreindre INSERT au client propriétaire ────────────────

DROP POLICY IF EXISTS "avis_insert_authenticated" ON public.avis;

-- La policy vérifie maintenant que auth.uid() = client_id.
-- Combiné au trigger trg_check_avis_reservation (statut = 'termine')
-- et à la vérification applicative dans /api/avis/route.ts,
-- cela empêche tout avis frauduleux même via un appel Supabase direct.
CREATE POLICY "avis_insert_own"
  ON public.avis
  FOR INSERT
  WITH CHECK (auth.uid() = client_id);

-- ── 3. Vérification recommandée après migration ────────────────────────────────
-- Exécuter dans Supabase SQL Editor :
--
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'profiles', 'profiles_artisans', 'profiles_clients',
--     'services', 'avis', 'favoris', 'reservations',
--     'disponibilites', 'indisponibilites'
--   );
-- → Toutes les lignes doivent avoir rowsecurity = true.

-- ================================================================
-- Migration 003 : Bucket Supabase Storage pour les avatars
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ================================================================

-- 1. Création du bucket "avatars" (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,  -- 5 Mo max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public            = true,
  file_size_limit   = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 2. Politique : lecture publique de tous les avatars
CREATE POLICY "avatars_public_read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

-- 3. Politique : un utilisateur peut uploader dans son propre dossier
--    Structure du chemin : {userId}/avatar.{ext}
CREATE POLICY "avatars_upload_own"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 4. Politique : un utilisateur peut mettre à jour son propre avatar
CREATE POLICY "avatars_update_own"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 5. Politique : un utilisateur peut supprimer son propre avatar
CREATE POLICY "avatars_delete_own"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

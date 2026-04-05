-- ============================================================
-- Migration : table profiles avec rôle client / artisan
-- À exécuter dans : Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Suppression de l'ancienne table si elle existe
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. Création de la table profiles
CREATE TABLE public.profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT        NOT NULL CHECK (role IN ('client', 'artisan')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Activation du Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Politique : l'utilisateur peut lire son propre profil
CREATE POLICY "Lecture du profil personnel"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 5. Politique : l'utilisateur peut mettre à jour son propre profil
CREATE POLICY "Mise à jour du profil personnel"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- 6. Politique : insertion autorisée (via trigger SECURITY DEFINER)
CREATE POLICY "Insertion du profil"
  ON public.profiles
  FOR INSERT
  WITH CHECK (true);

-- 7. Fonction trigger : crée le profil à l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  );
  RETURN NEW;
END;
$$;

-- 8. Trigger déclenché après chaque nouvel utilisateur dans auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

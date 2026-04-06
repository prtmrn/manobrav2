-- Migration 017 : réservations guest (client_id nullable + champs guest)

-- 1. Rendre client_id nullable
ALTER TABLE public.reservations
  ALTER COLUMN client_id DROP NOT NULL;

-- 2. Ajouter les champs guest
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS guest_nom TEXT,
  ADD COLUMN IF NOT EXISTS guest_telephone TEXT,
  ADD COLUMN IF NOT EXISTS guest_email TEXT;

"use client";

import { createClient } from "@/lib/supabase/client";

const BUCKET = "avatars";
const MAX_FILE_SIZE_MB = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export interface UploadResult {
  publicUrl: string;
  path: string;
}

/**
 * Valide un fichier image avant upload.
 * @throws {Error} si le fichier est invalide
 */
export function validateImageFile(file: File): void {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(
      `Format non supporté : ${file.type}. Utilisez JPG, PNG, WebP ou GIF.`
    );
  }
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > MAX_FILE_SIZE_MB) {
    throw new Error(
      `Fichier trop volumineux : ${sizeMB.toFixed(1)} Mo. Maximum : ${MAX_FILE_SIZE_MB} Mo.`
    );
  }
}

/**
 * Upload la photo de profil d'un artisan vers Supabase Storage.
 * Le fichier est stocké dans : avatars/{userId}/avatar.{ext}
 *
 * @param file  - Fichier image à uploader
 * @param userId - UUID de l'utilisateur
 * @returns URL publique de la photo
 */
export async function uploadPrestairePhoto(
  file: File,
  userId: string
): Promise<UploadResult> {
  validateImageFile(file);

  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });

  if (uploadError) {
    throw new Error(`Erreur upload : ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  // Ajoute un cache-buster pour forcer le rechargement de l'image
  const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

  return { publicUrl, path };
}

/**
 * Supprime la photo de profil d'un artisan depuis Supabase Storage.
 */
export async function deletePrestairePhoto(path: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
    console.warn("[storage] Erreur suppression photo :", error.message);
  }
}

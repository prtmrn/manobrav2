import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/metier-slug";
import { METIER_LIST } from "@/components/map/metier-config";

// Revalider le sitemap toutes les heures
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://manobra.fr";

  // ── Pages statiques ────────────────────────────────────────────────────────
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/recherche`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/map`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  // ── Pages métiers (SEO) ──────────────────────────────────────────────────
  const metiersRoutes: MetadataRoute.Sitemap = METIER_LIST
    .filter((m) => m !== "Autre")
    .map((m) => ({
      url: `${baseUrl}/metiers/${slugify(m)}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    }));

  // ── Pages dynamiques : profils artisans publics ────────────────────────
  let artisansRoutes: MetadataRoute.Sitemap = [];

  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles_artisans")
      .select("id, created_at")
      .eq("actif", true)
      .order("created_at", { ascending: false })
      .limit(5000); // Limite raisonnable pour un sitemap

    artisansRoutes = (data ?? []).map((p) => ({
      url: `${baseUrl}/prestataires/${p.id}`,
      lastModified: p.created_at ? new Date(p.created_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    // En cas d'erreur BD, on génère quand même le sitemap des pages statiques
    console.error("[sitemap] Failed to fetch artisans");
  }

  return [...staticRoutes, ...metiersRoutes, ...artisansRoutes];
}

import type { MetadataRoute } from "next";

// Génère automatiquement /robots.txt via l'API Metadata de Next.js
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://Manobra.fr";

  return {
    rules: [
      {
        // Tous les robots : autoriser les pages publiques
        userAgent: "*",
        allow: [
          "/",
          "/recherche",
          "/map",
          "/artisans/",
        ],
        disallow: [
          // Pages privées — dashboard, réservations, avis, onboarding
          "/dashboard/",
          "/reserver/",
          "/avis/",
          "/onboarding/",
          // Routes API
          "/api/",
          // Auth
          "/auth/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}

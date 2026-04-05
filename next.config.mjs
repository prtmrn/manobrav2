// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage (avatars, photos artisans)
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      // Google Maps Street View / Static Maps
      {
        protocol: "https",
        hostname: "maps.googleapis.com",
      },
      // Google User Photos (OAuth avatars)
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
    // Activer le format AVIF/WebP automatique pour réduire le poids des images
    formats: ["image/avif", "image/webp"],
    // Limiter la taille mémoire du cache d'images serveur
    minimumCacheTTL: 3600,
  },

  // Compression gzip/brotli activée par défaut dans Next.js
  compress: true,

  // En production : désactiver les logs inutiles de React 18 strict mode
  reactStrictMode: true,

  // Headers de sécurité et de performance
  async headers() {
    return [
      {
        // Appliquer à toutes les routes
        source: "/(.*)",
        headers: [
          // Sécurité
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // Assets statiques Next.js (_next/static) : cache long
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Images optimisées : cache 1 heure côté client
        source: "/_next/image(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

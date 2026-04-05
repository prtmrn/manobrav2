import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// ─── Polices ──────────────────────────────────────────────────────────────────
// next/font/google gère automatiquement le self-hosting, le preload
// et le display:swap → aucun FOIT, aucune requête réseau externe
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  // Préchargement uniquement des poids utilisés
  weight: ["400", "500", "600", "700"],
});

// ─── Viewport ─────────────────────────────────────────────────────────────────
export const viewport: Viewport = {
  themeColor: "#16a34a",          // brand-600 — barre de statut mobile
  width: "device-width",
  initialScale: 1,
};

// ─── Metadata globale ─────────────────────────────────────────────────────────
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://Manobra.fr"
  ),
  title: {
    default: "Manobra — Artisans & artisans à domicile",
    template: "%s | Manobra",
  },
  description:
    "Trouvez des plombiers, électriciens, peintres et autres professionnels " +
    "vérifiés près de chez vous. Réservez en ligne en quelques clics.",
  keywords: [
    "artisan",
    "artisan",
    "plombier",
    "électricien",
    "peintre",
    "ménage",
    "jardinage",
    "réservation en ligne",
  ],
  authors: [{ name: "Manobra" }],
  creator: "Manobra",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Manobra",
    title: "Manobra — Artisans & artisans à domicile",
    description:
      "Trouvez des professionnels vérifiés près de chez vous et réservez en ligne.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Manobra — Artisans & artisans à domicile",
    description:
      "Trouvez des professionnels vérifiés près de chez vous et réservez en ligne.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={inter.variable}>
      <head>
        {/* Preconnect aux services tiers pour réduire la latence (LCP) */}
        <link rel="preconnect" href="https://maps.googleapis.com" />
        <link rel="preconnect" href="https://maps.gstatic.com" crossOrigin="" />
      </head>
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}

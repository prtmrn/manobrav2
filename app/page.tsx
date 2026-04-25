import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { METIER_CONFIG, METIER_LIST } from "@/components/map/metier-config";
import HowItWorksTabs from "@/components/landing/HowItWorksTabs";
import NavbarLanding from "@/components/landing/NavbarLanding";
import HeroCTA from "@/components/landing/HeroCTA";

// ─── Cache 24 h (ISR) | les avis et stats changent peu ───────────────────────
export const revalidate = 86400;

// ─── SEO : Metadata ───────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title:
    "Manobra | Artisans qualifiés à domicile | Serrurier, Plombier, Électricien",
  description:
    "Trouvez des artisans et artisans vérifiés près de chez vous : plombier, " +
    "électricien, peintre, ménage, jardinage à Paris, Lyon, Marseille, Bordeaux, " +
    "Toulouse. Réservez en ligne, payez en sécurité.",
  keywords: [
    "artisan à domicile",
    "artisan de services",
    "plombier pas cher",
    "électricien certifié",
    "peintre en bâtiment",
    "service ménage",
    "jardinier professionnel",
    "réservation artisan en ligne",
    "artisan vérifié",
    "Paris",
    "Lyon",
    "Marseille",
    "Bordeaux",
    "Toulouse",
    "Lille",
    "Nantes",
    "Strasbourg",
  ],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Manobra",
    title: "Manobra | Artisans qualifiés à domicile",
    description:
      "Trouvez des professionnels vérifiés près de chez vous et réservez en ligne. " +
      "Serrurier, plombier, électricien, chauffagiste et plus encore.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Manobra | Artisans qualifiés à domicile",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Manobra | Artisans qualifiés à domicile",
    description:
      "Trouvez des professionnels vérifiés et réservez en ligne. " +
      "Serrurier, plombier, électricien…",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_SITE_URL ?? "https://Manobra.fr",
  },
};

// ─── JSON-LD : LocalBusiness + WebSite ───────────────────────────────────────
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://Manobra.fr";

const jsonLdLocalBusiness = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": siteUrl,
  name: "Manobra",
  description:
    "Plateforme de mise en relation entre particuliers et artisans / " +
    "artisans de services à domicile : plombier, électricien, peintre, ménage, jardinage.",
  url: siteUrl,
  logo: `${siteUrl}/logo.png`,
  image: `${siteUrl}/og-image.png`,
  telephone: "",
  email: "contact@Manobra.fr",
  address: {
    "@type": "PostalAddress",
    addressCountry: "FR",
  },
  areaServed: [
    "Paris", "Lyon", "Marseille", "Bordeaux", "Toulouse",
    "Lille", "Nantes", "Strasbourg", "Nice", "Montpellier",
  ].map((city) => ({ "@type": "City", name: city })),
  priceRange: "€€",
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: [
      "Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday",
    ],
    opens: "00:00",
    closes: "23:59",
  },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Services à domicile",
    itemListElement: METIER_LIST.map((m, i) => ({
      "@type": "Offer",
      "@id": `${siteUrl}/recherche?metier=${encodeURIComponent(m)}`,
      position: i + 1,
      name: METIER_CONFIG[m].label,
      category: "Service à domicile",
    })),
  },
};

const jsonLdWebSite = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Manobra",
  url: siteUrl,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${siteUrl}/recherche?metier={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

// ─── Fetch des meilleurs avis depuis Supabase ─────────────────────────────────

type AvisWithartisan = {
  id: string;
  note: number;
  commentaire: string | null;
  nom_client: string | null;
  created_at: string;
  artisan_id: string;
  artisan_nom: string | null;
  artisan_prenom: string | null;
  artisan_metier: string | null;
  artisan_photo_url: string | null;
};

async function fetchTopAvis(): Promise<AvisWithartisan[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("avis")
      .select(
        "id, note, commentaire, nom_client, created_at, artisan_id, " +
          "profiles_artisans!artisan_id(nom, prenom, metier, photo_url)"
      )
      .eq("note", 5)
      .not("commentaire", "is", null)
      .not("commentaire", "eq", "")
      .order("created_at", { ascending: false })
      .limit(6);

    if (!data) return [];

    // Aplatit le résultat joint + filtre les commentaires trop courts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any[])
      .filter((a) => a.commentaire && a.commentaire.length >= 30)
      .slice(0, 3)
      .map((a) => ({
        id: a.id,
        note: a.note,
        commentaire: a.commentaire,
        nom_client: a.nom_client,
        created_at: a.created_at,
        artisan_id: a.artisan_id,
        artisan_nom: a.profiles_artisans?.nom ?? null,
        artisan_prenom: a.profiles_artisans?.prenom ?? null,
        artisan_metier: a.profiles_artisans?.metier ?? null,
        artisan_photo_url: a.profiles_artisans?.photo_url ?? null,
      }));
  } catch {
    // Si la BD n'est pas accessible (env de dev), on retourne des avis fictifs
    return FALLBACK_AVIS;
  }
}

// ─── Avis de secours (affichés si BD vide ou inaccessible) ───────────────────

const FALLBACK_AVIS: AvisWithartisan[] = [
  {
    id: "1",
    note: 5,
    commentaire:
      "Plombier exceptionnel ! Intervention rapide, travail propre et soigné. " +
      "Je recommande Manobra les yeux fermés.",
    nom_client: "Marie L.",
    created_at: new Date().toISOString(),
    artisan_id: "",
    artisan_nom: "Dupont",
    artisan_prenom: "Jean",
    artisan_metier: "Plombier",
    artisan_photo_url: null,
  },
  {
    id: "2",
    note: 5,
    commentaire:
      "Électricien très professionnel. A réglé mon problème en moins d'une heure. " +
      "Tarif honnête, devis respecté. Merci !",
    nom_client: "Thomas R.",
    created_at: new Date().toISOString(),
    artisan_id: "",
    artisan_nom: "Martin",
    artisan_prenom: "Sophie",
    artisan_metier: "Électricien",
    artisan_photo_url: null,
  },
  {
    id: "3",
    note: 5,
    commentaire:
      "Service de ménage impeccable, ponctuelle et très consciencieuse. " +
      "Mon appartement n'a jamais été aussi propre !",
    nom_client: "Isabelle M.",
    created_at: new Date().toISOString(),
    artisan_id: "",
    artisan_nom: "Bernard",
    artisan_prenom: "Clara",
    artisan_metier: "Chauffagiste",
    artisan_photo_url: null,
  },
];

// ─── Sous-composants ──────────────────────────────────────────────────────────

function StarsFull({ count = 5 }: { count?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} className="w-4 h-4 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-bold text-brand-600 tracking-widest uppercase mb-3">
      <span className="w-8 h-px bg-brand-400 inline-block" />
      {children}
      <span className="w-8 h-px bg-brand-400 inline-block" />
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const topAvis = await fetchTopAvis();

  return (
    <>
      {/* ── JSON-LD Structured Data ─────────────────────────────────────────── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdLocalBusiness) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebSite) }}
      />

      <div className="min-h-screen bg-white">

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/*  NAVBAR                                                           */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 relative">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white text-lg shadow-sm group-hover:bg-brand-700 transition-colors">
              </div>
              <span className="font-bold text-gray-900 text-lg tracking-tight">
                Man<span className="text-brand-600">obra</span>
              </span>
            </Link>

            {/* Links */}
            <div className="hidden sm:flex items-center gap-6 text-sm text-gray-600">

            </div>

            {/* Auth */}
            <NavbarLanding />
          </nav>
        </header>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/*  HERO                                                             */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white pt-20 pb-24 sm:pt-28 sm:pb-32">
          {/* Fond décoratif */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-brand-100/40 blur-3xl" />
            <div className="absolute top-20 -left-20 w-[400px] h-[400px] rounded-full bg-emerald-50 blur-2xl" />
          </div>

          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white border border-brand-100 rounded-full px-4 py-1.5 text-xs font-semibold text-brand-700 shadow-sm mb-8">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
              Des professionnels vérifiés, disponibles maintenant
            </div>

            {/* Titre H1 */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight text-balance mb-6 leading-[1.1]">
              Trouvez le bon artisan,{" "}
              <span className="text-brand-600 relative">
                en 2 minutes
                {/* Trait soulignement décoratif */}
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 300 12"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 9.5C50 3.5 150 1 298 9.5"
                    stroke="#16a34a"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            {/* Sous-titre */}
            <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed text-balance">
              Serrurier, plombier, électricien, chauffagiste, vitrier…{" "}
              <strong className="text-gray-700 font-semibold">des professionnels vérifiés</strong>{" "}
              près de chez vous. Réservez en ligne, payez en sécurité.
            </p>

            {/* Double CTA */}
            <HeroCTA />


          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/*  AVIS CLIENTS                                                     */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/*  POURQUOI MANOBRA                                                 */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-3">
                Pourquoi choisir Manobra ?
              </h2>
              <p className="text-gray-500 text-base max-w-xl mx-auto">
                Une plateforme pensée pour simplifier la relation entre clients et artisans.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Argument 1 */}
              <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm flex flex-col gap-4">
                <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center">
                  <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base mb-1.5">Artisans vérifiés</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    SIRET contrôlé, identité vérifiée, avis certifiés par des clients ayant réellement fait appel à l&apos;artisan.
                  </p>
                </div>
              </div>
              {/* Argument 2 */}
              <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm flex flex-col gap-4">
                <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center">
                  <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base mb-1.5">Réservation en ligne</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Choisissez votre créneau directement dans l&apos;agenda de l&apos;artisan, sans appel téléphonique ni attente.
                  </p>
                </div>
              </div>
              {/* Argument 3 */}
              <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm flex flex-col gap-4">
                <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center">
                  <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base mb-1.5">Prix transparents</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Les tarifs indicatifs sont visibles sur chaque profil. Le devis définitif est établi sur place, avant toute intervention.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/*  CTA FINAL                                                        */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <section className="py-24 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-emerald-800 rounded-3xl px-8 py-16 sm:px-16 text-center shadow-2xl">
              {/* Décoration */}
              <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 blur-2xl" />
                <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/5 blur-2xl" />
                {/* Points décoratifs */}
                <div className="absolute top-6 left-6 grid grid-cols-3 gap-2 opacity-20">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-white" />
                  ))}
                </div>
                <div className="absolute bottom-6 right-6 grid grid-cols-3 gap-2 opacity-20">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-white" />
                  ))}
                </div>
              </div>

              <div className="relative">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 text-balance">
                  Prêt à trouver votre artisan idéal ?
                </h2>
                <p className="text-brand-100 text-base sm:text-lg mb-10 max-w-xl mx-auto leading-relaxed">
                  Trouvez le bon artisan en quelques clics. La première réservation prend moins de 2 minutes.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    href="/recherche"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-white text-brand-700 hover:bg-brand-50 font-bold px-8 py-4 rounded-2xl text-base transition-all duration-200 shadow-lg hover:-translate-y-0.5"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Trouver un artisan
                  </Link>
                  <Link
                    href="/auth/register"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/30 font-bold px-8 py-4 rounded-2xl text-base transition-all duration-200 hover:-translate-y-0.5"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Devenir artisan
                  </Link>
                </div>

                {/* Micro-reassurances */}
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-xs text-brand-200">
                  {["Gratuit pour les clients", "Aucun engagement", "Annulation facile"].map(
                    (item) => (
                      <span key={item} className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-brand-300" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {item}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/*  FOOTER                                                           */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <footer className="bg-gray-900 text-gray-400 py-12">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              {/* Logo footer */}
              <div className="flex items-center gap-2">
                <span className="text-xl"></span>
                <span className="font-bold text-white text-lg tracking-tight">
                  Man<span className="text-brand-400">obra</span>
                </span>
              </div>

              {/* Liens légaux */}
              <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs">
                {[
                  { label: "Mentions légales", href: "#" },
                  { label: "CGU", href: "#" },
                  { label: "Confidentialité", href: "#" },
                  { label: "Contact", href: "mailto:contact@Manobra.fr" },
                ].map(({ label, href }) => (
                  <Link
                    key={label}
                    href={href}
                    className="hover:text-white transition-colors"
                  >
                    {label}
                  </Link>
                ))}
              </nav>

              <p className="text-xs text-gray-600">
                © {new Date().getFullYear()} Manobra. Tous droits réservés.
              </p>
            </div>

            {/* Villes couvertes | SEO local */}
            <div className="mt-8 pt-8 border-t border-gray-800">
              <p className="text-xs text-gray-600 text-center leading-relaxed">
                Artisans disponibles à{" "}
                {[
                  "Paris","Lyon","Marseille","Bordeaux","Toulouse",
                  "Lille","Nantes","Strasbourg","Nice","Montpellier",
                  "Rennes","Grenoble","Toulon","Reims","Saint-Étienne",
                ].map((city, i, arr) => (
                  <span key={city}>
                    <Link
                      href={`/recherche?ville=${encodeURIComponent(city)}`}
                      className="hover:text-brand-400 transition-colors"
                    >
                      {city}
                    </Link>
                    {i < arr.length - 1 && ", "}
                  </span>
                ))}
                {" "}et dans toute la France.
              </p>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}

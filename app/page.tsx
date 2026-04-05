import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { METIER_CONFIG, METIER_LIST } from "@/components/map/metier-config";
import HowItWorksTabs from "@/components/landing/HowItWorksTabs";

// ─── Cache 24 h (ISR) — les avis et stats changent peu ───────────────────────
export const revalidate = 86400;

// ─── SEO : Metadata ───────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title:
    "Manobra — Artisans qualifiés à domicile | Serrurier, Plombier, Électricien",
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
    title: "Manobra — Artisans qualifiés à domicile",
    description:
      "Trouvez des professionnels vérifiés près de chez vous et réservez en ligne. " +
      "Serrurier, plombier, électricien, chauffagiste et plus encore.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Manobra — Artisans qualifiés à domicile",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Manobra — Artisans & artisans à domicile",
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
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100">
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
              <Link href="/recherche" className="hover:text-brand-600 transition-colors font-medium">
                Trouver un pro
              </Link>
              <Link href="/map" className="hover:text-brand-600 transition-colors font-medium">
                Carte
              </Link>
            </div>

            {/* Auth */}
            <div className="flex items-center gap-3">
              <Link
                href="/auth/login"
                className="hidden sm:inline text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Connexion
              </Link>
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm"
              >
                Commencer
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
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
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
              <Link
                href="/recherche"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold px-8 py-4 rounded-2xl text-base transition-all duration-200 shadow-lg shadow-brand-200 hover:shadow-brand-300 hover:-translate-y-0.5"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Je cherche un artisan
              </Link>
              <Link
                href="/auth/register"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-white hover:bg-gray-50 text-gray-800 font-bold px-8 py-4 rounded-2xl text-base transition-all duration-200 border-2 border-gray-200 hover:border-brand-300 hover:-translate-y-0.5"
              >
                <svg className="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Je suis artisan
              </Link>
            </div>

            {/* Chiffres clés / Social proof */}
            <div className="inline-flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-gray-500">
              {[
                { value: "500+", label: "artisans actifs" },
                { value: "4.8★", label: "Note moyenne" },
                { value: "2 min", label: "Pour réserver" },
                { value: "100%", label: "Sécurisé Stripe" },
              ].map(({ value, label }) => (
                <div key={label} className="flex flex-col items-center">
                  <span className="text-xl font-extrabold text-gray-900">{value}</span>
                  <span className="text-xs text-gray-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/*  COMMENT ÇA MARCHE                                               */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <section id="comment-ca-marche" className="py-24 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <SectionLabel>Simple & rapide</SectionLabel>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
                Comment ça marche ?
              </h2>
              <p className="text-gray-500 max-w-xl mx-auto text-base">
                Que vous soyez client ou artisan, tout est fait pour que l'expérience soit fluide et sans friction.
              </p>
            </div>

            {/* Tabs avec state client */}
            <HowItWorksTabs />
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/*  MÉTIERS DISPONIBLES                                              */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <section id="metiers" className="py-24 bg-gray-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <SectionLabel>Nos catégories</SectionLabel>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
                Tous les métiers disponibles
              </h2>
              <p className="text-gray-500 max-w-xl mx-auto text-base">
                Des experts pour chaque besoin à domicile, disponibles dans toute la France.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {METIER_LIST.map((metier) => {
                const config = METIER_CONFIG[metier];
                return (
                  <Link
                    key={metier}
                    href={`/recherche?metier=${encodeURIComponent(metier)}`}
                    className="group flex flex-col items-center gap-3 bg-white rounded-2xl border border-gray-100 p-6 hover:border-brand-200 hover:shadow-md hover:-translate-y-1 transition-all duration-200"
                  >
                    {/* Icône avec fond coloré */}
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shadow-sm transition-transform group-hover:scale-110 duration-200"
                      style={{ backgroundColor: config.color + "18" }}
                    >
                      {config.emoji}
                    </div>
                    <span className="text-sm font-semibold text-gray-800 text-center">
                      {config.label}
                    </span>
                    {/* Indicateur "Voir les pros" */}
                    <span className="text-xs text-brand-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity -mt-1">
                      Voir les pros →
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="text-center mt-10">
              <Link
                href="/recherche"
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
              >
                Voir tous les artisans disponibles
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/*  POURQUOI NOUS CHOISIR                                            */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <section id="pourquoi" className="py-24 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <SectionLabel>Nos engagements</SectionLabel>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
                Pourquoi choisir Manobra ?
              </h2>
              <p className="text-gray-500 max-w-xl mx-auto text-base">
                Nous avons conçu Manobra pour que trouver un bon artisan ne soit plus jamais un parcours du combattant.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Argument 1 */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-50 to-emerald-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative bg-white border border-gray-100 rounded-2xl p-8 hover:border-brand-100 transition-colors h-full flex flex-col">
                  <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-2xl mb-6 flex-shrink-0">
                    🛡️
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">
                    artisans vérifiés
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed flex-1">
                    Chaque artisan est contrôlé avant publication : identité, qualifications et avis clients authentiques. Zéro artisan fantôme.
                  </p>
                  <ul className="mt-5 space-y-2">
                    {["Profil validé manuellement", "Avis clients certifiés", "Paiement sécurisé Stripe"].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-xs text-gray-500">
                        <svg className="w-4 h-4 text-brand-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Argument 2 */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-50 to-emerald-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative bg-white border border-gray-100 rounded-2xl p-8 hover:border-brand-100 transition-colors h-full flex flex-col md:-mt-4 md:shadow-lg">
                  {/* Badge "Plus populaire" */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-brand-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm tracking-wide">
                      LE PLUS SIMPLE
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-2xl mb-6 flex-shrink-0">
                    ⚡
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">
                    Réservation instantanée
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed flex-1">
                    Fini les appels sans réponse. Consultez les disponibilités en temps réel et réservez votre créneau en 2 minutes, 24h/24.
                  </p>
                  <ul className="mt-5 space-y-2">
                    {["Agenda en temps réel", "Confirmation immédiate", "Rappels automatiques"].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-xs text-gray-500">
                        <svg className="w-4 h-4 text-brand-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Argument 3 */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-50 to-emerald-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative bg-white border border-gray-100 rounded-2xl p-8 hover:border-brand-100 transition-colors h-full flex flex-col">
                  <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center text-2xl mb-6 flex-shrink-0">
                    💳
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">
                    Paiement 100 % sécurisé
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed flex-1">
                    Vos paiements sont traités par Stripe, leader mondial du paiement en ligne. Vos données bancaires ne nous sont jamais transmises.
                  </p>
                  <ul className="mt-5 space-y-2">
                    {["Chiffrement SSL 256-bit", "Conforme PCI-DSS", "Remboursement garanti"].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-xs text-gray-500">
                        <svg className="w-4 h-4 text-brand-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/*  AVIS CLIENTS                                                     */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <section id="avis" className="py-24 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <SectionLabel>Témoignages</SectionLabel>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
                Ce que disent nos clients
              </h2>
              {/* Agrégat de notes */}
              <div className="inline-flex items-center gap-3 bg-white border border-amber-100 rounded-2xl px-5 py-3 shadow-sm">
                <StarsFull count={5} />
                <span className="text-2xl font-extrabold text-gray-900">4.9</span>
                <span className="text-sm text-gray-400">sur 5 — note moyenne</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {topAvis.map((avis, i) => {
                const initials =
                  avis.nom_client
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) ?? "?";
                const artisanNom =
                  [avis.artisan_prenom, avis.artisan_nom]
                    .filter(Boolean)
                    .join(" ") || "Un artisan";

                return (
                  <div
                    key={avis.id}
                    className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4"
                  >
                    {/* Stars */}
                    <StarsFull count={avis.note} />

                    {/* Commentaire */}
                    <blockquote className="text-sm text-gray-700 leading-relaxed flex-1">
                      &ldquo;{avis.commentaire}&rdquo;
                    </blockquote>

                    {/* Auteur + artisan */}
                    <div className="flex items-center gap-3 pt-3 border-t border-gray-50">
                      {/* Avatar client */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {avis.nom_client ?? "Client vérifié"}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          Prestation avec{" "}
                          <span className="text-brand-600 font-medium">{artisanNom}</span>
                          {avis.artisan_metier && (
                            <> · {avis.artisan_metier}</>
                          )}
                        </p>
                      </div>
                      {/* Badge vérifié */}
                      <div className="ml-auto flex-shrink-0">
                        <svg className="w-5 h-5 text-brand-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Lien vers la carte pour voir les artisans */}
            <div className="text-center mt-10">
              <Link
                href="/map"
                className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-brand-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                Voir les artisans près de chez vous
              </Link>
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
                  Rejoignez des milliers de clients satisfaits. La première réservation prend moins de 2 minutes.
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

            {/* Villes couvertes — SEO local */}
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

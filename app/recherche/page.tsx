import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { METIER_LIST, getMetierConfig } from "@/components/map/metier-config";
import SearchFilters from "@/components/recherche/SearchFilters";
import SearchMapView from "@/components/recherche/SearchMapView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rechercher un artisan | Manobra",
  description: "Trouvez le meilleur artisan près de chez vous.",
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PER_PAGE = 12;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns schema weekday numbers (0=lundi … 6=dimanche) from today through Sunday. */
function getRemainingWeekdays(): number[] {
  const jsDay = new Date().getDay(); // 0=Sunday, 1=Monday…
  const schemaDay = (jsDay + 6) % 7; // 0=lundi, 1=mardi … 6=dimanche
  return Array.from({ length: 7 - schemaDay }, (_, i) => schemaDay + i);
}

const fmtEuro = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchParams {
  metier?: string;
  ville?: string;
  lat?: string;
  lng?: string;
  rayon?: string;
  adresse?: string;
  prix_max?: string;
  note_min?: string;
  dispo?: string;
  page?: string;
  vue?: string;
  tri?: string;
  ordre?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

type Rawartisan = {
  id: string;
  nom: string | null;
  prenom: string | null;
  metier: string | string[] | null;
  ville: string | null;
  code_postal: string | null;
  photo_url: string | null;
  note_moyenne: number;
  nombre_avis: number;
  abonnement_pro: boolean;
  latitude: number | null;
  longitude: number | null;
  services?: { prix: number | null }[];
  siret?: string | null;
  bio?: string | null;
  disponible_urgence?: boolean;
};

type Enrichedartisan = Rawartisan & {
  prixMin: number | null;
  relevance: number;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRow({ note }: { note: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`w-3.5 h-3.5 flex-shrink-0 ${
            s <= Math.round(note) ? "text-yellow-400" : "text-gray-200"
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-24">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Aucun artisan trouvé
      </h3>
      <p className="text-sm text-gray-500 max-w-xs mx-auto">
        Essayez de modifier vos filtres ou d&apos;élargir la zone de recherche.
      </p>
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  params,
}: {
  currentPage: number;
  totalPages: number;
  params: SearchParams;
}) {
  const buildUrl = (p: number) => {
    const qs = new URLSearchParams();
    if (params.metier) qs.set("metier", params.metier);
    if (params.ville) qs.set("ville", params.ville);
    if (params.prix_max) qs.set("prix_max", params.prix_max);
    if (params.note_min) qs.set("note_min", params.note_min);
    if (params.dispo) qs.set("dispo", params.dispo);
    if (params.vue) qs.set("vue", params.vue);
    qs.set("page", String(p));
    return `/recherche?${qs.toString()}`;
  };

  // Build visible page numbers with ellipsis
  const all = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visible = all.filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2
  );

  return (
    <div className="flex items-center justify-center gap-1.5 mt-12">
      {currentPage > 1 && (
        <Link
          href={buildUrl(currentPage - 1)}
          className="px-3 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors"
        >
          ←
        </Link>
      )}

      {visible.map((p, i) => (
        <div key={p} className="flex items-center gap-1.5">
          {i > 0 && visible[i - 1] !== p - 1 && (
            <span className="text-gray-400 text-sm px-1">…</span>
          )}
          <Link
            href={buildUrl(p)}
            className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-medium transition-colors ${
              p === currentPage
                ? "bg-brand-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            {p}
          </Link>
        </div>
      ))}

      {currentPage < totalPages && (
        <Link
          href={buildUrl(currentPage + 1)}
          className="px-3 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors"
        >
          →
        </Link>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────


function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
export default async function RecherchePage({ searchParams }: PageProps) {
  const params = await searchParams;

  // ── Parse URL params ───────────────────────────────────────────────────────
  const metierFilter =
    params.metier && (METIER_LIST as string[]).includes(params.metier)
      ? params.metier
      : null;
  const villeFilter = params.ville?.trim() || null;
  const clientLat = params.lat ? parseFloat(params.lat) : null;
  const clientLng = params.lng ? parseFloat(params.lng) : null;
  const rayonKm = params.rayon ? parseFloat(params.rayon) : null;
  const prixMax = params.prix_max ? parseInt(params.prix_max) : null;
  const noteMin = params.note_min ? parseFloat(params.note_min) : null;
  const dispoFilter = params.dispo === "true";
  const page = Math.max(1, parseInt(params.page ?? "1") || 1);
  const vue = params.vue === "carte" ? "carte" : "grille";
  const tri = ["note", "distance", "prix"].includes(params.tri ?? "") ? params.tri! : "note";
  const ordre = params.ordre === "asc" ? "asc" : "desc";

  const admin = createAdminClient();

  // ── 1. Disponibilité filter: artisan IDs available this week ───────────
  let dispoIds: Set<string> | null = null;
  if (dispoFilter) {
    const remainingDays = getRemainingWeekdays();
    const { data: dispoRows } = await admin
      .from("disponibilites")
      .select("artisan_id")
      .eq("actif", true)
      .in("jour_semaine", remainingDays);

    dispoIds = new Set((dispoRows ?? []).map((d) => d.artisan_id));
  }

  // ── 2. Main query via fetch direct ────────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const queryParams = new URLSearchParams({
    select: "id,nom,prenom,metier,ville,code_postal,photo_url,note_moyenne,nombre_avis,abonnement_pro,latitude,longitude",
    actif: "eq.true",
    order: "note_moyenne.desc",
  });
  if (metierFilter) queryParams.append("metier", `cs.{${metierFilter}}`);
  // Filtre ville remplace par distance cote JS
  if (noteMin !== null && noteMin > 0) queryParams.append("note_moyenne", `gte.${noteMin}`);
  const apiRes = await fetch(`${supabaseUrl}/rest/v1/profiles_artisans?${queryParams.toString()}`, {
    headers: {
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  const rawData = apiRes.ok ? await apiRes.json() : [];

  // ── 3. City autocomplete list ──────────────────────────────────────────────
  const { data: citiesData } = await admin
    .from("profiles_artisans")
    .select("ville")
    .eq("actif", true)
    .not("ville", "is", null);

  const allCities = Array.from(
    new Set(
      (citiesData ?? []).map((d: { ville: string | null }) => d.ville).filter(Boolean)
    )
  ) as string[];

  // ── 4. Enrich, filter, sort, paginate ────────────────────────────────────
  const data = (Array.isArray(rawData) ? rawData : Object.values(rawData ?? {})) as unknown as Rawartisan[];

  const enriched: Enrichedartisan[] = data.map((p) => {
    const prices = (p.services ?? [])
      .map((s) => s.prix)
      .filter((x): x is number => x !== null);
    const prixMin = prices.length > 0 ? Math.min(...prices) : null;
    // Relevance: weight note by log of review count to penalize artisans with few reviews
    const relevance = p.note_moyenne * Math.log1p(p.nombre_avis);
    return { ...p, prixMin, relevance };
  });

  const filtered = enriched.filter((p) => {
    // Prix max filter (only when artisan has a known price)
    if (prixMax !== null && p.prixMin !== null && p.prixMin > prixMax)
      return false;
    // Disponibilité filter
    if (dispoIds !== null && !dispoIds.has(p.id)) return false;
    if (clientLat !== null && clientLng !== null && rayonKm !== null) {
      if (p.latitude === null || p.longitude === null) return false;
      const dist = haversine(clientLat, clientLng, p.latitude, p.longitude);
      if (dist > rayonKm) return false;
    }
    return true;
  });

  // Sort selon le critere choisi
  filtered.sort((a, b) => {
    let diff = 0;
    if (tri === "note") diff = (b.note_moyenne ?? 0) - (a.note_moyenne ?? 0);
    else if (tri === "prix") diff = (a.prixMin ?? 9999) - (b.prixMin ?? 9999);
    else if (tri === "distance" && clientLat !== null && clientLng !== null) {
      const da = (a.latitude !== null && a.longitude !== null) ? haversine(clientLat, clientLng, a.latitude, a.longitude) : 9999;
      const db = (b.latitude !== null && b.longitude !== null) ? haversine(clientLat, clientLng, b.latitude, b.longitude) : 9999;
      diff = da - db;
    } else {
      diff = (b.note_moyenne ?? 0) - (a.note_moyenne ?? 0);
    }
    return ordre === "asc" ? diff : -diff;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE
  );

  // Map view: only artisans with coordinates
  const mapartisans = filtered
    .filter((p) => p.latitude !== null && p.longitude !== null)
    .map((p) => ({
      id: p.id,
      nom: p.nom,
      prenom: p.prenom,
      metier: p.metier,
      ville: p.ville,
      photo_url: p.photo_url,
      note_moyenne: p.note_moyenne,
      nombre_avis: p.nombre_avis,
      latitude: p.latitude!,
      longitude: p.longitude!,
      prixMin: p.prixMin ?? null,
      disponible_urgence: p.disponible_urgence ?? false,
      siret: (p as any).siret ?? null,
      bio: (p as any).bio ?? null,
    }));

  // ── Render ─────────────────────────────────────────────────────────────────
  // JSON-LD : SearchResultsPage
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SearchResultsPage",
    name: "Recherche de artisans | Manobra",
    description: "Résultats de recherche de artisans à domicile",
    url: process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/recherche`
      : "https://Manobra.fr/recherche",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-gray-50">

      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100 h-14">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <Link href="/" className="text-brand-600 font-bold text-lg">
            Manobra
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/map"
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors hidden sm:block"
            >
              Vue carte globale
            </Link>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-gray-700 hover:text-brand-600 transition-colors"
            >
              Mon espace
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Trouver un artisan
          </h1>
          <p className="text-sm text-gray-500">
            Des professionnels vérifiés près de chez vous
          </p>
        </div>

        {/* ── Filters ──────────────────────────────────────────────────────── */}
        <SearchFilters
          initialMetier={params.metier}
          initialVille={params.ville}
          initialTri={tri}
          initialOrdre={ordre}
          initialAdresse={params.adresse}
          initialPrixMax={params.prix_max}
          initialNoteMin={params.note_min}
          initialDispo={params.dispo}
          initialVue={vue}
          allCities={allCities}
          totalResults={total}
        />

        {/* ── Results count ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mt-6 mb-4">
          <p className="text-sm text-gray-500">
            {total === 0 ? (
              "Aucun résultat"
            ) : (
              <>
                <span className="font-semibold text-gray-700">{total}</span>
                {" artisan"}
                {total > 1 ? "s" : ""} trouvé{total > 1 ? "s" : ""}
                {(metierFilter || villeFilter) && (
                  <span className="text-gray-400">
                    {metierFilter && ` · ${metierFilter}`}
                    {villeFilter && ` · ${villeFilter}`}
                  </span>
                )}
              </>
            )}
          </p>
          {totalPages > 1 && vue === "grille" && (
            <p className="text-sm text-gray-400">
              Page {currentPage}/{totalPages}
            </p>
          )}
        </div>

        {/* ── Map view ─────────────────────────────────────────────────────── */}
        {vue === "carte" ? (
          <div className="h-[calc(100vh-260px)] min-h-[400px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <SearchMapView artisans={mapartisans} />
          </div>
        ) : (
          <>
            {/* ── Grid view ──────────────────────────────────────────────── */}
            {paginated.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginated.map((p, cardIndex) => {
                  const metierVal = Array.isArray(p.metier) ? p.metier[0] : p.metier;
                  const config = getMetierConfig(metierVal);
                  return (
                    <Link
                      key={p.id}
                      href={`/prestataires/${p.id}`}
                      className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                    >
                      {/* Photo */}
                      <div className="relative h-40 bg-gray-100 overflow-hidden">
                        {p.photo_url ? (
                          <Image
                            src={p.photo_url}
                            alt={`${p.prenom ?? ""} ${p.nom ?? ""}`}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center text-5xl"
                            style={{ backgroundColor: config.color + "20" }}
                          >
                          </div>
                        )}

                        {/* PRO badge */}
                        {p.abonnement_pro && (
                          <span className="absolute top-2 right-2 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                            PRO ✦
                          </span>
                        )}

                        {/* Note overlay */}
                        {p.note_moyenne > 0 && (
                          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5">
                            <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="text-white text-xs font-semibold">
                              {p.note_moyenne.toFixed(1)}
                            </span>
                            {p.nombre_avis > 0 && (
                              <span className="text-white/70 text-[10px]">
                                ({p.nombre_avis})
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card body */}
                      <div className="p-4">
                        <p className="font-bold text-gray-900 text-sm leading-tight truncate mb-0.5">
                          {p.prenom} {p.nom}
                        </p>

                        <p
                          className="text-xs font-medium flex items-center gap-1 mb-2"
                          style={{ color: config.color }}
                        >
                          <span>{Array.isArray(p.metier)
    ? (() => {
        const metiers = p.metier as string[];
        const filtered = metierFilter && metiers.includes(metierFilter)
          ? [metierFilter, ...metiers.filter(m => m !== metierFilter)]
          : metiers;
        return filtered.slice(0, 2).join(" · ") + (metiers.length > 2 ? ` +${metiers.length - 2}` : "");
      })()
    : (p.metier ?? "Non spécifié")}</span>
                        </p>

                        {/* Stars (only if no note to show in overlay, or always show) */}
                        {p.note_moyenne === 0 ? (
                          <div className="flex items-center gap-1 mb-2">
                            <StarRow note={0} />
                            <span className="text-xs text-gray-400 ml-0.5">Nouveau</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 mb-2">
                            <StarRow note={p.note_moyenne} />
                            <span className="text-xs text-gray-500 ml-0.5">
                              {p.note_moyenne.toFixed(1)}
                              {p.nombre_avis > 0 && ` (${p.nombre_avis} avis)`}
                            </span>
                          </div>
                        )}

                        {/* Location + price */}
                        <div className="flex items-center justify-between gap-2 text-xs text-gray-400 mt-auto">
                          {p.ville ? (
                            <span className="flex items-center gap-1 truncate">
                              <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <span className="truncate">{p.ville}</span>
                            </span>
                          ) : (
                            <span />
                          )}
                          {p.prixMin !== null && (
                            <span className="font-semibold text-gray-600 flex-shrink-0">
                              dès {fmtEuro(p.prixMin)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="px-4 pb-4">
                        <Link
                          href={`/reserver/${p.id}`}
                          className="block w-full text-center text-xs font-semibold text-brand-600 border border-brand-200 rounded-lg py-2 hover:bg-brand-50 transition-colors"
                        >
                          Demander une intervention
                        </Link>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* ── Pagination ─────────────────────────────────────────────── */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                params={params}
              />
            )}
          </>
        )}
      </div>
    </div>
    </>
  );
}
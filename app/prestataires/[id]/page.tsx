import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getMetierConfig } from "@/components/map/metier-config";
import type { Tables } from "@/types";
import MiniMap from "@/components/map/MiniMap";

// Revalider le profil toutes les 10 minutes (ISR)
export const revalidate = 600;

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

type artisan = Tables<"profiles_artisans">;
type Service = Tables<"services">;
type Avis = Tables<"avis">;

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatDuree(minutes: number | null): string | null {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${m}`;
}

function formatPrix(prix: number | null): string {
  if (prix === null) return "Sur devis";
  if (prix === 0) return "Gratuit";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(prix);
}

function formatDateCourte(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

function formatDateMoisAnnee(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

// ─── generateMetadata ─────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles_artisans")
    .select("nom, prenom, metier, ville, bio, photo_url, note_moyenne, nombre_avis")
    .eq("id", id)
    .single();

  const p = data as Pick<
    artisan,
    "nom" | "prenom" | "metier" | "ville" | "bio" | "photo_url" | "note_moyenne" | "nombre_avis"
  > | null;

  if (!p) {
    return { title: "artisan introuvable | Manobra" };
  }

  const fullName = `${p.prenom ?? ""} ${p.nom ?? ""}`.trim() || "artisan";
  const title = `${fullName} — ${p.metier ?? "artisan"} à ${p.ville ?? "France"} | Manobra`;
  const description = p.bio
    ? p.bio.slice(0, 155) + (p.bio.length > 155 ? "…" : "")
    : `Profil de ${fullName}, ${p.metier ?? "artisan"} à ${p.ville ?? "France"}. Note ${p.note_moyenne?.toFixed(1) ?? "—"}/5 (${p.nombre_avis ?? 0} avis). Réservez en ligne sur Manobra.`;

  return {
    title,
    description,
    openGraph: {
      type: "profile",
      title,
      description,
      images: p.photo_url ? [{ url: p.photo_url, alt: fullName }] : [],
      locale: "fr_FR",
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: p.photo_url ? [p.photo_url] : [],
    },
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Étoiles (demi-étoile supportée) */
function StarRow({
  note,
  size = "sm",
}: {
  note: number | null;
  size?: "sm" | "lg";
}) {
  const rating = note ?? 0;
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  const wh = size === "lg" ? "w-6 h-6" : "w-4 h-4";

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`${wh} flex-shrink-0 ${
            star <= full
              ? "text-yellow-400"
              : star === full + 1 && hasHalf
              ? "text-yellow-300"
              : "text-gray-200"
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

/** Carte d'un service */
function ServiceCard({ service }: { service: Service }) {
  const duree = formatDuree(service.duree_minutes);
  return (
    <div className="group relative bg-white border border-gray-100 rounded-xl p-5 hover:shadow-md hover:border-brand-200 transition-all">
      {/* Catégorie */}
      {service.categorie && (
        <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full mb-2">
          {service.categorie}
        </span>
      )}

      {/* Titre */}
      <h3 className="font-semibold text-gray-900 text-sm mb-1 leading-tight">
        {service.titre}
      </h3>

      {/* Description */}
      {service.description && (
        <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">
          {service.description}
        </p>
      )}

      {/* Prix + Durée */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
        <span className="text-lg font-bold text-gray-900">
          {formatPrix(service.prix)}
        </span>
        {duree && (
          <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {duree}
          </span>
        )}
      </div>
    </div>
  );
}

/** Carte d'un avis */
function AvisCard({ avis }: { avis: Avis }) {
  const displayName = avis.nom_client ?? "Client Manobra";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex gap-4 py-5 first:pt-0 border-b border-gray-50 last:border-b-0">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
        {initials}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {displayName}
            </p>
            <time className="text-xs text-gray-400">
              {formatDateCourte(avis.created_at)}
            </time>
          </div>
          <div className="flex-shrink-0">
            <StarRow note={avis.note} size="sm" />
          </div>
        </div>

        {avis.commentaire && (
          <p className="text-sm text-gray-600 leading-relaxed mt-2">
            &ldquo;{avis.commentaire}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}

/** Résumé de notation avec barres de progression */
function RatingSummary({
  note,
  count,
  avis,
}: {
  note: number;
  count: number;
  avis: Avis[];
}) {
  // Compter les avis par note (1-5)
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: avis.filter((a) => a.note === star).length,
  }));

  return (
    <div className="flex items-start gap-6 mb-6 pb-6 border-b border-gray-100">
      {/* Score global */}
      <div className="flex flex-col items-center text-center flex-shrink-0">
        <span className="text-5xl font-black text-gray-900 leading-none">
          {note > 0 ? note.toFixed(1) : "—"}
        </span>
        <StarRow note={note} size="sm" />
        <span className="text-xs text-gray-400 mt-1">
          {count} avis{count > 1 ? "" : ""}
        </span>
      </div>

      {/* Barres par étoile */}
      {count > 0 && (
        <div className="flex-1 space-y-1">
          {distribution.map(({ star, count: c }) => (
            <div key={star} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-4 text-right">{star}</span>
              <svg
                className="w-3 h-3 text-yellow-400 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-yellow-400 rounded-full transition-all"
                  style={{ width: count > 0 ? `${(c / count) * 100}%` : "0%" }}
                />
              </div>
              <span className="text-xs text-gray-400 w-4">{c}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Bouton Réserver principal */
function ReserveButton({
  artisan_id,
  className = "",
}: {
  artisan_id: string;
  className?: string;
}) {
  return (
    <Link
      href={`/reserver/${artisan_id}`}
      className={`flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-bold text-base py-3.5 px-6 rounded-xl transition-all shadow-brand shadow-lg hover:shadow-xl hover:-translate-y-0.5 ${className}`}
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      Demander une intervention
    </Link>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default async function artisanPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Parallel fetch : profil + services + avis
  const [profileRes, servicesRes, avisRes] = await Promise.all([
    supabase
      .from("profiles_artisans")
      .select("*")
      .eq("id", id)
      .single(),

    supabase
      .from("services")
      .select("*")
      .eq("artisan_id", id)
      .eq("actif", true)
      .order("prix", { ascending: true }),

    supabase
      .from("avis")
      .select("*")
      .eq("artisan_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const artisan = profileRes.data as artisan | null;
  if (profileRes.error || !artisan) notFound();

  const services = (servicesRes.data ?? []) as Service[];
  const avis = (avisRes.data ?? []) as Avis[];

  // Dérivations
  const config = getMetierConfig(Array.isArray(artisan.metier) ? artisan.metier[0] : artisan.metier);
  const fullName =
    `${artisan.prenom ?? ""} ${artisan.nom ?? ""}`.trim() ||
    "artisan";
  const location = [artisan.ville, artisan.code_postal]
    .filter(Boolean)
    .join(" ");
  const minPrix = services
    .filter((s) => s.prix !== null)
    .sort((a, b) => (a.prix ?? 0) - (b.prix ?? 0))[0]?.prix ?? null;
  const hasMap =
    artisan.latitude !== null && artisan.longitude !== null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Barre de navigation ──────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-200 h-14">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
          <Link
            href="/map"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors group"
          >
            <svg
              className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Retour à la carte
          </Link>

          <Link
            href="/"
            className="text-brand-600 font-bold text-lg hover:text-brand-700 transition-colors"
          >
            🏠 Manobra
          </Link>

          {/* CTA mobile sticky */}
          <Link
            href={`/reserver/${id}`}
            className="sm:hidden inline-flex items-center gap-1 bg-brand-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-brand-700 transition-colors"
          >
            Réserver
          </Link>
          <div className="hidden sm:block w-[120px]" />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8 lg:items-start">
          {/* ════════════════════════════════════════════════════════════════
              COLONNE PRINCIPALE (2/3)
          ════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-2 space-y-5">

            {/* ── Hero : Profil ──────────────────────────────────────────── */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* Bandeau coloré */}
              <div
                className="h-20 w-full"
                style={{
                  background: `linear-gradient(135deg, ${config.color}25 0%, ${config.color}55 100%)`,
                }}
              />

              <div className="px-6 pb-6 -mt-10">
                <div className="flex items-end justify-between gap-4">
                  {/* Photo */}
                  {artisan.photo_url ? (
                    <Image
                      src={artisan.photo_url}
                      alt={fullName}
                      fill
                      sizes="(max-width: 768px) 100vw, 400px"
                      className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-lg flex-shrink-0"
                    />) : (
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-black border-4 border-white shadow-lg flex-shrink-0"
                      style={{ backgroundColor: config.color }}
                    >
                      {(artisan.prenom?.[0] ?? "?").toUpperCase()}
                    </div>
                  )}

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-1">
                    {(artisan as { plan_actif?: string }).plan_actif === "pro" && (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-2.5 py-1 rounded-full">
                        <svg
                          className="w-3.5 h-3.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Vérifié Pro
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                        artisan.actif
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          artisan.actif ? "bg-green-500" : "bg-gray-400"
                        }`}
                      />
                      {artisan.actif ? "Disponible" : "Indisponible"}
                    </span>
                  </div>
                </div>

                {/* Nom + Métier */}
                <div className="mt-3">
                  <h1 className="text-2xl font-black text-gray-900 leading-tight">
                    {fullName}
                  </h1>
                  <div
                    className="inline-flex items-center gap-1.5 mt-1.5 text-sm font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: `${config.color}18`,
                      color: config.color,
                    }}
                  >
                    <span>{artisan.metier ?? "artisan"}</span>
                  </div>
                </div>

                {/* Note + localisation */}
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  {artisan.nombre_avis > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <StarRow note={artisan.note_moyenne} size="sm" />
                      <span className="font-semibold text-gray-900">
                        {artisan.note_moyenne.toFixed(1)}
                      </span>
                      <span className="text-gray-400">
                        ({artisan.nombre_avis} avis)
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400 italic text-xs">
                      Aucun avis pour le moment
                    </span>
                  )}

                  {location && (
                    <div className="flex items-center gap-1 text-gray-500">
                      <svg
                        className="w-4 h-4 text-gray-400 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {location}
                    </div>
                  )}

                  <div className="flex items-center gap-1 text-gray-400 text-xs">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Membre depuis {formatDateMoisAnnee(artisan.created_at)}
                  </div>
                </div>

                {/* Bouton Réserver visible sur mobile */}
                <div className="mt-5 lg:hidden">
                  <ReserveButton artisan_id={id} className="w-full" />
                  <p className="text-center text-xs text-gray-400 mt-2">
                    Gratuit, sans engagement
                  </p>
                </div>
              </div>
            </section>

            {/* ── Biographie ────────────────────────────────────────────── */}
            {artisan.bio && (
              <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-xl">💬</span> À propos
                </h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
                  {artisan.bio}
                </p>
              </section>
            )}

            {/* ── Services ──────────────────────────────────────────────── */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">🛠️</span>
                Services proposés
                {services.length > 0 && (
                  <span className="ml-auto text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                    {services.length}
                  </span>
                )}
              </h2>

              {services.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-4xl mb-2">📋</div>
                  <p className="text-sm text-gray-500">
                    Aucun service renseigné pour le moment.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {services.map((s) => (
                    <ServiceCard key={s.id} service={s} />
                  ))}
                </div>
              )}
            </section>

            {/* ── Avis clients ──────────────────────────────────────────── */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">⭐</span>
                Avis clients
                {artisan.nombre_avis > 0 && (
                  <span className="ml-auto text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                    {artisan.nombre_avis}
                  </span>
                )}
              </h2>

              {artisan.nombre_avis > 0 && (
                <RatingSummary
                  note={artisan.note_moyenne}
                  count={artisan.nombre_avis}
                  avis={avis}
                />
              )}

              {avis.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-4xl mb-2">💭</div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">
                    Aucun avis pour le moment
                  </p>
                  <p className="text-xs text-gray-400">
                    Réservez et soyez le premier à laisser un avis&nbsp;!
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {avis.map((a) => (
                    <AvisCard key={a.id} avis={a} />
                  ))}
                </div>
              )}

              {artisan.nombre_avis > 20 && (
                <p className="text-center text-xs text-gray-400 mt-4">
                  Affichage des 20 avis les plus récents
                </p>
              )}
            </section>
          </div>

          {/* ════════════════════════════════════════════════════════════════
              SIDEBAR (1/3) — sticky sur desktop
          ════════════════════════════════════════════════════════════════ */}
          <aside className="mt-5 lg:mt-0 space-y-4 lg:sticky lg:top-[72px]">

            {/* ── CTA Réservation ───────────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              {/* Prix affiché */}
              {minPrix !== null && (
                <div className="text-center mb-4">
                  <p className="text-xs text-gray-400 mb-0.5">À partir de</p>
                  <p className="text-3xl font-black text-gray-900">
                    {formatPrix(minPrix)}
                    <span className="text-sm font-normal text-gray-400 ml-1">
                      / prestation
                    </span>
                  </p>
                </div>
              )}

              <ReserveButton artisan_id={id} className="w-full" />

              <p className="text-center text-xs text-gray-400 mt-2.5">
                🔒 Réservation gratuite, sans engagement
              </p>

              {/* Séparateur */}
              <div className="my-4 border-t border-gray-100" />

              {/* Note résumée */}
              {artisan.nombre_avis > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Note</span>
                  <div className="flex items-center gap-1.5">
                    <StarRow note={artisan.note_moyenne} size="sm" />
                    <span className="font-bold text-gray-900">
                      {artisan.note_moyenne.toFixed(1)}
                    </span>
                    <span className="text-gray-400 text-xs">
                      ({artisan.nombre_avis})
                    </span>
                  </div>
                </div>
              )}

              {/* Infos rapides */}
              <dl className="mt-3 space-y-2 text-sm">
                {artisan.metier && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Métier</dt>
                    <dd className="font-medium text-gray-800 flex items-center gap-1">
                      {artisan.metier}
                    </dd>
                  </div>
                )}
                {location && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Localisation</dt>
                    <dd className="font-medium text-gray-800">{location}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-500">Membre depuis</dt>
                  <dd className="font-medium text-gray-800">
                    {formatDateMoisAnnee(artisan.created_at)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Services</dt>
                  <dd className="font-medium text-gray-800">
                    {services.length} disponible{services.length !== 1 ? "s" : ""}
                  </dd>
                </div>
              </dl>
            </div>

            {/* ── Mini-carte ────────────────────────────────────────────── */}
            {hasMap && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="h-52">
                  <MiniMap
                    lat={artisan.latitude as number}
                    lng={artisan.longitude as number}
                    metier={Array.isArray(artisan.metier) ? artisan.metier[0] : artisan.metier}
                    label={fullName}
                  />
                </div>
                {location && (
                  <div className="px-4 py-3 border-t border-gray-50 flex items-center gap-2 text-xs text-gray-500">
                    <svg
                      className="w-3.5 h-3.5 text-gray-400 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{location}</span>
                    <Link
                      href={`/map`}
                      className="ml-auto text-brand-600 hover:underline font-medium"
                    >
                      Voir sur la carte →
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* ── Badge Pro détail ──────────────────────────────────────── */}
            {(artisan as { plan_actif?: string }).plan_actif === "pro" && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
                <div className="text-2xl flex-shrink-0">🏅</div>
                <div>
                  <p className="text-sm font-bold text-amber-800">
                    artisan vérifié Pro
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                    Son identité et ses qualifications ont été vérifiées par
                    l&apos;équipe Manobra.
                  </p>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* ── Bouton Réserver flottant (mobile uniquement) ──────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 p-4 safe-area-bottom">
        <ReserveButton artisan_id={id} className="w-full" />
      </div>
      {/* Espace pour le bouton flottant mobile */}
      <div className="lg:hidden h-24" />
    </div>
  );
}

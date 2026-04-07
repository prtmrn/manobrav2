import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import CancelButton from "@/components/dashboard/client/CancelButton";
import UnfavoriteButton from "@/components/dashboard/client/UnfavoriteButton";
import type { ReservationStatut } from "@/types";

export const metadata: Metadata = { title: "Tableau de bord" };
export const dynamic = "force-dynamic";

// ─── Types locaux ─────────────────────────────────────────────────────────────

interface ReservationItem {
  id: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  statut: ReservationStatut;
  adresse_intervention: string | null;
  montant_total: number | null;
  service_titre: string | null;
  artisan_id: string | null;
  artisan_nom: string | null;
  artisan_prenom: string | null;
  artisan_metier: string | null;
  artisan_photo_url: string | null;
  created_at: string;
}

interface Favoriartisan {
  artisan_id: string;
  nom: string | null;
  prenom: string | null;
  metier: string | null;
  photo_url: string | null;
  note_moyenne: number;
  nombre_avis: number;
  ville: string | null;
  actif: boolean;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUT_CONFIG: Record<
  ReservationStatut,
  { label: string; color: string; dot: string }
> = {
  en_attente: { label: "En attente",  color: "bg-amber-50 text-amber-700 border-amber-200",  dot: "bg-amber-400" },
  confirme:   { label: "Confirmé",    color: "bg-blue-50 text-blue-700 border-blue-200",     dot: "bg-blue-500" },
  en_cours:   { label: "En cours",    color: "bg-brand-50 text-brand-700 border-brand-200",  dot: "bg-brand-500 animate-pulse" },
  termine:    { label: "Terminé",     color: "bg-green-50 text-green-700 border-green-200",  dot: "bg-green-500" },
  annule:     { label: "Annulé",      color: "bg-gray-100 text-gray-500 border-gray-200",    dot: "bg-gray-400" },
};

function fmtDate(d: string) {
  return new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "short", day: "numeric", month: "short",
  });
}

function fmtDateShort(d: string) {
  const dt = new Date(`${d}T12:00:00`);
  return {
    weekday: dt.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", ""),
    day:     String(dt.getDate()),
    month:   dt.toLocaleDateString("fr-FR", { month: "short" }).replace(".", ""),
  };
}

function fmtTime(t: string) { return t.slice(0, 5); }

function fmtEuro(n: number | null) {
  if (!n) return null;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "EUR", minimumFractionDigits: 0,
  }).format(n);
}

// ─── Sous-composants (serveur) ────────────────────────────────────────────────

function SectionHeader({
  title, count, href, linkLabel,
}: {
  title: string; count?: number; href?: string; linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        {count !== undefined && count > 0 && (
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5
                           bg-brand-600 text-white text-[11px] font-bold rounded-full">
            {count}
          </span>
        )}
      </div>
      {href && linkLabel && (
        <Link href={href}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1">
          {linkLabel}
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}
    </div>
  );
}

function EmptyState({ icon, text, cta }: {
  icon: React.ReactNode; text: string; cta?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8
                    flex flex-col items-center gap-3 text-center">
      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
        {icon}
      </div>
      <p className="text-sm text-gray-400">{text}</p>
      {cta}
    </div>
  );
}

function StatusBadge({ statut }: { statut: ReservationStatut }) {
  const cfg = STATUT_CONFIG[statut];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                      text-xs font-semibold border flex-shrink-0 ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function PrestaAvatar({
  prenom, nom, photo, size = "md",
}: {
  prenom: string | null; nom: string | null; photo: string | null; size?: "sm" | "md";
}) {
  const initials =
    `${prenom?.[0] ?? ""}${nom?.[0] ?? ""}`.toUpperCase() || "?";
  const sz = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  return photo ? (
    <div className={`relative ${sz} rounded-full overflow-hidden flex-shrink-0`}>
      <Image src={photo} alt="" fill className="object-cover" unoptimized />
    </div>
  ) : (
    <div className={`${sz} rounded-full bg-brand-100 text-brand-700 font-bold
                     flex items-center justify-center flex-shrink-0`}>
      {initials}
    </div>
  );
}

function StarRow({ note }: { note: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`w-3 h-3 ${s <= Math.round(note) ? "text-yellow-400" : "text-gray-200"}`}
          fill="currentColor" viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardClientPage() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if ((profileData as { role: string } | null)?.role !== "client") redirect("/dashboard");

  const admin = createAdminClient();

  // ── Données parallèles ────────────────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0];

  const [clientRes, upcomingRes, historyRes, avisRes, favorisIdsRes] =
    await Promise.all([

      // 1. Profil client
      admin
        .from("profiles_clients")
        .select("nom, prenom")
        .eq("id", user.id)
        .maybeSingle(),

      // 2. Réservations à venir (en_attente, confirme, en_cours)
      admin
        .from("reservations_detail")
        .select(
          "id, date, heure_debut, heure_fin, statut, adresse_intervention, " +
          "montant_total, service_titre, created_at, " +
          "artisan_id, artisan_nom, artisan_prenom, " +
          "artisan_metier, artisan_photo_url"
        )
        .eq("client_id", user.id)
        .in("statut", ["en_attente", "confirme", "en_cours"])
        .gte("date", today)
        .order("date",        { ascending: true })
        .order("heure_debut", { ascending: true }),

      // 3. Historique (terminé + annulé, 10 dernières)
      admin
        .from("reservations_detail")
        .select(
          "id, date, heure_debut, heure_fin, statut, adresse_intervention, " +
          "montant_total, service_titre, created_at, " +
          "artisan_id, artisan_nom, artisan_prenom, " +
          "artisan_metier, artisan_photo_url"
        )
        .eq("client_id", user.id)
        .in("statut", ["termine", "annule"])
        .order("date", { ascending: false })
        .limit(10),

      // 4. reservation_id des avis déjà soumis par ce client
      admin
        .from("avis")
        .select("reservation_id")
        .eq("client_id", user.id)
        .not("reservation_id", "is", null),

      // 5. IDs artisans en favoris
      admin
        .from("favoris")
        .select("artisan_id, created_at")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

  const client    = clientRes.data as { nom: string | null; prenom: string | null } | null;
  const upcoming  = (upcomingRes.data  ?? []) as unknown as ReservationItem[];
  const history   = (historyRes.data   ?? []) as unknown as ReservationItem[];
  const avisRows  = (avisRes.data      ?? []) as { reservation_id: string | null }[];
  const favorisIds = (favorisIdsRes.data ?? []) as { artisan_id: string; created_at: string }[];

  // Set des reservation_id déjà notés
  const ratedSet = new Set(avisRows.map((a) => a.reservation_id).filter(Boolean));

  // Récupérer les profils des artisans favoris
  let favoris: Favoriartisan[] = [];
  if (favorisIds.length > 0) {
    const { data: prestas } = await admin
      .from("profiles_artisans")
      .select("id, nom, prenom, metier, photo_url, note_moyenne, nombre_avis, ville, actif")
      .in("id", favorisIds.map((f) => f.artisan_id));

    if (prestas) {
      favoris = favorisIds
        .map((f) => {
          const p = (prestas as Array<{
            id: string; nom: string | null; prenom: string | null;
            metier: string | null; photo_url: string | null;
            note_moyenne: number; nombre_avis: number;
            ville: string | null; actif: boolean;
          }>).find((pr) => pr.id === f.artisan_id);
          if (!p) return null;
          return {
            artisan_id: f.artisan_id,
            nom: p.nom, prenom: p.prenom, metier: p.metier,
            photo_url: p.photo_url, note_moyenne: p.note_moyenne,
            nombre_avis: p.nombre_avis, ville: p.ville, actif: p.actif,
            created_at: f.created_at,
          } satisfies Favoriartisan;
        })
        .filter((f): f is Favoriartisan => f !== null);
    }
  }

  // Stats rapides
  const displayName = client?.prenom ?? client?.nom ?? user.email?.split("@")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  const totalTermine = history.filter((r) => r.statut === "termine").length;
  const toRate = history.filter(
    (r) => r.statut === "termine" && !ratedSet.has(r.id)
  ).length;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDU
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-5 lg:p-8 max-w-4xl mx-auto space-y-8 pb-28">

      {/* ════════════════════════════════════════════════════════════════════
          EN-TÊTE + CTA/STATS adaptatifs
          ════════════════════════════════════════════════════════════════════ */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting}, {displayName}&nbsp;👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">Bienvenue sur votre espace client.</p>
      </div>

      {upcoming.length === 0 && totalTermine === 0 && favoris.length === 0 ? (
        <Link
          href="/recherche"
          id="cta-top"
          className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700
                     text-white font-bold text-base px-6 py-4 rounded-2xl shadow-md
                     transition-all duration-150 hover:-translate-y-0.5 w-full"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Trouver un artisan
        </Link>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex-1 grid grid-cols-4 gap-2">
            {[
              { label: "À venir", value: upcoming.length, color: "text-blue-600" },
              { label: "Terminées", value: totalTermine, color: "text-green-600" },
              { label: "À noter", value: toRate, color: "text-yellow-600" },
              { label: "Favoris", value: favoris.length, color: "text-red-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-2.5 text-center">
                <p className={`text-lg font-bold tabular-nums ${color}`}>{value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{label}</p>
              </div>
            ))}
          </div>
          <Link
            href="/recherche"
            id="cta-top"
            className="flex-shrink-0 flex flex-col items-center justify-center gap-1
                       bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs
                       px-3 py-2.5 rounded-xl shadow-sm transition-colors w-16 text-center"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Trouver
          </Link>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          RÉSERVATIONS À VENIR
          ════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader
          title="Réservations à venir"
          count={upcoming.length}
          href="/dashboard/client/reservations"
          linkLabel="Tout voir"
        />

        {upcoming.length === 0 ? (
          <EmptyState
            text="Aucune réservation à venir pour le moment."
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            cta={
              <Link href="/map"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                Trouver un artisan →
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {upcoming.map((r) => {
              const d = fmtDateShort(r.date);
              const isEnCours = r.statut === "en_cours";

              return (
                <article
                  key={r.id}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden
                              hover:shadow-md transition-shadow ${
                    isEnCours ? "border-brand-200 ring-1 ring-brand-100" : "border-gray-100"
                  }`}
                >
                  {/* Bandeau coloré */}
                  <div className={`h-1 ${
                    r.statut === "en_attente" ? "bg-gradient-to-r from-amber-300 to-orange-300"
                    : isEnCours              ? "bg-gradient-to-r from-brand-400 to-green-400"
                    :                          "bg-gradient-to-r from-blue-300 to-brand-300"
                  }`} />

                  <div className="p-4 sm:p-5">
                    <div className="flex gap-4">

                      {/* Date badge */}
                      <div className={`flex-shrink-0 flex flex-col items-center justify-center
                                       rounded-xl px-3 py-2 min-w-[60px] text-center ${
                        isEnCours ? "bg-brand-600" : "bg-gray-50 border border-gray-100"
                      }`}>
                        <span className={`text-[10px] font-semibold capitalize ${
                          isEnCours ? "text-brand-100" : "text-gray-400"
                        }`}>{d.weekday}</span>
                        <span className={`text-xl font-bold leading-none my-0.5 ${
                          isEnCours ? "text-white" : "text-gray-900"
                        }`}>{d.day}</span>
                        <span className={`text-[10px] font-semibold uppercase ${
                          isEnCours ? "text-brand-100" : "text-gray-400"
                        }`}>{d.month}</span>
                      </div>

                      {/* Contenu */}
                      <div className="flex-1 min-w-0">
                        {/* Ligne 1 : artisan + badge statut */}
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <PrestaAvatar
                              prenom={r.artisan_prenom}
                              nom={r.artisan_nom}
                              photo={r.artisan_photo_url}
                              size="sm"
                            />
                            <div>
                              <p className="text-sm font-semibold text-gray-900 leading-tight">
                                {`${r.artisan_prenom ?? ""} ${r.artisan_nom ?? ""}`.trim() || "artisan"}
                              </p>
                              {r.artisan_metier && (
                                <p className="text-xs text-gray-400">{r.artisan_metier}</p>
                              )}
                            </div>
                          </div>
                          <StatusBadge statut={r.statut} />
                        </div>

                        {/* Ligne 2 : détails */}
                        <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                          {r.service_titre && (
                            <span className="flex items-center gap-1 font-medium text-gray-700">
                              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {r.service_titre}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {fmtTime(r.heure_debut)} – {fmtTime(r.heure_fin)}
                          </span>
                          {r.adresse_intervention && (
                            <span className="flex items-center gap-1 max-w-[220px] truncate">
                              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                              {r.adresse_intervention}
                            </span>
                          )}
                          {r.montant_total && (
                            <span className="font-semibold text-gray-800">
                              {fmtEuro(r.montant_total)}
                            </span>
                          )}
                        </div>

                        {/* Ligne 3 : actions */}
                        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between gap-3">
                          {r.artisan_id && (
                            <Link
                              href={`/artisans/${r.artisan_id}`}
                              className="text-xs text-brand-600 hover:text-brand-700 font-medium hover:underline"
                            >
                              Voir le profil →
                            </Link>
                          )}
                          {r.statut === "en_attente" && (
                            <div className="ml-auto">
                              <CancelButton reservationId={r.id} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          HISTORIQUE
          ════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader
          title="Historique"
          href="/dashboard/client/reservations"
          linkLabel="Tout voir"
        />

        {history.length === 0 ? (
          <EmptyState
            text="Aucune prestation passée pour le moment."
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        ) : (
          <div className="space-y-2.5">
            {history.map((r) => {
              const canRate = r.statut === "termine" && !ratedSet.has(r.id);
              const alreadyRated = r.statut === "termine" && ratedSet.has(r.id);

              return (
                <article
                  key={r.id}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden
                               hover:shadow-md transition-shadow ${
                    canRate ? "border-yellow-200" : "border-gray-100"
                  }`}
                >
                  {canRate && (
                    <div className="h-0.5 bg-gradient-to-r from-yellow-300 to-amber-300" />
                  )}

                  <div className="p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                      <PrestaAvatar
                        prenom={r.artisan_prenom}
                        nom={r.artisan_nom}
                        photo={r.artisan_photo_url}
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {`${r.artisan_prenom ?? ""} ${r.artisan_nom ?? ""}`.trim() || "artisan"}
                            </p>
                            {r.service_titre && (
                              <p className="text-xs text-gray-500">{r.service_titre}</p>
                            )}
                          </div>
                          <StatusBadge statut={r.statut} />
                        </div>

                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
                          <span>{fmtDate(r.date)}</span>
                          <span>{fmtTime(r.heure_debut)} – {fmtTime(r.heure_fin)}</span>
                          {r.montant_total && (
                            <span className="font-medium text-gray-600">
                              {fmtEuro(r.montant_total)}
                            </span>
                          )}
                        </div>

                        {/* Bouton avis ou état */}
                        {(canRate || alreadyRated || r.artisan_id) && (
                          <div className="mt-2.5 flex items-center gap-3 flex-wrap">
                            {r.artisan_id && (
                              <Link
                                href={`/artisans/${r.artisan_id}`}
                                className="text-xs text-brand-600 hover:text-brand-700 font-medium hover:underline"
                              >
                                Voir le profil
                              </Link>
                            )}
                            {canRate && (
                              <Link
                                href={`/avis/${r.id}`}
                                className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                           bg-yellow-50 text-yellow-700 border border-yellow-200
                                           text-xs font-semibold hover:bg-yellow-100 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                Laisser un avis
                              </Link>
                            )}
                            {alreadyRated && (
                              <span className="ml-auto inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Avis soumis
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          artisanS FAVORIS
          ════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader
          title="artisans favoris"
          count={favoris.length}
        />

        {favoris.length === 0 ? (
          <EmptyState
            text="Vous n'avez pas encore de artisans favoris."
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            }
            cta={
              <Link href="/map"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                Explorer les artisans →
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {favoris.map((f) => {
              const nom = `${f.prenom ?? ""} ${f.nom ?? ""}`.trim() || "artisan";
              return (
                <div
                  key={f.artisan_id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm
                             hover:shadow-md transition-shadow p-4 flex items-center gap-4"
                >
                  {/* Avatar */}
                  <PrestaAvatar prenom={f.prenom} nom={f.nom} photo={f.photo_url} />

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{nom}</p>
                    {f.metier && (
                      <p className="text-xs text-gray-500 truncate">{f.metier}</p>
                    )}
                    {f.ville && (
                      <p className="text-xs text-gray-400 truncate">{f.ville}</p>
                    )}
                    {f.nombre_avis > 0 && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <StarRow note={f.note_moyenne} />
                        <span className="text-xs text-gray-500">
                          {f.note_moyenne.toFixed(1)}&nbsp;
                          <span className="text-gray-400">({f.nombre_avis})</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <UnfavoriteButton artisanId={f.artisan_id} artisanNom={nom} />
                    <Link
                      href={`/artisans/${f.artisan_id}`}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-700
                                 px-2.5 py-1 rounded-lg hover:bg-brand-50 transition-colors"
                    >
                      Réserver
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>


    </div>
  );
}

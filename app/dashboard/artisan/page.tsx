import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ReservationStatusButtons from "@/components/dashboard/artisan/ReservationStatusButtons";
import OnboardingProgressBar from "@/components/dashboard/artisan/OnboardingProgressBar";
import type { OnboardingStatus } from "@/components/dashboard/artisan/OnboardingProgressBar";

export const metadata: Metadata = { title: "Tableau de bord" };
export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

type PlanActif = "aucun" | "essentiel" | "pro";

interface PrestaProfile {
  nom: string | null;
  prenom: string | null;
  photo_url: string | null;
  metier: string | null;
  ville: string | null;
  actif: boolean;
  note_moyenne: number;
  nombre_avis: number;
  plan_actif: PlanActif;
  subscription_status: string | null;
  subscription_end_date: string | null;
  stripe_onboarding_complete: boolean | null;
  bio: string | null;
}

interface ReservationDetail {
  id: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  statut: string;
  adresse_intervention: string | null;
  montant_total: number | null;
  montant_artisan: number | null;
  service_titre: string | null;
  client_nom: string | null;
  client_prenom: string | null;
  client_photo_url: string | null;
  created_at: string;
}

// ─── Helpers de formatage ─────────────────────────────────────────────────────

function fmtEuro(v: number | null) {
  if (v === null || v === 0) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "EUR", minimumFractionDigits: 0,
  }).format(v);
}

function fmtDate(d: string) {
  return new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function fmtDateShort(d: string) {
  const dt = new Date(`${d}T12:00:00`);
  return {
    weekday: dt.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", ""),
    day:     dt.getDate().toString(),
    month:   dt.toLocaleDateString("fr-FR", { month: "short" }).replace(".", ""),
  };
}

function fmtTime(t: string) { return t.slice(0, 5); }

function relTime(iso: string): string {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return "Reçue aujourd'hui";
  if (diff === 1) return "Reçue hier";
  return `Reçue il y a ${diff} jours`;
}

function isToday(d: string): boolean {
  return d === new Date().toISOString().split("T")[0];
}

function isTomorrow(d: string): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return d === tomorrow.toISOString().split("T")[0];
}

function dateBadgeLabel(d: string): string | null {
  if (isToday(d))    return "Aujourd'hui";
  if (isTomorrow(d)) return "Demain";
  return null;
}

// ─── Sous-composants (serveur) ────────────────────────────────────────────────

function SectionHeader({ title, count, href, linkLabel }: {
  title: string;
  count?: number;
  href?: string;
  linkLabel?: string;
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
              className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors">
          {linkLabel}
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}
    </div>
  );
}

function EmptyCard({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8
                    flex flex-col items-center gap-3 text-center">
      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
        {icon}
      </div>
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  );
}

function ClientAvatar({ prenom, nom, photo }: {
  prenom: string | null; nom: string | null; photo: string | null;
}) {
  const initials = `${prenom?.[0] ?? ""}${nom?.[0] ?? ""}`.toUpperCase() || "?";
  return photo ? (
    <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
      <Image src={photo} alt="" fill className="object-cover" unoptimized />
    </div>
  ) : (
    <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center
                    justify-center text-xs font-bold flex-shrink-0">
      {initials}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default async function DashboardartisanPage() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createAdminClient();

  // ── Calculs de dates ──────────────────────────────────────────────────────
  const now          = new Date();
  const today        = now.toISOString().split("T")[0];
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString().split("T")[0];
  const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString().split("T")[0];
  const hour = now.getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  // ── Requêtes parallèles ───────────────────────────────────────────────────
  const [profileRes, statsRes, prochainesRes, attenteRes, servicesRes, dispoRes] = await Promise.all([

    // 1. Profil + abonnement
    admin
      .from("profiles_artisans")
      .select("nom, prenom, photo_url, bio, metier, ville, actif, note_moyenne, nombre_avis, plan_actif, subscription_status, subscription_end_date, stripe_onboarding_complete")
      .eq("id", user.id)
      .single(),

    // 2. Stats du mois (statut, montant_artisan)
    admin
      .from("reservations")
      .select("statut, montant_artisan")
      .eq("artisan_id", user.id)
      .gte("date", startOfMonth)
      .lte("date", endOfMonth)
      .in("statut", ["confirme", "en_cours", "termine"]),

    // 3. Prochaines interventions (5 max) : confirme ou en_cours, à partir d'aujourd'hui
    admin
      .from("reservations_detail")
      .select("id, date, heure_debut, heure_fin, statut, adresse_intervention, montant_artisan, service_titre, client_nom, client_prenom, client_photo_url, created_at")
      .eq("artisan_id", user.id)
      .in("statut", ["confirme", "en_cours"])
      .gte("date", today)
      .order("date",        { ascending: true })
      .order("heure_debut", { ascending: true })
      .limit(5),

    // 4. Réservations en attente (toutes, ordre FIFO)
    admin
      .from("reservations_detail")
      .select("id, date, heure_debut, heure_fin, statut, adresse_intervention, montant_total, service_titre, client_nom, client_prenom, client_photo_url, created_at")
      .eq("artisan_id", user.id)
      .eq("statut", "en_attente")
      .order("created_at", { ascending: true }),

    // 5. Onboarding : services actifs
    admin
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("artisan_id", user.id)
      .eq("actif", true),

    // 6. Onboarding : disponibilites actives
    admin
      .from("disponibilites")
      .select("id", { count: "exact", head: true })
      .eq("artisan_id", user.id)
      .eq("actif", true),
  ]);

  // ── Données profil ────────────────────────────────────────────────────────
  const artisan = profileRes.data as PrestaProfile | null;
  if (!artisan?.nom) redirect("/onboarding/artisan");

  const fullName = `${artisan.prenom ?? ""} ${artisan.nom ?? ""}`.trim();

  // ── Calcul des stats ──────────────────────────────────────────────────────
  const statsRows = (statsRes.data ?? []) as {
    statut: string; montant_artisan: number | null;
  }[];

  const reservationsCeMois = statsRows.length;
  const revenusCeMois = statsRows
    .filter((r) => r.statut === "termine")
    .reduce((sum, r) => sum + (r.montant_artisan ?? 0), 0);

  // ── Listes ────────────────────────────────────────────────────────────────
  const prochaines = (prochainesRes.data ?? []) as ReservationDetail[];
  const attentes   = (attenteRes.data   ?? []) as ReservationDetail[];

  // -- Calcul de l'etat d'onboarding
  const profileComplete =
    !!(artisan.nom && artisan.prenom && artisan.metier && artisan.ville);

  const onboardingStatus: OnboardingStatus = {
    savedStep:        0,
    profileComplete,
    hasService:       (servicesRes.count ?? 0) > 0,
    hasDisponibilite: (dispoRes.count ?? 0) > 0,
    stripeConnected:  artisan.stripe_onboarding_complete === true,
    hasSubscription:  !!(artisan.plan_actif && artisan.plan_actif !== "aucun"),
  };

  const onboardingComplete =
    onboardingStatus.profileComplete &&
    onboardingStatus.hasService &&
    onboardingStatus.hasDisponibilite &&
    onboardingStatus.stripeConnected &&
    onboardingStatus.hasSubscription;

  // ── Abonnement ────────────────────────────────────────────────────────────
  const plan = (artisan.plan_actif ?? "aucun") as PlanActif;

  const planConfig: Record<PlanActif, { label: string; color: string; bg: string; dot: string }> = {
    aucun:     { label: "Aucun plan",     color: "text-gray-500",  bg: "bg-gray-50",   dot: "bg-gray-300" },
    essentiel: { label: "Plan Essentiel", color: "text-brand-700", bg: "bg-brand-50",  dot: "bg-brand-500" },
    pro:       { label: "Plan Pro",       color: "text-purple-700",bg: "bg-purple-50", dot: "bg-purple-500" },
  };

  const subStatusLabel: Record<string, string> = {
    active:   "Actif",
    trialing: "Période d'essai",
    past_due: "En retard de paiement",
    canceled: "Annulé",
    unpaid:   "Impayé",
    paused:   "En pause",
  };

  const renewalDate = artisan.subscription_end_date
    ? new Date(artisan.subscription_end_date).toLocaleDateString("fr-FR", {
        day: "numeric", month: "long", year: "numeric",
      })
    : null;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDU
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto space-y-8">

      {/* ════════════════════════════════════════════════════════════════════
          EN-TÊTE
          ════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">

        {/* Avatar */}
        <div className="relative w-16 h-16 rounded-2xl overflow-hidden ring-4
                        ring-white shadow-md flex-shrink-0 bg-gray-100">
          {artisan.photo_url ? (
            <Image src={artisan.photo_url} alt={fullName}
                   fill className="object-cover" unoptimized />
          ) : (
            <div className="w-full h-full bg-brand-600 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {fullName[0]?.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">
            {greeting}, {artisan.prenom ?? fullName}&nbsp;👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
            {artisan.metier && (
              <span className="font-medium text-brand-600">{artisan.metier}</span>
            )}
            {artisan.metier && artisan.ville && (
              <span className="text-gray-300">·</span>
            )}
            {artisan.ville && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {artisan.ville}
              </span>
            )}
          </p>
        </div>

        {/* Badge statut */}
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                          text-xs font-semibold flex-shrink-0 ${
          artisan.actif
            ? "bg-green-50 text-green-700 ring-1 ring-green-200"
            : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${artisan.actif ? "bg-green-500" : "bg-amber-400"}`} />
          {artisan.actif ? "Profil visible" : "En attente de validation"}
        </span>
      </div>

      {/* Barre d'onboarding */}
      {!onboardingComplete && (
        <OnboardingProgressBar status={onboardingStatus} />
      )}

      {/* Alerte profil inactif */}
      {!artisan.actif && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800">Profil en cours de validation</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Votre profil n&apos;est pas encore visible par les clients.
              Souscrivez à un abonnement pour l&apos;activer.
            </p>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          VUE D'ENSEMBLE
          ════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader title="Vue d'ensemble" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">

          {/* Réservations ce mois */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
              <svg className="w-4.5 h-4.5 text-brand-600 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{reservationsCeMois}</p>
            <p className="text-xs font-medium text-gray-500 mt-0.5">Réservations</p>
            <p className="text-[11px] text-gray-400 mt-0.5">ce mois-ci</p>
          </div>

          {/* Revenus du mois */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{fmtEuro(revenusCeMois)}</p>
            <p className="text-xs font-medium text-gray-500 mt-0.5">Revenus nets</p>
            <p className="text-[11px] text-gray-400 mt-0.5">après commission (90%)</p>
          </div>

          {/* Note moyenne */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
            <div className="w-9 h-9 rounded-xl bg-yellow-50 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">
              {artisan.note_moyenne > 0
                ? artisan.note_moyenne.toFixed(1)
                : "—"}
            </p>
            <p className="text-xs font-medium text-gray-500 mt-0.5">Note moyenne</p>
            <p className="text-[11px] text-gray-400 mt-0.5">sur 5 étoiles</p>
          </div>

          {/* Nombre d'avis */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">
              {artisan.nombre_avis}
            </p>
            <p className="text-xs font-medium text-gray-500 mt-0.5">Avis clients</p>
            <p className="text-[11px] text-gray-400 mt-0.5">au total</p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          RÉSERVATIONS EN ATTENTE
          ════════════════════════════════════════════════════════════════════ */}
      {attentes.length > 0 && (
        <section>
          <SectionHeader
            title="Réservations en attente"
            count={attentes.length}
            href="/dashboard/artisan/reservations"
            linkLabel="Tout voir"
          />

          <div className="space-y-3">
            {attentes.map((r) => (
              <div key={r.id}
                   className="bg-white rounded-2xl border border-amber-100 shadow-sm
                              hover:shadow-md transition-shadow duration-150 overflow-hidden">
                {/* Bandeau urgence */}
                <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-400" />

                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">

                    {/* Colonne date */}
                    <div className="flex-shrink-0 flex sm:flex-col items-center sm:items-center
                                    bg-amber-50 border border-amber-100 rounded-xl
                                    px-3 py-2 sm:px-4 sm:py-3 gap-3 sm:gap-0 min-w-[90px]">
                      {(() => {
                        const d = fmtDateShort(r.date);
                        return (
                          <>
                            <p className="text-[11px] font-medium text-amber-500 capitalize sm:text-center">{d.weekday}</p>
                            <p className="text-2xl font-bold text-amber-700 leading-none sm:my-0.5 sm:text-center">{d.day}</p>
                            <p className="text-[11px] font-medium text-amber-500 uppercase sm:text-center">{d.month}</p>
                          </>
                        );
                      })()}
                    </div>

                    {/* Contenu */}
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <ClientAvatar
                              prenom={r.client_prenom}
                              nom={r.client_nom}
                              photo={r.client_photo_url}
                            />
                            <span className="text-sm font-semibold text-gray-900">
                              {`${r.client_prenom ?? ""} ${r.client_nom ?? ""}`.trim() || "Client"}
                            </span>
                          </div>
                        </div>
                        <span className="text-[11px] text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full">
                          {relTime(r.created_at)}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-500">
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
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            {r.adresse_intervention}
                          </span>
                        )}
                        {r.montant_total !== null && (
                          <span className="font-semibold text-gray-900">{fmtEuro(r.montant_total)}</span>
                        )}
                      </div>

                      {/* Actions */}
                      <ReservationStatusButtons
                        reservationId={r.id}
                        options={[
                          { label: "✓ Accepter", statut: "confirme", variant: "success" },
                          {
                            label: "✗ Refuser",
                            statut: "annule",
                            variant: "danger",
                            confirm: "Refuser cette demande de réservation ?",
                          },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          PROCHAINES INTERVENTIONS
          ════════════════════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader
          title="Prochaines interventions"
          href="/dashboard/artisan/reservations"
          linkLabel="Tout voir"
        />

        {prochaines.length === 0 ? (
          <EmptyCard
            text="Aucune intervention confirmée à venir."
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />
        ) : (
          <div className="space-y-3">
            {prochaines.map((r) => {
              const badge  = dateBadgeLabel(r.date);
              const isNow  = r.statut === "en_cours";

              return (
                <div key={r.id}
                     className={`bg-white rounded-2xl border shadow-sm hover:shadow-md
                                 transition-shadow duration-150 overflow-hidden ${
                       isNow
                         ? "border-brand-200 ring-1 ring-brand-100"
                         : "border-gray-100"
                     }`}>
                  {/* Bandeau coloré */}
                  <div className={`h-1 ${isNow
                    ? "bg-gradient-to-r from-brand-400 to-green-400"
                    : "bg-gradient-to-r from-brand-100 to-brand-200"}`} />

                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">

                      {/* Date badge */}
                      <div className={`flex-shrink-0 flex sm:flex-col items-center sm:items-center
                                       rounded-xl px-3 py-2 sm:px-4 sm:py-3 gap-3 sm:gap-0 min-w-[90px]
                                       ${isNow
                                          ? "bg-brand-600 border border-brand-500"
                                          : "bg-brand-50 border border-brand-100"}`}>
                        {(() => {
                          const d = fmtDateShort(r.date);
                          const tc = isNow ? "text-white" : "text-brand-500";
                          const tb = isNow ? "text-white" : "text-brand-700";
                          return (
                            <>
                              <p className={`text-[11px] font-medium capitalize sm:text-center ${tc}`}>{d.weekday}</p>
                              <p className={`text-2xl font-bold leading-none sm:my-0.5 sm:text-center ${tb}`}>{d.day}</p>
                              <p className={`text-[11px] font-medium uppercase sm:text-center ${tc}`}>{d.month}</p>
                            </>
                          );
                        })()}
                      </div>

                      {/* Contenu */}
                      <div className="flex-1 min-w-0 space-y-2.5">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <ClientAvatar
                              prenom={r.client_prenom}
                              nom={r.client_nom}
                              photo={r.client_photo_url}
                            />
                            <span className="text-sm font-semibold text-gray-900">
                              {`${r.client_prenom ?? ""} ${r.client_nom ?? ""}`.trim() || "Client"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {isNow && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                                               bg-brand-600 text-white text-[11px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                En cours
                              </span>
                            )}
                            {badge && !isNow && (
                              <span className="text-[11px] font-semibold text-brand-700
                                               bg-brand-50 px-2 py-0.5 rounded-full border border-brand-100">
                                {badge}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-500">
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
                            <span className="flex items-center gap-1 max-w-xs truncate">
                              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              </svg>
                              {r.adresse_intervention}
                            </span>
                          )}
                          {r.montant_artisan !== null && (
                            <span className="font-semibold text-green-700">{fmtEuro(r.montant_artisan)}</span>
                          )}
                        </div>

                        {/* Actions */}
                        <ReservationStatusButtons
                          reservationId={r.id}
                          options={
                            r.statut === "confirme"
                              ? [
                                  { label: "Démarrer", statut: "en_cours", variant: "primary" },
                                  { label: "Terminer",  statut: "termine",  variant: "success" },
                                  { label: "Annuler",   statut: "annule",   variant: "danger",
                                    confirm: "Annuler cette intervention ?" },
                                ]
                              : [ // en_cours
                                  { label: "Marquer comme terminée", statut: "termine", variant: "success" },
                                ]
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          LIGNE BASSE : ABONNEMENT + PLANNING
          ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* ── Abonnement ──────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className={`px-5 py-4 ${planConfig[plan].bg} border-b border-gray-100`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${planConfig[plan].dot}`} />
                <span className={`text-sm font-bold ${planConfig[plan].color}`}>
                  {planConfig[plan].label}
                </span>
              </div>
              {artisan.subscription_status && artisan.subscription_status !== "canceled" && (
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  artisan.subscription_status === "active"
                    ? "bg-green-100 text-green-700"
                    : artisan.subscription_status === "trialing"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-red-100 text-red-600"
                }`}>
                  {subStatusLabel[artisan.subscription_status] ?? artisan.subscription_status}
                </span>
              )}
            </div>
          </div>

          <div className="px-5 py-4 space-y-3">
            {plan === "aucun" ? (
              <p className="text-xs text-gray-500">
                Souscrivez à un plan pour être visible sur la carte et recevoir des réservations.
              </p>
            ) : (
              <div className="space-y-1.5">
                {renewalDate && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Renouvellement</span>
                    <span className="font-medium text-gray-700">{renewalDate}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Commission plateforme</span>
                  <span className="font-medium text-gray-700">10%</span>
                </div>
              </div>
            )}

            <Link
              href="/dashboard/artisan/abonnement"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                         bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold
                         transition-colors shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              {plan === "aucun" ? "Choisir un plan" : "Gérer mon abonnement"}
            </Link>
          </div>
        </section>

        {/* ── Planning ─────────────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-indigo-50 border-b border-indigo-100">
            <div className="flex items-center gap-2.5">
              <svg className="w-4.5 h-4.5 text-indigo-600 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-bold text-indigo-700">Mon planning</span>
            </div>
          </div>

          <div className="px-5 py-4 space-y-3">
            <p className="text-xs text-gray-500">
              Définissez vos créneaux de disponibilité hebdomadaires et bloquez des dates.
            </p>
            <div className="space-y-2">
              <Link
                href="/dashboard/artisan/planning"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                           bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold
                           transition-colors shadow-sm"
              >
                Modifier mes disponibilités
              </Link>
              <Link
                href="/dashboard/artisan/reservations"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                           bg-white border border-gray-200 hover:bg-gray-50 text-gray-700
                           text-xs font-semibold transition-colors"
              >
                Toutes mes réservations
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* Si aucune réservation en attente, afficher la section même vide */}
      {attentes.length === 0 && (
        <section>
          <SectionHeader title="Réservations en attente" />
          <EmptyCard
            text="Aucune réservation en attente pour le moment."
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            }
          />
        </section>
      )}

    </div>
  );
}

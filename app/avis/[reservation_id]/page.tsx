import Image from "next/image";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import StarRatingForm from "@/components/avis/StarRatingForm";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ reservation_id: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Laisser un avis" };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function StarRowStatic({ note }: { note: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`w-4 h-4 ${s <= Math.round(note) ? "text-yellow-400" : "text-gray-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AvisPage({ params }: PageProps) {
  const { reservation_id } = await params;

  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/avis/${reservation_id}`);

  const admin = createAdminClient();

  // ── Réservation ───────────────────────────────────────────────────────────
  type ResaDetail = {
    id: string;
    date: string | null;
    heure_debut: string | null;
    heure_fin: string | null;
    statut: string | null;
    service_titre: string | null;
    client_id: string | null;
    artisan_id: string | null;
    artisan_nom: string | null;
    artisan_prenom: string | null;
    artisan_metier: string | null;
    artisan_photo_url: string | null;
  };

  const { data: resaRaw } = await admin
    .from("reservations_detail")
    .select(
      "id, date, heure_debut, heure_fin, statut, service_titre, " +
        "client_id, artisan_id, artisan_nom, artisan_prenom, " +
        "artisan_metier, artisan_photo_url"
    )
    .eq("id", reservation_id)
    .maybeSingle();

  const resa = resaRaw as unknown as ResaDetail | null;

  if (!resa) notFound();

  // Vérifier que l'utilisateur est bien le client
  if (resa.client_id !== user.id) notFound();

  // Vérifier statut
  if (resa.statut !== "termine") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Avis non disponible</h1>
          <p className="text-gray-500 text-sm mb-6">
            Vous ne pouvez laisser un avis qu&apos;une fois la prestation terminée.
            Le statut actuel de votre réservation est&nbsp;:
            <strong className="text-gray-700"> {resa.statut?.replace("_", " ")}</strong>.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition-colors"
          >
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    );
  }

  // ── Avis déjà soumis ? ────────────────────────────────────────────────────
  const { data: existingAvis } = await admin
    .from("avis")
    .select("id, note, commentaire, created_at")
    .eq("reservation_id", reservation_id)
    .maybeSingle();

  const artisanNom =
    `${resa.artisan_prenom ?? ""} ${resa.artisan_nom ?? ""}`.trim() ||
    "le artisan";

  // ─── Avis déjà soumis → afficher résumé ──────────────────────────────────
  if (existingAvis) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Avis déjà soumis</h1>
            <p className="text-gray-500 text-sm mb-6">
              Vous avez déjà laissé un avis pour cette prestation.
            </p>

            {/* Résumé de l'avis */}
            <div className="bg-gray-50 rounded-xl p-4 text-left mb-6">
              <div className="flex items-center gap-2 mb-2">
                <StarRowStatic note={existingAvis.note} />
                <span className="text-sm font-bold text-gray-800">{existingAvis.note}/5</span>
              </div>
              {existingAvis.commentaire && (
                <p className="text-sm text-gray-600 italic">&ldquo;{existingAvis.commentaire}&rdquo;</p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                Soumis le {new Date(existingAvis.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </p>
            </div>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition-colors"
            >
              Retour au tableau de bord
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Formulaire ───────────────────────────────────────────────────────────

  const initials =
    `${resa.artisan_prenom?.[0] ?? ""}${resa.artisan_nom?.[0] ?? ""}`
      .toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Barre de navigation ──────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100 h-14">
        <div className="max-w-lg mx-auto px-4 h-full flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500
                       hover:text-gray-900 transition-colors group"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Mon tableau de bord
          </Link>
          <span className="text-brand-600 font-bold text-sm">Manobra</span>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-8">

        {/* ── Récapitulatif de la prestation ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Votre prestation
          </p>
          <div className="flex items-center gap-4">
            {/* Avatar artisan */}
            {resa.artisan_photo_url ? (
              <div className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                <Image
                  src={resa.artisan_photo_url}
                  alt={artisanNom}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-xl bg-brand-100 text-brand-700 font-bold text-lg
                              flex items-center justify-center flex-shrink-0">
                {initials}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-base leading-tight">{artisanNom}</p>
              {resa.artisan_metier && (
                <p className="text-sm text-gray-500">{resa.artisan_metier}</p>
              )}
              {resa.service_titre && (
                <p className="text-xs text-brand-600 font-medium mt-0.5">{resa.service_titre}</p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-50 flex flex-wrap gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {resa.date ? formatDate(resa.date) : "N/A"}
            </span>
            {resa.heure_debut && resa.heure_fin && (
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {resa.heure_debut.slice(0, 5)} → {resa.heure_fin.slice(0, 5)}
              </span>
            )}
          </div>
        </div>

        {/* ── Formulaire d'avis ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            Évaluez votre prestation
          </h1>
          <p className="text-sm text-gray-400 mb-6">
            Votre avis aide la communauté et améliore la qualité du service.
          </p>

          <StarRatingForm
            reservationId={reservation_id}
            artisanNom={artisanNom}
          />
        </div>

      </div>
    </div>
  );
}

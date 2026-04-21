"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ReservationItem } from "@/app/dashboard/reservations/page";
import type { ReservationStatut } from "@/types";

// ─── Statuts ───────────────────────────────────────────────────────────────────

const STATUT_CONFIG: Record<
  ReservationStatut,
  { label: string; color: string; dot: string }
> = {
  en_attente: {
    label: "En attente",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-400",
  },
  confirme: {
    label: "Confirmé",
    color: "bg-green-50 text-green-700 border-green-200",
    dot: "bg-green-500",
  },
  en_cours: {
    label: "En cours",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  termine: {
    label: "Terminé",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    dot: "bg-gray-400",
  },
  annule: {
    label: "Annulé",
    color: "bg-red-50 text-red-600 border-red-200",
    dot: "bg-red-400",
  },
};

type TabFilter = "all" | ReservationStatut;
const TABS: { key: TabFilter; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "en_attente", label: "En attente" },
  { key: "confirme", label: "Confirmées" },
  { key: "en_cours", label: "En cours" },
  { key: "termine", label: "Terminées" },
  { key: "annule", label: "Annulées" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function formatPrix(n: number | null) {
  if (!n) return "Sur devis";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(n);
}
function sliceHM(t: string) { return t.slice(0, 5); }

// ─── Badge statut ─────────────────────────────────────────────────────────────

function StatusBadge({ statut }: { statut: ReservationStatut }) {
  const cfg = STATUT_CONFIG[statut];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Carte réservation ───────────────────────────────────────────────────────

function ReservationCard({
  resa,
  onCancel,
  cancelling,
}: {
  resa: ReservationItem;
  onCancel: (id: string) => void;
  cancelling: string | null;
}) {
  const initials =
    ((resa.artisan_prenom?.[0] ?? "") + (resa.artisan_nom?.[0] ?? "")).toUpperCase() || "?";
  const fullName =
    `${resa.artisan_prenom ?? ""} ${resa.artisan_nom ?? ""}`.trim() || "artisan";
  const canCancel = resa.statut === "en_attente" || resa.statut === "confirme";

  return (
    <article className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-4">
        {/* Avatar artisan */}
        {resa.artisan_photo_url ? (
          <img
            src={resa.artisan_photo_url}
            alt={fullName}
            className="w-11 h-11 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-11 h-11 rounded-full bg-brand-100 text-brand-700 font-bold text-sm flex items-center justify-center shrink-0">
            {initials}
          </div>
        )}

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="font-semibold text-gray-900 leading-tight">{fullName}</p>
              <p className="text-sm text-gray-500">{Array.isArray(resa.artisan_metier) ? (resa.artisan_metier as string[]).slice(0,2).join(" · ") : resa.artisan_metier}</p>
            </div>
            <StatusBadge statut={resa.statut} />
          </div>

          {resa.service_titre && (
            <p className="mt-2 text-sm font-medium text-gray-800">{resa.service_titre}</p>
          )}

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatDate(resa.date)}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {sliceHM(resa.heure_debut)} → {sliceHM(resa.heure_fin)}
            </span>
            {resa.adresse_intervention && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {resa.adresse_intervention}
              </span>
            )}
          </div>

          {resa.montant_total && (
            <p className="mt-2 text-sm font-bold text-gray-900">{formatPrix(resa.montant_total)}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      {(canCancel || resa.artisan_id) && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
          {resa.artisan_id && (
            <Link
              href={`/artisans/${resa.artisan_id}`}
              className="text-sm text-brand-600 hover:text-brand-700 font-medium hover:underline"
            >
              Voir le profil →
            </Link>
          )}
          {(resa.statut as string) === "termine" && (
            <Link
              href={`/avis/${resa.id}`}
              className="ml-auto text-sm text-brand-600 hover:text-brand-700 font-medium px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors"
            >
              Laisser un avis
            </Link>
          )}
          {canCancel && (
            <button
              onClick={() => onCancel(resa.id)}
              disabled={cancelling === resa.id}
              className="ml-auto text-sm text-red-600 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {cancelling === resa.id ? "Annulation…" : "Annuler"}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface Props {
  reservations: ReservationItem[];
}

export default function ClientReservationsView({ reservations: initialResas }: Props) {
  const router = useRouter();
  const [reservations, setReservations] = useState(initialResas);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [cancelling, setCancelling] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      activeTab === "all"
        ? reservations
        : reservations.filter((r) => r.statut === activeTab),
    [reservations, activeTab]
  );

  // Counts per tab
  const counts = useMemo(() => {
    const c: Partial<Record<TabFilter, number>> = { all: reservations.length };
    reservations.forEach((r) => {
      c[r.statut] = (c[r.statut] ?? 0) + 1;
    });
    return c;
  }, [reservations]);

  async function handleCancel(id: string) {
    if (!confirm("Êtes-vous sûr(e) de vouloir annuler cette réservation ?")) return;
    setCancelling(id);
    try {
      const res = await fetch(`/api/reservations/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: "annule" }),
      });
      if (res.ok) {
        setReservations((prev) =>
          prev.map((r) => (r.id === id ? { ...r, statut: "annule" } : r))
        );
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error ?? "Erreur lors de l'annulation.");
      }
    } finally {
      setCancelling(null);
    }
  }

  if (reservations.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="font-semibold text-gray-700">Aucune réservation</p>
        <p className="text-sm text-gray-400 mt-1">Vos futures réservations apparaîtront ici.</p>
        <Link
          href="/map"
          className="mt-5 inline-block px-5 py-2.5 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 transition-colors"
        >
          Trouver un artisan
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-6 scrollbar-hide">
        {TABS.filter((t) => t.key === "all" || (counts[t.key] ?? 0) > 0).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`shrink-0 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-brand-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
            {counts[tab.key] ? (
              <span className={`ml-1.5 text-xs font-bold ${activeTab === tab.key ? "text-brand-100" : "text-gray-400"}`}>
                {counts[tab.key]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-10 text-sm">
          Aucune réservation dans cette catégorie.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((resa) => (
            <ReservationCard
              key={resa.id}
              resa={resa}
              onCancel={handleCancel}
              cancelling={cancelling}
            />
          ))}
        </div>
      )}
    </div>
  );
}

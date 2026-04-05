"use client";

import Image from "next/image";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { PrestaReservationItem } from "@/app/dashboard/artisan/reservations/page";
import type { ReservationStatut } from "@/types";

// ─── Config statuts ───────────────────────────────────────────────────────────

const STATUT_CONFIG: Record<ReservationStatut, { label: string; color: string; dot: string }> = {
  en_attente: { label: "En attente",  color: "bg-amber-50 text-amber-700 border-amber-200",  dot: "bg-amber-400"  },
  confirme:   { label: "Confirmé",    color: "bg-green-50 text-green-700 border-green-200",   dot: "bg-green-500"  },
  en_cours:   { label: "En cours",    color: "bg-blue-50 text-blue-700 border-blue-200",      dot: "bg-blue-500"   },
  termine:    { label: "Terminé",     color: "bg-gray-100 text-gray-600 border-gray-200",     dot: "bg-gray-400"   },
  annule:     { label: "Annulé",      color: "bg-red-50 text-red-600 border-red-200",         dot: "bg-red-400"    },
};

type TabFilter = "all" | ReservationStatut;
const TABS: { key: TabFilter; label: string }[] = [
  { key: "all",        label: "Toutes"     },
  { key: "en_attente", label: "En attente" },
  { key: "confirme",   label: "Confirmées" },
  { key: "en_cours",   label: "En cours"   },
  { key: "termine",    label: "Terminées"  },
  { key: "annule",     label: "Annulées"   },
];

// ─── Transitions disponibles par statut (côté artisan) ───────────────────
type Action = { label: string; statut: ReservationStatut; variant: "primary" | "danger" | "secondary" };

const ACTIONS: Partial<Record<ReservationStatut, Action[]>> = {
  en_attente: [
    { label: "✓ Accepter",   statut: "confirme", variant: "primary"    },
    { label: "✗ Refuser",    statut: "annule",   variant: "danger"     },
  ],
  confirme: [
    { label: "▶ Commencer",  statut: "en_cours", variant: "secondary"  },
    { label: "✗ Annuler",    statut: "annule",   variant: "danger"     },
  ],
  en_cours: [
    { label: "✓ Terminer",   statut: "termine",  variant: "primary"    },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}
function formatPrix(n: number | null) {
  if (!n) return "Sur devis";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(n);
}
function sliceHM(t: string) { return t.slice(0, 5); }

function StatusBadge({ statut }: { statut: ReservationStatut }) {
  const cfg = STATUT_CONFIG[statut];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Carte réservation artisan ───────────────────────────────────────────

function ReservationCard({
  resa,
  onAction,
  pendingId,
}: {
  resa: PrestaReservationItem;
  onAction: (id: string, statut: ReservationStatut) => void;
  pendingId: string | null;
}) {
  const initials =
    ((resa.client_prenom?.[0] ?? "") + (resa.client_nom?.[0] ?? "")).toUpperCase() || "?";
  const fullName = `${resa.client_prenom ?? ""} ${resa.client_nom ?? ""}`.trim() || "Client";
  const actions = ACTIONS[resa.statut] ?? [];
  const isBusy = pendingId === resa.id;

  return (
    <article className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-4">
        {/* Avatar client */}
        {resa.client_photo_url ? (
          <div className="relative w-11 h-11 rounded-full overflow-hidden shrink-0">
            <Image src={resa.client_photo_url} alt={fullName} fill sizes="44px" className="object-cover" />
          </div>
        ) : (
          <div className="w-11 h-11 rounded-full bg-gray-100 text-gray-600 font-bold text-sm flex items-center justify-center shrink-0">
            {initials}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <p className="font-semibold text-gray-900 leading-tight">{fullName}</p>
              {resa.service_titre && (
                <p className="text-sm text-gray-500">{resa.service_titre}</p>
              )}
            </div>
            <StatusBadge statut={resa.statut} />
          </div>

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
              <span className="flex items-center gap-1 truncate max-w-xs">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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

      {/* Boutons d'action */}
      {actions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 flex-wrap">
          {actions.map((action) => (
            <button
              key={action.statut}
              onClick={() => onAction(resa.id, action.statut)}
              disabled={isBusy}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                action.variant === "primary"
                  ? "bg-brand-500 text-white hover:bg-brand-600"
                  : action.variant === "danger"
                  ? "bg-white text-red-600 border border-red-200 hover:bg-red-50"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {isBusy ? "…" : action.label}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface Props {
  reservations: PrestaReservationItem[];
}

export default function PrestaReservationsView({ reservations: initialResas }: Props) {
  const router = useRouter();
  const [reservations, setReservations] = useState(initialResas);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const filtered = useMemo(
    () => activeTab === "all" ? reservations : reservations.filter((r) => r.statut === activeTab),
    [reservations, activeTab]
  );

  const counts = useMemo(() => {
    const c: Partial<Record<TabFilter, number>> = { all: reservations.length };
    reservations.forEach((r) => { c[r.statut] = (c[r.statut] ?? 0) + 1; });
    return c;
  }, [reservations]);

  async function handleAction(id: string, statut: ReservationStatut) {
    const confirmed =
      statut === "annule"
        ? confirm("Voulez-vous vraiment refuser / annuler cette réservation ?")
        : true;
    if (!confirmed) return;

    setPendingId(id);
    try {
      const res = await fetch(`/api/reservations/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut }),
      });
      if (res.ok) {
        setReservations((prev) =>
          prev.map((r) => (r.id === id ? { ...r, statut } : r))
        );
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error ?? "Une erreur est survenue.");
      }
    } finally {
      setPendingId(null);
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
        <p className="font-semibold text-gray-700">Aucune réservation reçue</p>
        <p className="text-sm text-gray-400 mt-1">
          Assurez-vous que vos disponibilités sont à jour pour être réservé.
        </p>
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

      {/* Alerte réservations en attente */}
      {(counts["en_attente"] ?? 0) > 0 && activeTab === "all" && (
        <div className="mb-4 flex items-center gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <strong>{counts["en_attente"]}</strong> demande{(counts["en_attente"] ?? 0) > 1 ? "s" : ""} en attente de votre réponse.
        </div>
      )}

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
              onAction={handleAction}
              pendingId={pendingId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

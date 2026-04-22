"use client";

import type { TService } from "./ReservationTunnel";

// ─── Formatters ───────────────────────────────────────────────────────────────

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

function formatDuree(minutes: number | null): string {
  if (!minutes) return "Durée variable";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

// ─── Icône horloge ────────────────────────────────────────────────────────────

function IconClock() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// ─── Composant ────────────────────────────────────────────────────────────────

interface Props {
  services: TService[];
  onSelect: (service: TService) => void;
}

export default function Step1Service({ services, onSelect }: Props) {
  // ── Aucun service ──────────────────────────────────────────────────────────
  if (services.length === 0) {
    return (
      <div className="text-center py-14">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <p className="font-semibold text-gray-700">Aucun service disponible</p>
        <p className="text-sm text-gray-400 mt-1">
          Ce artisan n&apos;a pas encore publié de service.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Choisissez un service</h1>
      <p className="text-gray-500 text-sm mb-6">
        Sélectionnez la prestation qui correspond à votre besoin.
      </p>

      <div className="flex flex-col gap-3">
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => onSelect(service)}
            className="w-full text-left bg-white rounded-xl border-2 border-gray-200 p-5
                       hover:border-brand-400 hover:shadow-md transition-all duration-150 group
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <div className="flex items-start justify-between gap-4">
              {/* Infos service */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 group-hover:text-brand-700 transition-colors leading-tight">
                  {service.titre}
                </p>

                {service.description && (
                  <p className="text-sm text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                    {service.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2.5 mt-3">
                  {/* Durée */}
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-medium">
                    <IconClock />
                    {formatDuree(service.duree_minutes)}
                  </span>

                  {/* Séparateur */}
                  {service.categorie && (
                    <span className="text-gray-300" aria-hidden>·</span>
                  )}

                  {/* Catégorie */}
                  {service.categorie && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 font-medium">
                      {service.categorie}
                    </span>
                  )}
                </div>
              </div>

              {/* Prix + flèche */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="font-bold text-xl text-gray-900">
                  {formatPrix(service.prix)}
                </span>
                <svg
                  className="w-5 h-5 text-gray-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>
        ))}
      </div>
      <p className="mt-6 text-xs text-gray-400 text-center">Aucun paiement requis — devis établi avant toute intervention.</p>
    </div>
  );
}

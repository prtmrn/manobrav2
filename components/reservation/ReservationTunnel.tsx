"use client";

import { useState } from "react";
import Link from "next/link";
import Step1Service from "./Step1Service";
import Step2Creneau from "./Step2Creneau";
import Step3Confirm from "./Step3Confirm";

// ─── Types partagés (exportés pour les sous-composants) ───────────────────────

export type TService = {
  id: string;
  titre: string;
  description: string | null;
  duree_minutes: number | null;
  prix: number | null;
  categorie: string | null;
};

export type Tartisan = {
  id: string;
  nom: string | null;
  prenom: string | null;
  metier: string | null;
  photo_url: string | null;
  ville: string | null;
  note_moyenne: number;
  abonnement_pro: boolean;
};

export type TSlot = {
  debut: string; // "HH:MM"
  fin: string;   // "HH:MM"
};

// ─── State du tunnel ──────────────────────────────────────────────────────────

type TunnelState = {
  step: 1 | 2 | 3;
  service: TService | null;
  date: string | null;  // "YYYY-MM-DD"
  slot: TSlot | null;
};

// ─── Barre de progression ─────────────────────────────────────────────────────

const STEP_LABELS = ["Service", "Créneau", "Confirmation"] as const;

function ProgressBar({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center mb-8" role="list" aria-label="Étapes de réservation">
      {STEP_LABELS.map((label, i) => {
        const num = (i + 1) as 1 | 2 | 3;
        const done = step > num;
        const active = step === num;

        return (
          <div key={label} className="flex items-center flex-1 last:flex-none" role="listitem">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-200 ${
                  done
                    ? "bg-brand-500 border-brand-500 text-white"
                    : active
                    ? "bg-white border-brand-500 text-brand-600 shadow-sm"
                    : "bg-white border-gray-200 text-gray-400"
                }`}
                aria-current={active ? "step" : undefined}
              >
                {done ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  num
                )}
              </div>
              <span
                className={`text-xs mt-1.5 font-medium hidden sm:block transition-colors ${
                  active
                    ? "text-brand-600"
                    : done
                    ? "text-brand-500"
                    : "text-gray-400"
                }`}
              >
                {label}
              </span>
            </div>

            {i < STEP_LABELS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 transition-colors duration-300 ${
                  step > num ? "bg-brand-500" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface Props {
  artisan: Tartisan;
  services: TService[];
  clientId: string | null;
  isGuest: boolean;
  clientProfile?: { prenom: string | null; nom: string | null; telephone: string | null } | null;
}

export default function ReservationTunnel({ artisan, services, clientId, isGuest, clientProfile }: Props) {
  const [state, setState] = useState<TunnelState>({
    step: 1,
    service: null,
    date: null,
    slot: null,
  });

  // ── Handlers de navigation ─────────────────────────────────────────────────

  function handleServiceSelect(service: TService) {
    setState({ step: 2, service, date: null, slot: null });
  }

  function handleSlotSelect(date: string, slot: TSlot) {
    setState((prev) => ({ ...prev, step: 3, date, slot }));
  }

  function goBack() {
    setState((prev) => ({
      ...prev,
      step: (Math.max(1, prev.step - 1)) as 1 | 2 | 3,
    }));
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  const fullName = `${artisan.prenom ?? ""} ${artisan.nom ?? ""}`.trim();
  const initials =
    (artisan.prenom?.[0] ?? "").toUpperCase() +
    (artisan.nom?.[0] ?? "").toUpperCase();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* En-tête artisan */}
      <div className="flex items-center gap-3 mb-7">
        <Link
          href={`/prestataires/${artisan.id}`}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Retour au profil du artisan"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>

        {artisan.photo_url ? (
          <img
            src={artisan.photo_url}
            alt={fullName}
            className="w-10 h-10 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm shrink-0">
            {initials || "?"}
          </div>
        )}

        <div className="min-w-0">
          <p className="font-semibold text-gray-900 leading-tight truncate">{fullName}</p>
          <p className="text-sm text-gray-500 truncate">{artisan.metier}</p>
        </div>

        {artisan.abonnement_pro && (
          <span className="ml-auto shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            🏅 Pro
          </span>
        )}
      </div>

      {/* Barre de progression */}
      <ProgressBar step={state.step} />

      {/* Étapes */}
      {state.step === 1 && (
        <Step1Service services={services} onSelect={handleServiceSelect} />
      )}

      {state.step === 2 && state.service && (
        <Step2Creneau
          artisanId={artisan.id}
          service={state.service}
          onSelect={handleSlotSelect}
          onBack={goBack}
        />
      )}

      {state.step === 3 && state.service && state.date && state.slot && (
        <Step3Confirm
          artisan={artisan}
          service={state.service}
          date={state.date}
          slot={state.slot}
          onBack={goBack}
          isGuest={isGuest}
          clientProfile={clientProfile}
        />
      )}
    </div>
  );
}

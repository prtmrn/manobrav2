"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface OnboardingStatus {
  /** 0-5 : étape sauvegardée en base */
  savedStep: number;
  /** true si le profil de base est rempli (nom, prénom, métier, ville) */
  profileComplete: boolean;
  /** true si au moins un service actif existe */
  hasService: boolean;
  /** true si au moins une disponibilité active existe */
  hasDisponibilite: boolean;
  /** true si stripe_onboarding_complete = true */
  stripeConnected: boolean;
  /** true si plan_actif != 'aucun' */
  hasSubscription: boolean;
}

interface OnboardingProgressBarProps {
  status: OnboardingStatus;
}

// ─── Config des étapes ─────────────────────────────────────────────────────────

interface StepConfig {
  id: number;
  label: string;
  shortLabel: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  skippable?: boolean;
  icon: React.ReactNode;
  isComplete: (s: OnboardingStatus) => boolean;
}

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  );
}

const STEPS: StepConfig[] = [
  {
    id: 1,
    label: "Compléter le profil",
    shortLabel: "Profil",
    description: "Ajoutez votre nom, métier, ville et une photo.",
    actionLabel: "Compléter mon profil",
    actionHref: "/dashboard/artisan/profil",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    isComplete: (s) => s.profileComplete,
  },
  {
    id: 2,
    label: "Ajouter un service",
    shortLabel: "Service",
    description: "Créez au moins une prestation avec son tarif.",
    actionLabel: "Ajouter un service",
    actionHref: "/dashboard/artisan/services",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    isComplete: (s) => s.hasService,
  },
  {
    id: 3,
    label: "Configurer les disponibilités",
    shortLabel: "Dispo",
    description: "Indiquez vos jours et horaires de travail.",
    actionLabel: "Configurer mes dispos",
    actionHref: "/dashboard/artisan/planning",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    isComplete: (s) => s.hasDisponibilite,
  },
  {
    id: 4,
    label: "Paiements",
    shortLabel: "Paiements",
    description: "Configurez vos paiements pour recevoir vos revenus.",
    actionLabel: "Configurer les paiements",
    actionHref: "/dashboard/artisan/paiements",
    skippable: true,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    isComplete: (s) => s.stripeConnected,
  },
  {
    id: 5,
    label: "Souscrire un abonnement",
    shortLabel: "Abonnement",
    description: "Choisissez un plan pour rendre votre profil visible.",
    actionLabel: "Choisir mon abonnement",
    actionHref: "/dashboard/artisan/abonnement",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    isComplete: (s) => s.hasSubscription,
  },
];

// ─── Composant principal ───────────────────────────────────────────────────────

export default function OnboardingProgressBar({ status }: OnboardingProgressBarProps) {
  const [dismissed, setDismissed] = useState(false);

  // Calculer le nombre d'étapes complétées
  const [paymentSkipped, setPaymentSkipped] = useState(false);

  useEffect(() => {
    const skipped = localStorage.getItem("manobra_payment_skipped") === "true";
    setPaymentSkipped(skipped);
  }, []);

  // Override stripeConnected si skippé
  const effectiveStatus = { ...status, stripeConnected: status.stripeConnected || paymentSkipped };

  const completedCount = STEPS.filter((s) => s.isComplete(effectiveStatus)).length;
  const progressPercent = (completedCount / STEPS.length) * 100;
  const isComplete = STEPS.filter((s) => s.isComplete(effectiveStatus)).length === STEPS.length;

  // Ne rien afficher si complété ET dismissed, ou si on dismiss volontairement
  if (dismissed) return null;

  // ── Message de félicitations ────────────────────────────────────────────
  if (isComplete) {
    return (
      <div className="bg-gradient-to-r from-brand-600 to-brand-500 rounded-2xl p-6
                      text-white shadow-sm relative overflow-hidden">
        {/* Confetti décoratif */}
        <div className="absolute right-4 top-0 opacity-10 text-8xl select-none leading-none">
          🎉
        </div>
        <div className="relative">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center
                            flex-shrink-0 backdrop-blur-sm">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold leading-tight">
                Félicitations, votre profil est prêt&nbsp;! 🎉
              </h2>
              <p className="text-brand-100 text-sm mt-1">
                Toutes les étapes sont complétées. Votre profil est visible par les clients
                et vous pouvez recevoir des réservations.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <Link
                  href="/artisans"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl
                             bg-white text-brand-700 text-sm font-semibold
                             hover:bg-brand-50 transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Voir mon profil public
                </Link>
                <button
                  onClick={() => setDismissed(true)}
                  className="text-sm text-brand-200 hover:text-white transition-colors"
                >
                  Masquer ce message
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Trouver la prochaine étape non complétée ────────────────────────────
  const nextStep = STEPS.find((s) => !s.isComplete(effectiveStatus));

  // ── Barre de progression ────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* En-tête */}
      <div className="px-5 pt-5 pb-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-gray-900">Finalisez votre profil</h2>
          </div>
          <span className="text-xs font-semibold text-brand-600">
            {completedCount}/{STEPS.length} étapes
          </span>
        </div>
        <p className="text-xs text-gray-400 mb-3 ml-9">
          Complétez chaque étape pour commencer à recevoir des réservations.
        </p>

        {/* Barre de progression globale */}
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full
                       transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Étapes */}
      <div className="px-5 pb-5">
        {/* Desktop : stepper horizontal */}
        <div className="hidden sm:flex items-start gap-2 mb-5">
          {STEPS.map((step, i) => {
            const done = step.isComplete(effectiveStatus);
            const isNext = !done && STEPS.slice(0, i).every((s) => s.isComplete(effectiveStatus));
            const isSkipped = step.skippable && paymentSkipped && !status.stripeConnected;
            return (
              <div key={step.id} className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex flex-col items-center flex-1 min-w-0">
                  {/* Pastille */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center
                                   flex-shrink-0 transition-all ${
                    isSkipped
                      ? "bg-gray-100 text-gray-400 ring-2 ring-gray-200"
                      : done
                      ? "bg-brand-600 text-white ring-4 ring-brand-50"
                      : isNext
                      ? "bg-brand-50 text-brand-600 ring-4 ring-brand-50 ring-offset-0"
                      : "bg-gray-50 text-gray-300 ring-2 ring-gray-100"
                  }`}>
                    {isSkipped ? <span className="text-xs font-bold">···</span> : done ? <CheckIcon /> : (
                      <span className="text-xs font-bold">{step.id}</span>
                    )}
                  </div>
                  {/* Label */}
                  <p className={`text-[10px] font-medium mt-1.5 text-center leading-tight ${
                    done ? "text-brand-600" : isNext ? "text-gray-700" : "text-gray-400"
                  }`}>
                    {step.shortLabel}
                  </p>
                </div>
                {/* Connecteur */}
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 rounded-full mt-[-14px] transition-all ${
                    done ? "bg-brand-300" : "bg-gray-100"
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile : liste verticale compacte */}
        <div className="flex flex-col gap-2 sm:hidden mb-4">
          {STEPS.map((step) => {
            const done = step.isComplete(effectiveStatus);
            return (
              <div key={step.id}
                   className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                     done ? "bg-brand-50/60" : "bg-gray-50"
                   }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center
                                 flex-shrink-0 ${
                  isSkipped ? "bg-gray-100 text-gray-400 border border-gray-200"
                  : done ? "bg-brand-600 text-white" : "bg-white text-gray-300 border border-gray-200"
                }`}>
                  {isSkipped
                    ? <span className="text-[10px] font-bold">···</span>
                    : done
                    ? <CheckIcon />
                    : <span className="text-[10px] font-bold text-gray-400">{step.id}</span>
                  }
                </div>
                <span className={`text-xs font-medium ${
                  done ? "text-brand-700" : "text-gray-500"
                }`}>
                  {step.label}
                </span>
                {done && (
                  <svg className="w-3.5 h-3.5 text-brand-400 ml-auto" fill="none"
                       stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                          strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            );
          })}
        </div>

        {/* Carte de l'étape suivante */}
        {nextStep && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-brand-50
                          rounded-xl p-4 border border-brand-100">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white text-brand-600 flex items-center
                              justify-center flex-shrink-0 shadow-sm border border-brand-100">
                {nextStep.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 leading-tight">
                  Étape {nextStep.id}&nbsp;: {nextStep.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  {nextStep.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {nextStep.skippable && (
                <button
                  onClick={() => {
                    localStorage.setItem("manobra_payment_skipped", "true");
                    setPaymentSkipped(true);
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 whitespace-nowrap"
                >
                  Passer cette étape
                </button>
              )}
              <Link
                href={nextStep.actionHref}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5
                           rounded-xl bg-brand-600 text-white text-sm font-semibold
                           hover:bg-brand-700 transition-colors shadow-sm whitespace-nowrap"
              >
                {nextStep.actionLabel}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

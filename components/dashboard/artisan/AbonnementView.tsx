"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type Plan = "aucun" | "essentiel" | "pro";

interface Props {
  // Abonnement
  planActif: Plan;
  subscriptionStatus: string | null;
  subscriptionEndDate: string | null;
  hasStripeCustomer: boolean;
  // Stripe Connect
  stripeAccountId: string | null;
  stripeComplete: boolean;
  // Flash params URL
  stripeStatus?: string;
  subscriptionParam?: string;
}

type FlashType = "success" | "warning" | "error";
interface Flash {
  type: FlashType;
  message: string;
}

// ─── Données des plans ────────────────────────────────────────────────────────

const PLANS: Array<{
  id: "essentiel" | "pro";
  name: string;
  price: number;
  tagline: string;
  features: string[];
  highlight: boolean;
}> = [
  {
    id: "essentiel",
    name: "Essentiel",
    price: 29,
    tagline: "Démarrez votre activité",
    features: [
      "Visible sur la carte",
      "Jusqu'à 5 services",
      "Support email",
    ],
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 59,
    tagline: "Maximisez votre visibilité",
    features: [
      "Mis en avant sur la carte",
      "Services illimités",
      "Badge Vérifié",
      "Statistiques avancées",
    ],
    highlight: true,
  },
];

// ─── Helpers de formatage ─────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function statusLabel(status: string | null): string {
  switch (status) {
    case "active":    return "Actif";
    case "trialing":  return "Période d'essai";
    case "past_due":  return "Paiement en retard";
    case "canceled":  return "Annulé";
    case "unpaid":    return "Impayé";
    default:          return "Inactif";
  }
}

function statusColor(status: string | null): string {
  switch (status) {
    case "active":   return "bg-green-100 text-green-700";
    case "trialing": return "bg-blue-100 text-blue-700";
    case "past_due":
    case "unpaid":   return "bg-red-100 text-red-700";
    case "canceled": return "bg-gray-100 text-gray-500";
    default:         return "bg-gray-100 text-gray-500";
  }
}

// ─── Icône check ──────────────────────────────────────────────────────────────

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

// ─── Composant Flash ──────────────────────────────────────────────────────────

function FlashAlert({ flash, onClose }: { flash: Flash; onClose: () => void }) {
  const styles: Record<FlashType, string> = {
    success: "bg-green-50 border-green-200 text-green-800",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    error:   "bg-red-50 border-red-200 text-red-800",
  };
  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${styles[flash.type]}`}
    >
      {flash.type === "success" && (
        <svg className="w-5 h-5 mt-0.5 shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      {flash.type === "warning" && (
        <svg className="w-5 h-5 mt-0.5 shrink-0 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      )}
      {flash.type === "error" && (
        <svg className="w-5 h-5 mt-0.5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      <span>{flash.message}</span>
      <button
        onClick={onClose}
        className="ml-auto shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Fermer"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function AbonnementView({
  planActif,
  subscriptionStatus,
  subscriptionEndDate,
  hasStripeCustomer,
  stripeAccountId,
  stripeComplete,
  stripeStatus,
  subscriptionParam,
}: Props) {
  const router = useRouter();
  const [flash, setFlash] = useState<Flash | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<"essentiel" | "pro" | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);

  // ── Flash messages ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (subscriptionParam === "success") {
      setFlash({ type: "success", message: "Abonnement activé avec succès ! Bienvenue sur votre nouveau plan." });
    } else if (subscriptionParam === "cancelled") {
      setFlash({ type: "warning", message: "La souscription a été annulée. Vous pouvez réessayer à tout moment." });
    } else if (stripeStatus === "success") {
      setFlash({ type: "success", message: "Votre compte Stripe a été connecté avec succès !" });
    } else if (stripeStatus === "pending") {
      setFlash({ type: "warning", message: "Onboarding Stripe incomplet. Reprenez l'inscription ci-dessous." });
    } else if (stripeStatus === "error") {
      setFlash({ type: "error", message: "Une erreur est survenue avec Stripe. Veuillez réessayer." });
    }

    // Nettoyer les params URL
    if (stripeStatus || subscriptionParam) {
      const url = new URL(window.location.href);
      url.searchParams.delete("stripe");
      url.searchParams.delete("subscription");
      window.history.replaceState({}, "", url.toString());
    }
  }, [stripeStatus, subscriptionParam]);

  // Masquage automatique du flash après 7 s
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 7000);
    return () => clearTimeout(t);
  }, [flash]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleSubscribe = useCallback(async (plan: "essentiel" | "pro") => {
    setLoadingPlan(plan);
    try {
      const res = await fetch("/api/stripe/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setFlash({ type: "error", message: data.error ?? "Une erreur est survenue." });
        return;
      }
      window.location.href = data.url;
    } catch {
      setFlash({ type: "error", message: "Impossible de contacter le serveur. Réessayez." });
    } finally {
      setLoadingPlan(null);
    }
  }, []);

  const handlePortal = useCallback(async () => {
    setLoadingPortal(true);
    try {
      const res = await fetch("/api/stripe/subscription/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setFlash({ type: "error", message: data.error ?? "Impossible d'ouvrir le portail." });
        return;
      }
      window.location.href = data.url;
    } catch {
      setFlash({ type: "error", message: "Impossible de contacter le serveur. Réessayez." });
    } finally {
      setLoadingPortal(false);
    }
  }, []);

  // ── Stripe Connect ──────────────────────────────────────────────────────────
  const stripeStatusLabel = stripeComplete
    ? "Connecté"
    : stripeAccountId
    ? "En attente de validation"
    : "Non connecté";

  const stripeStatusColor = stripeComplete
    ? "bg-green-100 text-green-700"
    : stripeAccountId
    ? "bg-yellow-100 text-yellow-700"
    : "bg-gray-100 text-gray-500";

  const stripeDotColor = stripeComplete
    ? "bg-green-500"
    : stripeAccountId
    ? "bg-yellow-400"
    : "bg-gray-400";

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">

      {/* ── Titre ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mon abonnement</h1>
        <p className="text-sm text-gray-500 mt-1">
          Choisissez le plan adapté à votre activité et gérez votre facturation.
        </p>
      </div>

      {/* ── Flash ─────────────────────────────────────────────────────────── */}
      {flash && (
        <FlashAlert flash={flash} onClose={() => setFlash(null)} />
      )}

      {/* ── Plan actif (banner si abonné) ─────────────────────────────────── */}
      {planActif !== "aucun" && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  Plan {planActif.charAt(0).toUpperCase() + planActif.slice(1)}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(subscriptionStatus)}`}>
                    {statusLabel(subscriptionStatus)}
                  </span>
                  {subscriptionEndDate && (
                    <span className="text-xs text-gray-400">
                      {subscriptionStatus === "canceled"
                        ? `Expire le ${formatDate(subscriptionEndDate)}`
                        : `Renouvellement le ${formatDate(subscriptionEndDate)}`}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handlePortal}
              disabled={loadingPortal}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200
                         text-sm font-medium text-gray-700 bg-white hover:bg-gray-50
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loadingPortal ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
              Gérer mon abonnement
            </button>
          </div>
        </div>
      )}

      {/* ── Cards des plans ───────────────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          {planActif === "aucun" ? "Choisissez votre plan" : "Nos formules"}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4 items-stretch">
          {PLANS.map((plan) => {
            const isActive = planActif === plan.id;
            const isLoading = loadingPlan === plan.id;
            const isOtherLoading = loadingPlan !== null && !isLoading;

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl border-2 overflow-hidden transition-shadow flex flex-col ${
                  plan.highlight
                    ? "border-violet-500 shadow-lg shadow-violet-100"
                    : "border-gray-200"
                } ${isActive ? "ring-2 ring-offset-2 ring-violet-500" : ""}`}
              >
                {/* Badge recommandé */}
                {plan.highlight && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-violet-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
                      Recommandé
                    </div>
                  </div>
                )}

                {/* Badge plan actif */}
                {isActive && (
                  <div className="absolute top-0 left-0">
                    <div className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-br-xl flex items-center gap-1">
                      <CheckIcon className="w-3 h-3" />
                      Plan actif
                    </div>
                  </div>
                )}

                <div className="p-6 space-y-5 flex flex-col flex-1">
                  {/* En-tête */}
                  <div className={isActive || plan.highlight ? "pt-4" : ""}>
                    <h3 className="text-lg font-bold text-gray-900">
                      Plan {plan.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">{plan.tagline}</p>
                  </div>

                  {/* Prix */}
                  <div className="flex items-end gap-1">
                    <span className={`text-4xl font-extrabold ${plan.highlight ? "text-violet-600" : "text-gray-900"}`}>
                      {plan.price}€
                    </span>
                    <span className="text-sm text-gray-400 mb-1.5">/mois</span>
                  </div>

                  {/* Features */}
                  <ul className="space-y-2.5 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2.5 text-sm text-gray-600">
                        <CheckIcon
                          className={`w-4 h-4 shrink-0 ${plan.highlight ? "text-violet-500" : "text-green-500"}`}
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* Bouton */}
                  {isActive ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-xl text-sm font-semibold
                                 bg-green-50 text-green-700 border border-green-200
                                 cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <CheckIcon className="w-4 h-4" />
                      Plan actif
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={isLoading || isOtherLoading || loadingPortal}
                      className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all
                                 disabled:opacity-50 disabled:cursor-not-allowed
                                 flex items-center justify-center gap-2
                                 ${
                                   plan.highlight
                                     ? "bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
                                     : "bg-gray-900 hover:bg-gray-800 text-white"
                                 }`}
                    >
                      {isLoading ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          Chargement…
                        </>
                      ) : planActif !== "aucun" ? (
                        `Passer au plan ${plan.name}`
                      ) : (
                        `Souscrire au plan ${plan.name}`
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Note sous les plans */}
        <p className="text-xs text-gray-400 text-center mt-3">
          Sans engagement. Résiliez ou changez de plan à tout moment depuis le portail de facturation.
        </p>
      </div>

      {/* ── Card Stripe Connect ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#635BFF]/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#635BFF]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C4.797 22.938 7.895 24 11.8 24c2.558 0 4.694-.626 6.207-1.858 1.622-1.33 2.466-3.268 2.466-5.659 0-4.159-2.467-5.873-6.497-7.333z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Stripe Connect</p>
              <p className="text-xs text-gray-400">Compte de paiement artisan</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${stripeStatusColor}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${stripeDotColor}`} />
            {stripeStatusLabel}
          </span>
        </div>

        <div className="px-6 py-5 space-y-4">
          {stripeComplete ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Votre compte Stripe est connecté et validé. Vous pouvez recevoir des paiements
                directement sur votre compte bancaire.
              </p>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <p className="text-xs text-gray-500 font-mono">ID compte : {stripeAccountId}</p>
              </div>
              <a
                href="https://dashboard.stripe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-[#635BFF] font-medium hover:underline"
              >
                Ouvrir le tableau de bord Stripe
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          ) : stripeAccountId ? (
            <div className="space-y-4">
              <div className="flex gap-3 p-4 rounded-xl bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
                <svg className="w-5 h-5 mt-0.5 shrink-0 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <span>
                  Votre inscription Stripe est <strong>en cours</strong>. Complétez votre
                  profil pour pouvoir recevoir des paiements.
                </span>
              </div>
              <a
                href="/api/stripe/connect/onboard"
                className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl font-semibold text-white
                           bg-[#635BFF] hover:bg-[#524DE0] transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Continuer l&apos;onboarding Stripe
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Connectez votre compte Stripe pour recevoir les paiements de vos clients
                directement sur votre compte bancaire.
              </p>
              <ul className="space-y-2">
                {[
                  "Paiements sécurisés et instantanés",
                  "Virements automatiques sur votre compte bancaire",
                  "Tableau de bord Stripe pour suivre vos revenus",
                  "Protection contre la fraude incluse",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-500">
                    <CheckIcon className="w-4 h-4 text-green-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="/api/stripe/connect/onboard"
                className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl font-semibold text-white
                           bg-[#635BFF] hover:bg-[#524DE0] transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.756 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C4.797 22.938 7.895 24 11.8 24c2.558 0 4.694-.626 6.207-1.858 1.622-1.33 2.466-3.268 2.466-5.659 0-4.159-2.467-5.873-6.497-7.333z" />
                </svg>
                Connecter mon compte Stripe
              </a>
            </div>
          )}
        </div>
      </div>

      {/* ── Note légale ───────────────────────────────────────────────────── */}
      <p className="text-xs text-gray-400 text-center px-4">
        Les abonnements et paiements sont traités par{" "}
        <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
          Stripe
        </a>
        . En souscrivant, vous acceptez les{" "}
        <a href="https://stripe.com/fr/legal" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">
          Conditions d&apos;utilisation Stripe
        </a>
        .
      </p>
    </div>
  );
}

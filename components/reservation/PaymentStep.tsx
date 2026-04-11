"use client";

import { useState } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import type { StripeError } from "@stripe/stripe-js";
import { stripePromise } from "@/lib/stripe-client";
import type { Tartisan, TService, TSlot } from "./ReservationTunnel";

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

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─── Traduction des erreurs Stripe en français ────────────────────────────────

function stripeErrorToFr(error: StripeError | undefined): string {
  if (!error) return "Une erreur est survenue lors du paiement.";
  switch (error.code) {
    case "card_declined":
      return "Carte refusée. Vérifiez vos informations ou utilisez une autre carte.";
    case "insufficient_funds":
      return "Fonds insuffisants sur votre carte.";
    case "expired_card":
      return "Cette carte est expirée.";
    case "incorrect_cvc":
      return "Code de sécurité (CVV) incorrect.";
    case "incorrect_number":
      return "Numéro de carte incorrect.";
    case "processing_error":
      return "Erreur de traitement. Veuillez réessayer dans quelques instants.";
    case "card_velocity_exceeded":
      return "Trop de tentatives. Attendez quelques minutes avant de réessayer.";
    case "do_not_honor":
      return "Paiement refusé par votre banque. Contactez votre conseiller.";
    case "stolen_card":
    case "lost_card":
      return "Ce moyen de paiement est invalide. Utilisez une autre carte.";
    default:
      return error.message ?? "Une erreur est survenue lors du paiement.";
  }
}

// ─── Données de réservation à transmettre après paiement ─────────────────────

interface ReservationData {
  artisanId: string;
  serviceId: string;
  date: string;
  heureDebut: string; // "HH:MM:SS"
  heureFin: string;   // "HH:MM:SS"
  adresse: string;
  montantTotal: number | null;
}

// ─── CheckoutForm — doit être rendu à l'intérieur de <Elements> ───────────────

function CheckoutForm({
  clientSecret,
  reservationData,
  montantTotal,
  onSuccess,
}: {
  clientSecret: string;
  reservationData: ReservationData;
  montantTotal: number | null;
  onSuccess: (reservationId: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elementsReady, setElementsReady] = useState(false);

  async function handlePay() {
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    // ── Étape 1 : Validation du formulaire Stripe ──────────────────────────
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(stripeErrorToFr(submitError));
      setLoading(false);
      return;
    }

    // ── Étape 2 : Confirmation du paiement ────────────────────────────────
    // redirect: "if_required" → pas de redirection pour les paiements par carte
    // Pour 3DS, Stripe affiche une modale inline
    const result = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        // Fallback si une redirection est quand même nécessaire (ex : Bancontact)
        return_url: `${window.location.origin}/dashboard/reservations?payment=redirect`,
      },
      redirect: "if_required",
    });

    if ("error" in result) {
      setError(stripeErrorToFr(result.error));
      setLoading(false);
      return;
    }

    const { paymentIntent } = result;

    if (
      paymentIntent.status === "succeeded" ||
      paymentIntent.status === "processing"
    ) {
      // ── Étape 3 : Création de la réservation en base ────────────────────
      try {
        const res = await fetch("/api/reservations/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...reservationData,
            paymentIntentId: paymentIntent.id,
          }),
        });

        const json = (await res.json()) as {
          reservationId?: string;
          error?: string;
        };

        if (res.ok && json.reservationId) {
          onSuccess(json.reservationId);
        } else {
          // Paiement encaissé mais réservation non créée → afficher l'ID PI pour le support
          setError(
            json.error ??
              `Paiement effectué (réf. ${paymentIntent.id.slice(-8).toUpperCase()}) mais la réservation n'a pas pu être enregistrée. Contactez le support.`
          );
        }
      } catch {
        setError(
          `Paiement effectué (réf. ${paymentIntent.id.slice(-8).toUpperCase()}) mais la réservation n'a pas pu être enregistrée. Contactez le support.`
        );
      }
    } else {
      setError(
        "Le paiement n'a pas pu être finalisé. Veuillez vérifier vos informations et réessayer."
      );
    }

    setLoading(false);
  }

  return (
    <div className="space-y-5">
      {/* Stripe PaymentElement */}
      <div
        className={`transition-opacity duration-300 ${
          elementsReady ? "opacity-100" : "opacity-0"
        }`}
      >
        <PaymentElement
          onReady={() => setElementsReady(true)}
          options={{
            layout: "tabs",
            fields: {
              billingDetails: {
                address: "never",
              },
            },
          }}
        />
      </div>

      {/* Skeleton pendant le chargement de l'iframe Stripe */}
      {!elementsReady && (
        <div className="space-y-3 animate-pulse">
          <div className="h-10 bg-gray-100 rounded-lg" />
          <div className="h-10 bg-gray-100 rounded-lg" />
          <div className="flex gap-3">
            <div className="h-10 bg-gray-100 rounded-lg flex-1" />
            <div className="h-10 bg-gray-100 rounded-lg flex-1" />
          </div>
        </div>
      )}

      {/* Mention sécurité */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
        <svg
          className="w-3.5 h-3.5 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        Paiement 100 % sécurisé · Chiffrement SSL par{" "}
        <a
          href="https://stripe.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-600"
        >
          Stripe
        </a>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="flex gap-3 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <svg
            className="w-4 h-4 mt-0.5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Bouton payer */}
      <button
        onClick={handlePay}
        disabled={!stripe || !elements || loading || !elementsReady}
        className="w-full py-4 rounded-xl font-bold text-white bg-brand-500 hover:bg-brand-600
                   disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                   flex items-center justify-center gap-2.5
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        {loading ? (
          <>
            <svg
              className="w-5 h-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Traitement en cours…
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
            {montantTotal ? `Payer ${formatPrix(montantTotal)}` : "Payer"}
          </>
        )}
      </button>
    </div>
  );
}

// ─── PaymentStep (composant parent avec récapitulatif + Elements) ─────────────

interface Props {
  clientSecret: string;
  artisan: Tartisan;
  service: TService;
  date: string;
  slot: TSlot;
  adresse: string;
  onSuccess: (reservationId: string) => void;
  onBack: () => void;
}

export default function PaymentStep({
  clientSecret,
  artisan,
  service,
  date,
  slot,
  adresse,
  onSuccess,
  onBack,
}: Props) {
  // Apparence Stripe cohérente avec le design de l'application
  const stripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: "stripe" as const,
      variables: {
        borderRadius: "12px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        fontSizeBase: "14px",
        colorPrimary: "#7C3AED",
        colorDanger: "#DC2626",
        colorBackground: "#ffffff",
        colorText: "#111827",
        colorTextPlaceholder: "#9CA3AF",
      },
      rules: {
        ".Input": {
          border: "2px solid #E5E7EB",
          boxShadow: "none",
          padding: "12px 16px",
        },
        ".Input:focus": {
          border: "2px solid #7C3AED",
          boxShadow: "0 0 0 3px rgba(124,58,237,0.15)",
        },
        ".Label": {
          fontWeight: "600",
          color: "#374151",
          marginBottom: "6px",
        },
        ".Tab": {
          border: "2px solid #E5E7EB",
          borderRadius: "10px",
        },
        ".Tab--selected": {
          border: "2px solid #7C3AED",
          color: "#7C3AED",
        },
      },
    },
  };

  const fullName =
    `${artisan.prenom ?? ""} ${artisan.nom ?? ""}`.trim();

  const reservationData: ReservationData = {
    artisanId: artisan.id,
    serviceId: service.id,
    date,
    heureDebut: `${slot.debut}:00`,
    heureFin: `${slot.fin}:00`,
    adresse,
    montantTotal: service.prix,
  };

  const commission = service.prix ? service.prix * 0.1 : null;

  return (
    <div>
      {/* ── En-tête ── */}
      <div className="flex items-center gap-2 mb-1">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Retour à la confirmation"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">Paiement sécurisé</h1>
      </div>
      <p className="text-sm text-gray-500 mb-5 ml-9">
        Entrez vos informations bancaires pour confirmer la réservation.
      </p>

      {/* ── Récapitulatif de commande ── */}
      <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 mb-6 space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Service</span>
          <span className="font-medium text-gray-900 text-right max-w-[55%] leading-tight">
            {service.titre}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">artisan</span>
          <span className="font-medium text-gray-900">{fullName}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Date</span>
          <span className="font-medium text-gray-900 capitalize">
            {formatDate(date)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Créneau</span>
          <span className="font-medium text-gray-900">
            {slot.debut} → {slot.fin}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Adresse</span>
          <span className="font-medium text-gray-900 text-right max-w-[55%] leading-tight">
            {adresse}
          </span>
        </div>
        <div className="pt-2 border-t border-gray-200 space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-xs">
              Commission plateforme (10 %)
            </span>
            <span className="text-gray-400 text-xs">{formatPrix(commission)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-800">Total à payer</span>
            <span className="font-bold text-xl text-gray-900">
              {formatPrix(service.prix)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Formulaire Stripe Elements ── */}
      <Elements stripe={stripePromise} options={stripeElementsOptions}>
        <CheckoutForm
          clientSecret={clientSecret}
          reservationData={reservationData}
          montantTotal={service.prix}
          onSuccess={onSuccess}
        />
      </Elements>
    </div>
  );
}

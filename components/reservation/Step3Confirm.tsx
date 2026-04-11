"use client";

import { useState } from "react";
import Link from "next/link";
import type { Tartisan, TService, TSlot } from "./ReservationTunnel";
import PaymentStep from "./PaymentStep";

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

function formatDuree(minutes: number | null): string {
  if (!minutes) return "Durée variable";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

// ─── Ligne du récapitulatif ───────────────────────────────────────────────────

function RecapRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-4 text-sm ${
        highlight ? "pt-3 border-t border-gray-100" : ""
      }`}
    >
      <span className="text-gray-500 shrink-0">{label}</span>
      <span
        className={`font-medium text-right ${
          highlight
            ? "text-lg font-bold text-gray-900"
            : "text-gray-900"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Vue succès ───────────────────────────────────────────────────────────────

function SuccessView({
  reservationId,
  fullName,
  artisanId,
  service,
  date,
  slot,
  wasPaid,
  isGuest,
  guestEmail,
}: {
  reservationId: string;
  fullName: string;
  artisanId: string;
  service: TService;
  date: string;
  slot: TSlot;
  wasPaid: boolean;
  isGuest: boolean;
  guestEmail: string;
}) {
  const [accountEmail, setAccountEmail] = useState(guestEmail);
  const [accountSent, setAccountSent] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);

  async function handleCreateAccount() {
    if (!accountEmail.trim()) return;
    setAccountLoading(true);
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signInWithOtp({
      email: accountEmail.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setAccountSent(true);
    setAccountLoading(false);
  }
  return (
    <div className="text-center py-8">
      {/* Icône succès */}
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
        <svg
          className="w-10 h-10 text-green-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {wasPaid ? "Paiement confirmé !" : "Demande envoyée !"}
      </h2>
      <p className="text-gray-500 leading-relaxed mb-1">
        {wasPaid
          ? "Votre paiement a été accepté et votre demande transmise à "
          : "Votre demande a été transmise à "}
        <span className="font-semibold text-gray-700">{fullName}</span>.
      </p>
      <p className="text-gray-500 text-sm mb-7">
        {wasPaid
          ? "Vous recevrez un email de confirmation. Le artisan vous contactera pour confirmer le créneau."
          : "Vous serez notifié dès que le artisan confirme votre créneau."}
      </p>

      {/* Mini récapitulatif */}
      <div className="bg-gray-50 rounded-xl p-4 text-left mb-7 text-sm space-y-2">
        <p className="text-xs text-gray-400 font-mono uppercase tracking-wide mb-1">
          Réf. {reservationId.slice(0, 8).toUpperCase()}
        </p>
        <p className="font-semibold text-gray-800">{service.titre}</p>
        <p className="text-gray-500 capitalize">{formatDate(date)}</p>
        <p className="text-gray-500">
          {slot.debut} → {slot.fin}
          {service.duree_minutes && ` (${formatDuree(service.duree_minutes)})`}
        </p>
        {wasPaid && service.prix && (
          <p className="font-medium text-gray-800 pt-1 border-t border-gray-200">
            Payé : {formatPrix(service.prix)}
          </p>
        )}
      </div>

      {/* CTA création de compte pour les guests */}
      {isGuest && (
        <div className="mt-6 bg-brand-50 border border-brand-200 rounded-xl p-5 text-left">
          {accountSent ? (
            <div className="text-center">
              <p className="text-sm font-semibold text-brand-700 mb-1">Lien envoyé !</p>
              <p className="text-xs text-brand-600">Vérifiez votre boîte email pour créer votre mot de passe.</p>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-gray-900 mb-1">Créez votre compte Manobra</p>
              <p className="text-xs text-gray-500 mb-3">
                Retrouvez cette réservation et recontactez votre artisan en un clic.
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                <button
                  onClick={handleCreateAccount}
                  disabled={accountLoading || !accountEmail.trim()}
                  className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors whitespace-nowrap"
                >
                  {accountLoading ? "Envoi…" : "Créer mon compte"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
        {!isGuest && (
          <Link
            href="/dashboard/reservations"
            className="px-6 py-3 rounded-xl font-semibold text-white bg-brand-500 hover:bg-brand-600 transition-colors"
          >
            Voir mes réservations
          </Link>
        )}
        <Link
          href={`/prestataires/${artisanId}`}
          className="px-6 py-3 rounded-xl font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          Retour au profil
        </Link>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

type LocalStep = "address" | "payment";

interface Props {
  artisan: Tartisan;
  service: TService;
  date: string;
  slot: TSlot;
  onBack: () => void;
  isGuest: boolean;
}

export default function Step3Confirm({
  artisan,
  service,
  date,
  slot,
  onBack,
  isGuest,
}: Props) {
  const [localStep, setLocalStep] = useState<LocalStep>("address");
  const [adresse, setAdresse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [guestNom, setGuestNom] = useState("");
  const [guestTelephone, setGuestTelephone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  const fullName = `${artisan.prenom ?? ""} ${artisan.nom ?? ""}`.trim();

  // Services payants (prix > 0) → flux Stripe
  // Services gratuits ou sur devis → flux direct sans paiement
  const hasPrix = service.prix !== null && service.prix > 0;

  // ── Continuer depuis le formulaire d'adresse ──────────────────────────────
  async function handleContinue() {
    if (!adresse.trim()) {
      setError("Veuillez saisir l'adresse d'intervention.");
      return;
    }
    if (isGuest && !guestTelephone.trim() && !guestEmail.trim()) {
      setError("Veuillez saisir au moins un téléphone ou un email pour être contacté.");
      return;
    }

    setLoading(true);
    setError(null);

    if (!hasPrix) {
      // ── Pas de paiement : réservation directe ──────────────────────────
      await handleDirectConfirm();
      return;
    }

    // ── Paiement requis : création du PaymentIntent ────────────────────────
    try {
      const res = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artisanId: artisan.id,
          montantTotal: service.prix,
        }),
      });

      const json = (await res.json()) as {
        clientSecret?: string;
        error?: string;
      };

      if (!res.ok) {
        setError(
          json.error ??
            "Impossible d'initialiser le paiement. Veuillez réessayer."
        );
        setLoading(false);
        return;
      }

      if (!json.clientSecret) {
        setError("Réponse inattendue du serveur. Veuillez réessayer.");
        setLoading(false);
        return;
      }

      setClientSecret(json.clientSecret);
      setLocalStep("payment");
    } catch {
      setError("Impossible de contacter le serveur. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  }

  // ── Réservation directe (services gratuits / sur devis) ───────────────────
  async function handleDirectConfirm() {
    try {
      const res = await fetch("/api/reservations/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artisanId: artisan.id,
          serviceId: service.id,
          date,
          heureDebut: `${slot.debut}:00`,
          heureFin: `${slot.fin}:00`,
          adresse: adresse.trim(),
          montantTotal: service.prix,
          ...(isGuest && {
            guestNom: guestNom.trim() || undefined,
            guestTelephone: guestTelephone.trim() || undefined,
            guestEmail: guestEmail.trim() || undefined,
          }),
        }),
      });

      const json = (await res.json()) as {
        reservationId?: string;
        error?: string;
      };

      if (!res.ok) {
        setError(json.error ?? "Une erreur est survenue. Veuillez réessayer.");
        return;
      }

      setReservationId(json.reservationId ?? "");
    } catch {
      setError("Impossible de contacter le serveur. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  }

  // ── Écran de succès ────────────────────────────────────────────────────────
  if (reservationId) {
    return (
      <SuccessView
        reservationId={reservationId}
        fullName={fullName}
        artisanId={artisan.id}
        service={service}
        date={date}
        slot={slot}
        wasPaid={hasPrix}
        isGuest={isGuest}
        guestEmail={guestEmail}
      />
    );
  }

  // ── Étape paiement (Stripe Elements) ──────────────────────────────────────
  if (localStep === "payment" && clientSecret) {
    return (
      <PaymentStep
        clientSecret={clientSecret}
        artisan={artisan}
        service={service}
        date={date}
        slot={slot}
        adresse={adresse.trim()}
        onSuccess={(id) => setReservationId(id)}
        onBack={() => {
          setLocalStep("address");
          setClientSecret(null);
          setError(null);
        }}
      />
    );
  }

  // ── Étape adresse ─────────────────────────────────────────────────────────
  return (
    <div>
      {/* En-tête */}
      <div className="flex items-center gap-2 mb-1">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Retour"
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
        <h1 className="text-xl font-bold text-gray-900">
          Confirmez votre réservation
        </h1>
      </div>
      <p className="text-sm text-gray-500 mb-6 ml-9">
        Vérifiez les détails avant{" "}
        {hasPrix ? "de procéder au paiement." : "d'envoyer votre demande."}
      </p>

      {/* Récapitulatif */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5 space-y-3">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
          Récapitulatif
        </h2>
        <RecapRow label="artisan" value={fullName} />
        <RecapRow label="Service" value={service.titre} />
        <RecapRow
          label="Date"
          value={formatDate(date).replace(/^\w/, (c) => c.toUpperCase())}
        />
        <RecapRow
          label="Horaire"
          value={`${slot.debut} → ${slot.fin} (${formatDuree(service.duree_minutes)})`}
        />
        <RecapRow
          label={hasPrix ? "Total à payer" : "Prix"}
          value={formatPrix(service.prix)}
          highlight
        />
      </div>

      {/* Adresse d'intervention */}
      {/* Champs guest */}
      {isGuest && (
        <div className="mb-5 space-y-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Votre nom
            </label>
            <input
              type="text"
              value={guestNom}
              onChange={(e) => setGuestNom(e.target.value)}
              placeholder="Jean Dupont"
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent hover:border-gray-300"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Téléphone <span className="text-gray-400 font-normal text-xs">(recommandé)</span>
            </label>
            <input
              type="tel"
              value={guestTelephone}
              onChange={(e) => setGuestTelephone(e.target.value)}
              placeholder="06 12 34 56 78"
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent hover:border-gray-300"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Email <span className="text-gray-400 font-normal text-xs">(recommandé)</span>
            </label>
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="jean@exemple.com"
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent hover:border-gray-300"
            />
          </div>
          {guestTelephone.trim() && guestEmail.trim() && (
            <p className="text-xs text-green-600">Parfait, vous serez joignable par téléphone et email.</p>
          )}
          {guestTelephone.trim() && !guestEmail.trim() && (
            <p className="text-xs text-gray-500">Ajoutez votre email pour recevoir une confirmation écrite.</p>
          )}
          {!guestTelephone.trim() && guestEmail.trim() && (
            <p className="text-xs text-gray-500">Ajoutez votre téléphone pour que l'artisan puisse vous contacter directement.</p>
          )}
          <p className="text-xs text-red-500">* Au moins un téléphone ou un email est requis.</p>
        </div>
      )}

      <div className="mb-5">
        <label
          htmlFor="adresse"
          className="block text-sm font-semibold text-gray-700 mb-1.5"
        >
          Adresse d&apos;intervention{" "}
          <span className="text-red-500" aria-hidden>
            *
          </span>
        </label>
        <textarea
          id="adresse"
          value={adresse}
          onChange={(e) => {
            setAdresse(e.target.value);
            if (error && e.target.value.trim()) setError(null);
          }}
          placeholder="Ex : 12 rue de la Paix, 75001 Paris"
          rows={2}
          className={`w-full rounded-xl border-2 px-4 py-3 text-sm resize-none transition
                      focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent ${
            error && !adresse.trim()
              ? "border-red-300 bg-red-50"
              : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        />
        <p className="text-xs text-gray-400 mt-1.5">
          Indiquez où le artisan devra intervenir.
        </p>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="mb-4 flex gap-3 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
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

      {/* Info contextuelle */}
      <div className="mb-6 flex gap-3 p-3.5 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-700">
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
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>
          {hasPrix
            ? "Votre paiement sera encaissé immédiatement et sécurisé par Stripe. Le artisan confirmera ensuite votre créneau."
            : "Votre demande sera transmise au artisan. Vous serez contacté pour définir les modalités."}
        </span>
      </div>

      {/* Bouton principal */}
      <button
        onClick={handleContinue}
        disabled={loading}
        className="w-full py-4 rounded-xl font-bold text-white bg-brand-500 hover:bg-brand-600
                   disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                   flex items-center justify-center gap-2.5
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        {loading ? (
          <>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
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
            {hasPrix ? "Initialisation du paiement…" : "Envoi en cours…"}
          </>
        ) : hasPrix ? (
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
            Procéder au paiement · {formatPrix(service.prix)}
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
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            Envoyer la demande de réservation
          </>
        )}
      </button>
    </div>
  );
}

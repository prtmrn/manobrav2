"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const NOTE_LABELS = ["", "Très insatisfait", "Insatisfait", "Correct", "Satisfait", "Excellent !"];

interface Props {
  reservationId: string;
  artisanNom: string;
}

export default function StarRatingForm({ reservationId, artisanNom }: Props) {
  const router = useRouter();
  const [note, setNote]         = useState(0);
  const [hovered, setHovered]   = useState(0);
  const [commentaire, setCommentaire] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // ─── Soumission ──────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (note === 0) {
      setError("Veuillez sélectionner une note avant d'envoyer.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/avis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservation_id: reservationId, note, commentaire }),
      });

      if (res.ok) {
        setSubmitted(true);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "Une erreur est survenue. Veuillez réessayer.");
      }
    } catch {
      setError("Impossible de contacter le serveur. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  }

  // ─── État succès ─────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
          <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Merci pour votre avis !</h2>
        <p className="text-gray-500 text-sm mb-1">
          Votre avis sur <span className="font-semibold text-gray-700">{artisanNom}</span> a bien été enregistré.
        </p>
        <p className="text-gray-400 text-xs mb-8">
          Il sera visible sur la page publique du artisan dans quelques instants.
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700
                     text-white font-semibold text-sm transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Retour au tableau de bord
        </button>
      </div>
    );
  }

  // ─── Formulaire ──────────────────────────────────────────────────────────

  const activeNote = hovered || note;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* ── Sélection étoiles ────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Votre note <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-400 mb-4">Cliquez sur une étoile pour noter</p>

        <div className="flex items-center gap-2 mb-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setNote(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="transition-transform hover:scale-125 focus:outline-none focus:scale-125"
              aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
            >
              <svg
                className={`w-12 h-12 transition-colors duration-100 ${
                  activeNote >= star ? "text-yellow-400" : "text-gray-200"
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          ))}
        </div>

        {/* Label de la note active */}
        <div className="h-6">
          {activeNote > 0 && (
            <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full
              ${activeNote <= 2 ? "bg-red-50 text-red-600"
              : activeNote === 3 ? "bg-amber-50 text-amber-600"
              : "bg-green-50 text-green-600"}`}
            >
              {activeNote <= 2 && "😕"}
              {activeNote === 3 && "😐"}
              {activeNote >= 4 && "😊"}
              {NOTE_LABELS[activeNote]}
            </span>
          )}
        </div>
      </div>

      {/* ── Commentaire ─────────────────────────────────────────────────── */}
      <div>
        <label
          htmlFor="commentaire"
          className="block text-sm font-semibold text-gray-700 mb-1"
        >
          Votre commentaire{" "}
          <span className="font-normal text-gray-400">(optionnel)</span>
        </label>
        <p className="text-xs text-gray-400 mb-2">
          Décrivez votre expérience pour aider d&apos;autres clients.
        </p>
        <textarea
          id="commentaire"
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          placeholder={`Comment s'est passée votre prestation avec ${artisanNom} ?`}
          rows={4}
          maxLength={1000}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800
                     placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500
                     focus:border-transparent resize-none transition-shadow"
        />
        <p className="text-right text-xs text-gray-300 mt-1">{commentaire.length}/1000</p>
      </div>

      {/* ── Erreur ──────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* ── Bouton envoi ────────────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={loading || note === 0}
        className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800
                   text-white font-bold text-sm transition-colors shadow-sm
                   disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Envoi en cours…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Envoyer mon avis
          </>
        )}
      </button>
    </form>
  );
}

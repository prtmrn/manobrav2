"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  reservationId: string;
  reservationStatut: string;
  conversationId: string;
}

export default function ArtisanChatActions({ reservationId, reservationStatut, conversationId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function changeStatut(statut: string) {
    setLoading(statut);
    await fetch(`/api/reservations/${reservationId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut }),
    });
    setLoading(null);
    router.refresh();
  }

  async function sendVideoCall() {
    setLoading("video");
    const roomName = `manobra-${conversationId.slice(0, 8)}`;
    const videoUrl = `https://meet.jit.si/${roomName}`;
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_id: conversationId,
        type: "texte",
        contenu: `Appel vidéo pour diagnostic : ${videoUrl}`,
      }),
    });
    setLoading(null);
    window.open(videoUrl, "_blank");
  }

  if (!["en_attente", "confirme", "en_cours"].includes(reservationStatut)) return null;

  return (
    <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-2 flex-wrap">
      {reservationStatut === "en_attente" && (
        <>
          <button
            onClick={() => changeStatut("confirme")}
            disabled={loading !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
          >
            {loading === "confirme" ? "..." : "Accepter"}
          </button>
          <button
            onClick={() => changeStatut("annule")}
            disabled={loading !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold disabled:opacity-50 transition-colors"
          >
            {loading === "annule" ? "..." : "Refuser"}
          </button>
        </>
      )}
      {reservationStatut === "confirme" && (
        <button
          onClick={() => changeStatut("en_cours")}
          disabled={loading !== null}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
        >
          {loading === "en_cours" ? "..." : "Démarrer"}
        </button>
      )}
      {reservationStatut === "en_cours" && (
        <button
          onClick={() => changeStatut("termine")}
          disabled={loading !== null}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
        >
          {loading === "termine" ? "..." : "Terminer"}
        </button>
      )}
      <button
        onClick={sendVideoCall}
        disabled={loading !== null}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold disabled:opacity-50 transition-colors"
        title="Proposer un appel vidéo pour le diagnostic"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        {loading === "video" ? "..." : "Appel vidéo diagnostic"}
      </button>
    </div>
  );
}

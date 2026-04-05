"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  reservationId: string;
}

export default function CancelButton({ reservationId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    if (!confirm("Êtes-vous sûr(e) de vouloir annuler cette réservation ?")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/reservations/${reservationId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: "annule" }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error ?? "Erreur lors de l'annulation. Veuillez réessayer.");
      }
    } catch {
      alert("Impossible de contacter le serveur. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleCancel}
      disabled={loading}
      className="text-xs font-semibold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg
                 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                 border border-red-200 hover:border-red-300"
    >
      {loading ? "Annulation…" : "Annuler"}
    </button>
  );
}

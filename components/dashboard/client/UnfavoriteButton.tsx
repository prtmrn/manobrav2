"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  artisanId: string;
  artisanNom: string;
}

export default function UnfavoriteButton({ artisanId, artisanNom }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleUnfavorite() {
    if (!confirm(`Retirer ${artisanNom} de vos favoris ?`)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/favoris/${artisanId}`, { method: "DELETE" });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error ?? "Erreur lors de la suppression.");
      }
    } catch {
      alert("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleUnfavorite}
      disabled={loading}
      title="Retirer des favoris"
      aria-label="Retirer des favoris"
      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50
                 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {loading ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd"
            d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
            clipRule="evenodd" />
        </svg>
      )}
    </button>
  );
}

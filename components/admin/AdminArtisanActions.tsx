"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminArtisanActions({ artisanId, actif }: { artisanId: string; actif: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    await fetch("/api/admin/artisans/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artisanId, actif: !actif }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-50 ${
        actif
          ? "border-red-800 text-red-400 hover:bg-red-900/30"
          : "border-green-800 text-green-400 hover:bg-green-900/30"
      }`}
    >
      {loading ? "..." : actif ? "Désactiver" : "Activer"}
    </button>
  );
}

import { createClient } from "@/lib/supabase/server";
import MapView from "@/components/map/MapView";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Carte des artisans | Manobra",
  description:
    "Trouvez des artisans de services à domicile près de chez vous sur la carte interactive.",
};

// Revalidate every 5 minutes so the map stays fresh without being fully dynamic
export const revalidate = 300;

export default async function MapPage() {
  const supabase = await createClient();

  const { data: artisans, error } = await supabase
    .from("profiles_artisans")
    .select(
      "id, nom, prenom, metier, ville, photo_url, note_moyenne, latitude, longitude"
    )
    .eq("actif", true)
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("note_moyenne", { ascending: false });

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Impossible de charger la carte
          </h1>
          <p className="text-gray-500 text-sm mb-6">{error.message}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  const count = artisans?.length ?? 0;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      {/* ── Top navigation bar ──────────────────────────────────────────────── */}
      <header className="flex-shrink-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 z-20">
        {/* Left: Logo + title */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-brand-600 font-bold text-lg hover:text-brand-700 transition-colors"
          >
            
            <span className="hidden sm:inline">Manobra</span>
          </Link>
          <span className="text-gray-200 font-light text-xl hidden sm:block">
            |
          </span>
          <h1 className="text-sm font-semibold text-gray-700 hidden sm:block">
            Carte des artisans
          </h1>
        </div>

        {/* Right: Count + links */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full font-medium">
            {count === 0
              ? "Aucun artisan"
              : `${count} artisan${count > 1 ? "s" : ""} actif${count > 1 ? "s" : ""}`}
          </span>
          <Link
            href="/dashboard/client"
            className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
          >
            Mon espace
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </header>

      {/* ── Map area (fills remaining height) ─────────────────────────────── */}
      <main className="flex-1 relative">
        {count === 0 ? (
          /* Empty state */
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center px-6 py-12 max-w-sm">
              <div className="text-6xl mb-4">🗺️</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Aucun artisan sur la carte
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                Aucun artisan actif avec une adresse géolocalisée n&apos;a
                encore été trouvé. Revenez bientôt&nbsp;!
              </p>
            </div>
          </div>
        ) : (
          <MapView artisans={artisans} />
        )}
      </main>
    </div>
  );
}

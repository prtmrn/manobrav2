"use client";

import dynamic from "next/dynamic";
import type { artisanPinData } from "@/components/map/MapView";

// MapView uses @vis.gl/react-google-maps which relies on browser APIs → ssr: false
const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-2xl">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <svg
          className="w-10 h-10 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
        <p className="text-sm font-medium">Chargement de la carte…</p>
      </div>
    </div>
  ),
});

interface SearchMapViewProps {
  artisans: artisanPinData[];
}

export default function SearchMapView({ artisans }: SearchMapViewProps) {
  if (artisans.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
        <div className="text-center">
          <svg
            className="w-12 h-12 text-gray-300 mx-auto mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <p className="text-sm font-medium text-gray-500">
            Aucun artisan à afficher sur la carte
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Les artisans sans coordonnées GPS ne sont pas visibles ici
          </p>
        </div>
      </div>
    );
  }

  return <MapView artisans={artisans} />;
}

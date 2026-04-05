"use client";

import Image from "next/image";

import { useState } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useAdvancedMarkerRef,
} from "@vis.gl/react-google-maps";
import Link from "next/link";
import { getMetierConfig } from "./metier-config";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface artisanPinData {
  id: string;
  nom: string | null;
  prenom: string | null;
  metier: string | null;
  ville: string | null;
  photo_url: string | null;
  note_moyenne: number | null;
  latitude: number;
  longitude: number;
}

// ─── Star Rating ─────────────────────────────────────────────────────────────

function StarRating({ note }: { note: number | null }) {
  const rating = note ?? 0;
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;

  return (
    <div className="flex items-center gap-1 mt-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-3.5 h-3.5 flex-shrink-0 ${
            star <= full
              ? "text-yellow-400"
              : star === full + 1 && hasHalf
              ? "text-yellow-300"
              : "text-gray-300"
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="text-xs text-gray-500 ml-0.5">
        {rating > 0 ? rating.toFixed(1) : "Pas encore noté"}
      </span>
    </div>
  );
}

// ─── Single Marker + InfoWindow ──────────────────────────────────────────────

function PrestaireMarker({
  artisan,
  selectedId,
  onSelect,
}: {
  artisan: artisanPinData;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const config = getMetierConfig(artisan.metier);
  const isSelected = selectedId === artisan.id;
  const initials = (artisan.prenom?.[0] ?? "?").toUpperCase();

  return (
    <>
      {/* Custom HTML marker pin */}
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: artisan.latitude, lng: artisan.longitude }}
        onClick={() => onSelect(isSelected ? null : artisan.id)}
        title={`${artisan.prenom ?? ""} ${artisan.nom ?? ""} — ${artisan.metier ?? "artisan"}`}
        zIndex={isSelected ? 100 : 1}
      >
        <div
          style={{
            backgroundColor: config.color,
            transform: isSelected ? "scale(1.15)" : "scale(1)",
            transition: "transform 0.15s ease",
            boxShadow: isSelected
              ? `0 0 0 3px white, 0 0 0 5px ${config.color}`
              : "0 2px 6px rgba(0,0,0,0.3)",
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-white text-xs font-semibold cursor-pointer border-2 border-white"
        >
          <span className="text-sm leading-none">{config.emoji}</span>
          <span className="max-w-[80px] truncate">
            {artisan.prenom ?? artisan.metier ?? "Pro"}
          </span>
        </div>
      </AdvancedMarker>

      {/* InfoWindow anchored to the marker */}
      {isSelected && marker && (
        <InfoWindow
          anchor={marker}
          onCloseClick={() => onSelect(null)}
          maxWidth={300}
          headerDisabled
        >
          <div className="font-sans p-1 min-w-[220px]">
            {/* Header: photo + name */}
            <div className="flex items-center gap-3 mb-3">
              {artisan.photo_url ? (
                <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border-2 border-white shadow">
                  <Image
                    src={artisan.photo_url}
                    alt={artisan.prenom + " " + artisan.nom}
                    fill
                    sizes="56px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0 border-2 border-white shadow"
                  style={{ backgroundColor: config.color }}
                >
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-gray-900 text-sm leading-tight truncate">
                  {artisan.prenom} {artisan.nom}
                </p>
                <p
                  className="text-xs font-medium mt-0.5 flex items-center gap-1"
                  style={{ color: config.color }}
                >
                  <span>{config.emoji}</span>
                  <span>{artisan.metier ?? "Non spécifié"}</span>
                </p>
                <StarRating note={artisan.note_moyenne} />
              </div>
            </div>

            {/* Ville */}
            {artisan.ville && (
              <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                <svg
                  className="w-3 h-3 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                    clipRule="evenodd"
                  />
                </svg>
                {artisan.ville}
              </p>
            )}

            {/* CTA */}
            <Link
              href={`/artisans/${artisan.id}`}
              className="block w-full text-center text-white text-xs font-semibold py-2 px-4 rounded-lg transition-opacity hover:opacity-90"
              style={{ backgroundColor: config.color }}
            >
              Voir le profil →
            </Link>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

// ─── Legend ──────────────────────────────────────────────────────────────────

import { METIER_CONFIG } from "./metier-config";

function MapLegend({ activeMetiers }: { activeMetiers: Set<string> }) {
  if (activeMetiers.size === 0) return null;

  return (
    <div className="absolute bottom-8 left-4 z-10 bg-white rounded-xl shadow-lg border border-gray-200 p-3 max-w-[180px]">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        Légende
      </p>
      <div className="flex flex-col gap-1.5">
        {Object.entries(METIER_CONFIG)
          .filter(([key]) => activeMetiers.has(key))
          .map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: cfg.color }}
              />
              <span className="text-xs text-gray-700 truncate">{cfg.label}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

// ─── Main MapView ─────────────────────────────────────────────────────────────

export default function MapView({
  artisans,
}: {
  artisans: artisanPinData[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";
  const mapId =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

  // Collect métiers actually present on the map for the legend
  const activeMetiers = new Set(
    artisans.map((p) => p.metier ?? "Autre")
  );

  return (
    <div className="relative w-full h-full">
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={{ lat: 48.8566, lng: 2.3522 }}
          defaultZoom={6}
          mapId={mapId}
          className="w-full h-full"
          gestureHandling="greedy"
          disableDefaultUI={false}
          clickableIcons={false}
        >
          {artisans.map((p) => (
            <PrestaireMarker
              key={p.id}
              artisan={p}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ))}
        </Map>
      </APIProvider>

      {/* Floating legend */}
      <MapLegend activeMetiers={activeMetiers} />
    </div>
  );
}

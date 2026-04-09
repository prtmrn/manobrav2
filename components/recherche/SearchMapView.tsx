"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { getMetierConfig } from "@/components/map/metier-config";

export interface ArtisanCard {
  id: string;
  nom: string | null;
  prenom: string | null;
  metier: string | null;
  ville: string | null;
  photo_url: string | null;
  note_moyenne: number;
  nombre_avis: number;
  latitude: number | null;
  longitude: number | null;
  prixMin: number | null;
  disponible_urgence?: boolean;
}

interface SearchMapViewProps {
  artisans: ArtisanCard[];
  modeUrgence?: boolean;
}

function StarRow({ note }: { note: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <svg key={s} className={`w-3 h-3 ${s <= Math.round(note) ? "text-yellow-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      ))}
    </div>
  );
}

function ArtisanListCard({ artisan, onClick, selected }: { artisan: ArtisanCard; onClick: () => void; selected: boolean }) {
  const nom = `${artisan.prenom ?? ""} ${artisan.nom ?? ""}`.trim() || "Artisan";
  const config = getMetierConfig(artisan.metier ?? "Autre");
  const initials = nom.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
        selected ? "border-brand-500 bg-brand-50" : "border-gray-100 bg-white hover:border-brand-200 hover:shadow-sm"
      }`}
    >
      {artisan.photo_url ? (
        <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
          <Image src={artisan.photo_url} alt={nom} fill className="object-cover" unoptimized />
        </div>
      ) : (
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
          style={{ backgroundColor: config.color }}>
          {initials}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">{nom}</p>
        <p className="text-xs text-gray-500">{config.label}</p>
        <div className="flex items-center gap-2 mt-1">
          {artisan.note_moyenne > 0 && (
            <>
              <StarRow note={artisan.note_moyenne} />
              <span className="text-xs text-gray-500">({artisan.nombre_avis})</span>
            </>
          )}
          {artisan.prixMin && (
            <span className="text-xs font-medium text-brand-600">
              dès {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(artisan.prixMin)}
            </span>
          )}
        </div>
      </div>
      {artisan.disponible_urgence && (
        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Disponible en urgence" />
      )}
    </div>
  );
}

function ArtisanDetail({ artisan, onBack }: { artisan: ArtisanCard; onBack: () => void }) {
  const nom = `${artisan.prenom ?? ""} ${artisan.nom ?? ""}`.trim() || "Artisan";
  const config = getMetierConfig(artisan.metier ?? "Autre");
  const initials = nom.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="flex flex-col h-full">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-brand-600 font-medium mb-4 hover:text-brand-700">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Retour à la liste
      </button>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-center gap-4">
          {artisan.photo_url ? (
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0">
              <Image src={artisan.photo_url} alt={nom} fill className="object-cover" unoptimized />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-white font-bold text-lg"
              style={{ backgroundColor: config.color }}>
              {initials}
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-gray-900">{nom}</h2>
            <p className="text-sm text-gray-500">{config.label}</p>
            {artisan.ville && <p className="text-xs text-gray-400 mt-0.5">{artisan.ville}</p>}
          </div>
        </div>

        {artisan.note_moyenne > 0 && (
          <div className="flex items-center gap-2">
            <StarRow note={artisan.note_moyenne} />
            <span className="text-sm font-semibold text-gray-700">{artisan.note_moyenne.toFixed(1)}</span>
            <span className="text-sm text-gray-400">({artisan.nombre_avis} avis)</span>
          </div>
        )}

        {artisan.prixMin && (
          <p className="text-sm text-gray-600">
            À partir de <span className="font-semibold text-brand-600">
              {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(artisan.prixMin)}
            </span>
          </p>
        )}

        {artisan.disponible_urgence && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
            <span className="text-sm font-medium text-red-700">Disponible en urgence</span>
          </div>
        )}

        <Link href={`/prestataires/${artisan.id}`}
          className="block w-full text-center bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition-colors">
          Demander une intervention
        </Link>
      </div>
    </div>
  );
}

export default function SearchMapView({ artisans, modeUrgence = false }: SearchMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [selectedArtisan, setSelectedArtisan] = useState<ArtisanCard | null>(null);
  const [view, setView] = useState<"liste" | "carte">("carte");
  const artisansAvecCoords: ArtisanCard[] = artisans.filter(a => a.latitude && a.longitude);

  const handleSelectArtisan = useCallback((artisan: ArtisanCard) => {
    setSelectedArtisan(artisan);
    // Centrer la carte sur l'artisan
    if (mapInstanceRef.current && artisan.latitude && artisan.longitude) {
      mapInstanceRef.current.setView([artisan.latitude, artisan.longitude], 14);
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    import("leaflet").then((L) => {
      if (!mapRef.current) return;

      delete (L.Icon.Default.prototype as any)._getIconUrl;

      const map = L.map(mapRef.current, {
        center: [46.603354, 1.888334],
        zoom: 6,
        zoomControl: true,
      });
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      markersRef.current = [];

      artisansAvecCoords.forEach((artisan) => {
        const config = getMetierConfig(artisan.metier ?? "Autre");
        const isUrgence = modeUrgence && artisan.disponible_urgence;
        const color = isUrgence ? "#ef4444" : (modeUrgence ? "#d1d5db" : config.color);
        const nom = `${artisan.prenom ?? ""} ${artisan.nom ?? ""}`.trim() || "Artisan";

        const icon = L.divIcon({
          className: "",
          html: `
            <div style="
              width: 32px; height: 32px;
              background: ${color};
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              cursor: pointer;
              transition: transform 0.15s;
            "></div>
            <div style="
              width: 0; height: 0;
              border-left: 5px solid transparent;
              border-right: 5px solid transparent;
              border-top: 7px solid ${color};
              margin: 0 auto; margin-top: -2px;
            "></div>
          `,
          iconSize: [32, 39],
          iconAnchor: [16, 39],
          popupAnchor: [0, -39],
        });

        const marker = L.marker([artisan.latitude!, artisan.longitude!], { icon })
          .addTo(map);

        marker.on("click", () => {
          setSelectedArtisan(artisan);
          setView("liste");
        });

        markersRef.current.push(marker);
      });

      if (artisansAvecCoords.length > 0) {
        const bounds = L.latLngBounds(artisansAvecCoords.map(a => [a.latitude!, a.longitude!]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [artisans, modeUrgence]);

  return (
    <div className="flex flex-col h-full">
      {/* Toggle mobile Liste/Carte */}
      <div className="sm:hidden flex rounded-xl border border-gray-200 overflow-hidden mb-3 flex-shrink-0">
        <button onClick={() => setView("liste")}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${view === "liste" ? "bg-white text-gray-900" : "bg-brand-600 text-white"}`}>
          Liste
        </button>
        <button onClick={() => setView("carte")}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${view === "carte" ? "bg-brand-600 text-white" : "bg-white text-gray-900"}`}>
          Carte
        </button>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* ── LISTE GAUCHE (desktop) ou plein écran (mobile liste) ── */}
        <div className={`
          flex flex-col gap-2 overflow-y-auto
          sm:w-80 sm:flex-shrink-0
          ${view === "liste" ? "flex w-full" : "hidden sm:flex"}
        `}>
          {(() => {
            const selId = selectedArtisan?.id ?? null;
            if (selectedArtisan) {
              return <ArtisanDetail artisan={selectedArtisan} onBack={() => setSelectedArtisan(null)} />;
            }
            return (
              <>
                <p className="text-xs text-gray-400 flex-shrink-0">
                  {artisansAvecCoords.length} artisan{artisansAvecCoords.length > 1 ? "s" : ""} sur la carte
                </p>
                {artisansAvecCoords.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                    <p className="text-sm">Aucun artisan géolocalisé</p>
                  </div>
                ) : (
                  (artisansAvecCoords as ArtisanCard[]).map((a: ArtisanCard) => (
                    <ArtisanListCard
                      key={a.id}
                      artisan={a}
                      onClick={() => handleSelectArtisan(a)}
                      selected={selId === a.id}
                    />
                  ))
                )}
              </>
            );
          })()}
        </div>

        {/* ── CARTE DROITE ── */}
        <div className={`
          flex-1 rounded-2xl overflow-hidden min-h-0
          ${view === "carte" ? "flex w-full h-[calc(100vh-200px)]" : "hidden sm:flex sm:h-full"}
        `}>
          <div ref={mapRef} style={{ width: "100%", height: "100%", minHeight: "400px" }} />
        </div>
      </div>
    </div>
  );
}

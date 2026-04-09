"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { getMetierConfig } from "./metier-config";

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

interface MapViewProps {
  artisans: artisanPinData[];
}

export default function MapView({ artisans }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Import dynamique pour éviter SSR
    import("leaflet").then((L) => {
      // Fix icônes Leaflet avec Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // Centrer sur la France par défaut
      const map = L.map(mapRef.current!, {
        center: [46.603354, 1.888334],
        zoom: 6,
        zoomControl: true,
      });

      mapInstanceRef.current = map;

      // Tuiles OpenStreetMap
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© <a href=\'https://www.openstreetmap.org/copyright\'>OpenStreetMap</a>",
        maxZoom: 19,
      }).addTo(map);

      // Ajouter les marqueurs
      artisans.forEach((artisan) => {
        const config = getMetierConfig(artisan.metier ?? "Autre");
        const nom = `${artisan.prenom ?? ""} ${artisan.nom ?? ""}`.trim() || "Artisan";
        const note = artisan.note_moyenne;
        const stars = note ? "★".repeat(Math.round(note)) + "☆".repeat(5 - Math.round(note)) : "Pas encore noté";

        // Icône personnalisée colorée
        const icon = L.divIcon({
          className: "",
          html: `
            <div style="
              width: 36px;
              height: 36px;
              background: ${config.color};
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
              cursor: pointer;
            ">
            </div>
            <div style="
              width: 0;
              height: 0;
              border-left: 6px solid transparent;
              border-right: 6px solid transparent;
              border-top: 8px solid ${config.color};
              margin: 0 auto;
              margin-top: -2px;
            "></div>
          `,
          iconSize: [36, 44],
          iconAnchor: [18, 44],
          popupAnchor: [0, -44],
        });

        const popup = L.popup({
          maxWidth: 260,
          className: "manobra-popup",
        }).setContent(`
          <div style="font-family: system-ui, sans-serif; padding: 4px;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
              <div style="
                width: 40px; height: 40px; border-radius: 50%;
                background: ${config.color}22;
                display: flex; align-items: center; justify-content: center;
                font-size: 20px; flex-shrink: 0;
              "></div>
              <div>
                <p style="font-weight: 700; font-size: 14px; margin: 0; color: #111;">${nom}</p>
                <p style="font-size: 12px; color: #666; margin: 2px 0 0;">${config.label}</p>
                ${artisan.ville ? `<p style="font-size: 11px; color: #999; margin: 1px 0 0;">${artisan.ville}</p>` : ""}
              </div>
            </div>
            ${note ? `<p style="font-size: 12px; color: #f59e0b; margin: 0 0 8px;">${stars} ${note.toFixed(1)}/5</p>` : `<p style="font-size: 12px; color: #999; margin: 0 0 8px;">${stars}</p>`}
            <a href="/prestataires/${artisan.id}"
              style="
                display: block; text-align: center;
                background: #16a34a; color: white;
                padding: 8px 12px; border-radius: 8px;
                text-decoration: none; font-size: 13px; font-weight: 600;
              ">
              Voir le profil →
            </a>
          </div>
        `);

        L.marker([artisan.latitude, artisan.longitude], { icon })
          .bindPopup(popup)
          .addTo(map);
      });

      // Si artisans présents, adapter la vue
      if (artisans.length > 0) {
        const bounds = L.latLngBounds(artisans.map(a => [a.latitude, a.longitude]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      }
    });

    // Charger le CSS Leaflet
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [artisans]);

  return (
    <div
      ref={mapRef}
      style={{ width: "100%", height: "100%", minHeight: "500px" }}
    />
  );
}

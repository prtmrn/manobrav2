"use client";

import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { getMetierConfig } from "./metier-config";

interface MiniMapProps {
  lat: number;
  lng: number;
  metier: string | null;
  label?: string;
}

/**
 * Carte miniature non-interactive centrée sur la position du artisan.
 * Client Component (nécessite @vis.gl/react-google-maps).
 */
export default function MiniMap({ lat, lng, metier, label }: MiniMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";
  const config = getMetierConfig(metier);

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        defaultCenter={{ lat, lng }}
        defaultZoom={13}
        mapId={mapId}
        /* Non-interactive — consultatif uniquement */
        gestureHandling="none"
        disableDefaultUI
        className="w-full h-full"
        clickableIcons={false}
      >
        <AdvancedMarker
          position={{ lat, lng }}
          title={label ?? metier ?? "artisan"}
        >
          {/* Marker coloré par métier */}
          <div
            style={{
              backgroundColor: config.color,
              boxShadow: `0 2px 8px ${config.color}80`,
            }}
            className="flex items-center justify-center w-10 h-10 rounded-full border-3 border-white text-lg"
          >
          </div>
        </AdvancedMarker>
      </Map>
    </APIProvider>
  );
}

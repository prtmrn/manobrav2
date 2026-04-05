/**
 * Géocodage d'adresse via l'API Google Maps Geocoding.
 * Clé requise : GOOGLE_MAPS_GEOCODING_KEY dans .env.local (serveur uniquement, sans préfixe NEXT_PUBLIC_)
 *
 * @example
 * const coords = await geocodeAddress("12 rue de la Paix", "Paris", "75001");
 * // → { latitude: 48.8698, longitude: 2.3309 } ou null
 */

export interface GeocoderResult {
  latitude: number;
  longitude: number;
  formatted_address: string;
}

export async function geocodeAddress(
  adresse: string,
  ville: string,
  code_postal: string
): Promise<GeocoderResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_GEOCODING_KEY;

  if (!apiKey) {
    console.warn(
      "[geocoding] GOOGLE_MAPS_GEOCODING_KEY manquante — coordonnées ignorées."
    );
    return null;
  }

  const query = `${adresse}, ${code_postal} ${ville}, France`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;

  try {
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      console.error("[geocoding] Erreur HTTP :", res.status);
      return null;
    }

    const data = await res.json();

    if (data.status !== "OK" || !data.results?.length) {
      console.warn("[geocoding] Statut inattendu :", data.status, data.error_message ?? "");
      return null;
    }

    const { lat, lng } = data.results[0].geometry.location;
    return {
      latitude: lat,
      longitude: lng,
      formatted_address: data.results[0].formatted_address,
    };
  } catch (err) {
    console.error("[geocoding] Exception :", err);
    return null;
  }
}

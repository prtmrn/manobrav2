/**
 * Géocodage via Nominatim (OpenStreetMap) — gratuit, sans clé API.
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
  const query = `${adresse}, ${code_postal} ${ville}, France`;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": "Manobra/1.0 (contact@manobra.fr)",
        "Accept-Language": "fr",
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.length) {
      const fallback = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`${code_postal} ${ville}, France`)}&format=json&limit=1`,
        { cache: "no-store", headers: { "User-Agent": "Manobra/1.0 (contact@manobra.fr)" } }
      );
      const fd = await fallback.json();
      if (!fd?.length) return null;
      return { latitude: parseFloat(fd[0].lat), longitude: parseFloat(fd[0].lon), formatted_address: fd[0].display_name };
    }
    return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon), formatted_address: data[0].display_name };
  } catch {
    return null;
  }
}

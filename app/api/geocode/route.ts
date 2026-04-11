import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  if (!q || q.length < 3) return NextResponse.json([]);
  
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=fr&q=${encodeURIComponent(q)}`,
    { headers: { "Accept-Language": "fr", "User-Agent": "Manobra/1.0 (contact@manobra.fr)" } }
  );
  const data = await res.json();
  return NextResponse.json(data);
}

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  if (!q || q.length < 5) return NextResponse.json([]);
  
  const res = await fetch(
    `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5`,
    { headers: { "User-Agent": "Manobra/1.0 (contact@manobra.fr)" } }
  );
  const data = await res.json();
  return NextResponse.json(data.features ?? []);
}

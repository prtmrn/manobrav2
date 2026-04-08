import { NextResponse } from "next/server";
import { METIER_CONFIG, METIER_LIST } from "@/components/map/metier-config";

// ─── Cache 24 h | la liste des métiers ne change qu'avec un déploiement ──────
// Next.js App Router: revalidate the route every 24 hours (ISR-style)
export const revalidate = 86400;

export async function GET() {
  const metiers = METIER_LIST.map((key) => ({
    value: key,
    label: METIER_CONFIG[key].label,
    color: METIER_CONFIG[key].color,
  }));

  return NextResponse.json(
    { metiers },
    {
      headers: {
        // CDN + navigateur : 1 heure de cache, stale-while-revalidate 24h
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}

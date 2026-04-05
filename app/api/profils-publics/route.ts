import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Revalidation toutes les 5 minutes ───────────────────────────────────────
// Les profils publics changent peu ; on accepte jusqu'à 5 min de décalage.
export const revalidate = 300;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const metier = searchParams.get("metier");
  const ville = searchParams.get("ville");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);

  const admin = createAdminClient();

  let query = admin
    .from("profiles_artisans")
    .select(
      "id, nom, prenom, metier, ville, photo_url, note_moyenne, nombre_avis, " +
        "abonnement_pro, latitude, longitude"
    )
    .eq("actif", true)
    .order("note_moyenne", { ascending: false })
    .limit(limit);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (metier) query = query.eq("metier", metier as any);
  if (ville) query = query.ilike("ville", `%${ville}%`);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { profils: data ?? [] },
    {
      headers: {
        // CDN cache 5 min + stale-while-revalidate 1h
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    }
  );
}

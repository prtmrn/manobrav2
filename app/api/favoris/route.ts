import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ─── POST /api/favoris ─────────────────────────────────────────────────────────
// Ajoute un artisan aux favoris du client connecté.

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  let body: { artisan_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const { artisan_id } = body;
  if (!artisan_id || typeof artisan_id !== "string") {
    return NextResponse.json(
      { error: "artisan_id requis." },
      { status: 400 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("favoris")
    .insert({ client_id: user.id, artisan_id });

  if (error) {
    // 23505 = unique_violation → déjà en favoris, on renvoie 200
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, already: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

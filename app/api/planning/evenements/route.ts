import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const admin = createAdminClient() as any;
  let query = admin.from("evenements").select("*").eq("artisan_id", user.id).order("date").order("heure_debut");
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  const { data } = await query;
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await request.json();
  const admin = createAdminClient() as any;

  if (body.action === "create") {
    const { data } = await admin.from("evenements").insert({
      artisan_id: user.id,
      titre: body.titre,
      date: body.date,
      heure_debut: body.heure_debut,
      heure_fin: body.heure_fin,
      description: body.description ?? null,
      couleur: body.couleur ?? "#6366f1",
      lieu: body.lieu ?? null,
      notes_internes: body.notes_internes ?? null,
      statut: body.statut ?? "confirme",
      visibilite: body.visibilite ?? "prive",
      invite_email: body.invite_email ?? null,
      category_id: body.category_id ?? null,
    }).select().single();
    return NextResponse.json(data);
  }

  if (body.action === "update") {
    const { data } = await admin.from("evenements")
      .update({
        titre: body.titre, date: body.date,
        heure_debut: body.heure_debut, heure_fin: body.heure_fin,
        description: body.description, couleur: body.couleur,
      })
      .eq("id", body.id).eq("artisan_id", user.id).select().single();
    return NextResponse.json(data);
  }

  if (body.action === "delete") {
    await admin.from("evenements").delete().eq("id", body.id).eq("artisan_id", user.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}

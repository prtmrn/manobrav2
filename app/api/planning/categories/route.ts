import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SYSTEM_CATEGORIES = [
  { system_key: "confirme",    nom: "Réservation confirmée", couleur: "#3b82f6" },
  { system_key: "en_cours",   nom: "En cours",               couleur: "#1d4ed8" },
  { system_key: "en_attente", nom: "En attente",             couleur: "#f59e0b" },
  { system_key: "dispo",      nom: "Disponible",             couleur: "#22c55e" },
  { system_key: "urgence",    nom: "Urgence",                couleur: "#ef4444" },
  { system_key: "indispo",    nom: "Indisponible",           couleur: "#f97316" },
];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  const { data } = await (admin.from("planning_categories") as any)
    .select("*")
    .eq("artisan_id", user.id)
    .order("created_at");

  // Si aucune catégorie système, les initialiser
  const existing = (data ?? []) as any[];
  const missingSys = SYSTEM_CATEGORIES.filter(
    sc => !existing.some(e => e.system_key === sc.system_key)
  );

  if (missingSys.length > 0) {
    await (admin.from("planning_categories") as any).insert(
      missingSys.map(sc => ({
        artisan_id: user.id,
        nom: sc.nom,
        couleur: sc.couleur,
        visible: true,
        is_system: true,
        system_key: sc.system_key,
      }))
    );
    const { data: fresh } = await (admin.from("planning_categories") as any)
      .select("*").eq("artisan_id", user.id).order("created_at");
    return NextResponse.json(fresh ?? []);
  }

  return NextResponse.json(existing);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = await request.json();
  const admin = createAdminClient();

  if (body.action === "create") {
    const { data } = await (admin.from("planning_categories") as any).insert({
      artisan_id: user.id,
      nom: body.nom,
      couleur: body.couleur ?? "#6366f1",
      visible: true,
      is_system: false,
    }).select().single();
    return NextResponse.json(data);
  }

  if (body.action === "update") {
    const { data } = await (admin.from("planning_categories") as any)
      .update({ nom: body.nom, couleur: body.couleur, visible: body.visible })
      .eq("id", body.id)
      .eq("artisan_id", user.id)
      .select().single();
    return NextResponse.json(data);
  }

  if (body.action === "delete") {
    await (admin.from("planning_categories") as any)
      .delete()
      .eq("id", body.id)
      .eq("artisan_id", user.id)
      .eq("is_system", false);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}

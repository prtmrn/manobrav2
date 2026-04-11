import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  // Vérifier que c'est un admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  if ((profile as any)?.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { artisanId } = await request.json();
  if (!artisanId) return NextResponse.json({ error: "artisanId manquant." }, { status: 400 });

  // Supprimer dans l'ordre pour respecter les FK
  await admin.from("reservations").delete().eq("artisan_id", artisanId);
  await admin.from("services").delete().eq("artisan_id", artisanId);
  await admin.from("disponibilites").delete().eq("artisan_id", artisanId);
  await admin.from("indisponibilites").delete().eq("artisan_id", artisanId);
  await admin.from("avis").delete().eq("artisan_id", artisanId);
  await admin.from("profiles_artisans").delete().eq("id", artisanId);
  await admin.from("profiles").delete().eq("id", artisanId);

  // Supprimer le compte auth
  const { error } = await admin.auth.admin.deleteUser(artisanId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}

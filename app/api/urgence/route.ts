import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { actif, fin } = await request.json();
  const admin = createAdminClient();

  // @ts-ignore
  await admin.from("profiles_artisans").update({
    urgence_actif: actif,
    urgence_fin: fin ?? null,
  }).eq("id", user.id);

  return NextResponse.json({ ok: true });
}

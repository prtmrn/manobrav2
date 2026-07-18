import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { email, telephone, artisan_id } = await request.json();
  if (!email || !artisan_id) {
    return NextResponse.json({ error: "Email et artisan_id requis" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    return NextResponse.json({ error: "Format d'email invalide" }, { status: 400 });
  }
  const admin = createAdminClient();
  try {
    await (admin as any).from("leads").insert({
      email,
      telephone: telephone || null,
      artisan_id,
      source: "afficher_numero",
    });
  } catch (e) {
    console.error("[leads] insert failed", e);
  }
  const { data: artisan } = await (admin as any)
    .from("profiles_artisans")
    .select("telephone, nom")
    .eq("id", artisan_id)
    .single();
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/dashboard`,
        },
      });
    }
  } catch (e) {
    console.error("[leads] magiclink failed", e);
  }
  return NextResponse.json({ success: true, telephone: artisan?.telephone ?? null });
}

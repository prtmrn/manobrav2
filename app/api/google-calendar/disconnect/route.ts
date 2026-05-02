import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient();
  await (admin.from("profiles_artisans") as any).update({
    google_calendar_token: null,
    google_calendar_connected: false,
  }).eq("id", user.id);

  return NextResponse.json({ ok: true });
}

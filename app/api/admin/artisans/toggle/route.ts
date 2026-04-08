import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if ((profile as any)?.role !== "admin")
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const { artisanId, actif } = await request.json();
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles_artisans")
    .update({ actif } as any)
    .eq("id", artisanId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

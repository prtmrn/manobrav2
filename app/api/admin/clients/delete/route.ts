import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  if ((profile as any)?.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { clientId } = await request.json();
  if (!clientId) return NextResponse.json({ error: "clientId manquant." }, { status: 400 });

  await admin.from("reservations").delete().eq("client_id", clientId);
  await admin.from("favoris").delete().eq("client_id", clientId);
  await admin.from("profiles_clients").delete().eq("id", clientId);
  await admin.from("profiles").delete().eq("id", clientId);
  const { error } = await admin.auth.admin.deleteUser(clientId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}

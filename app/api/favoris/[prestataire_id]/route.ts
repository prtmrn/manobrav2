import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ─── DELETE /api/favoris/[artisan_id] ─────────────────────────────────────
// Retire un artisan des favoris du client connecté.

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ artisan_id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { artisan_id } = await params;

  const { error } = await supabase
    .from("favoris")
    .delete()
    .eq("client_id", user.id)
    .eq("artisan_id", artisan_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

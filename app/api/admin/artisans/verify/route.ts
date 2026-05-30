import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { artisanId, status, note } = await req.json();

    if (!artisanId || !status) {
      return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
    }

    const validStatuses = ["verifie", "rejete", "en_attente", "non_soumis"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await (admin.from("profiles_artisans") as any)
      .update({
        verification_status: status,
        verification_note: note ?? null,
      })
      .eq("id", artisanId);

    if (error) {
      console.error("Verify error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}

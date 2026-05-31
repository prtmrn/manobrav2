import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const body = await request.json();
  const { conversation_id, contenu, type = "texte", photo_url } = body;

  if (!conversation_id) return NextResponse.json({ error: "conversation_id requis." }, { status: 400 });
  if (type === "texte" && !contenu?.trim()) return NextResponse.json({ error: "Message vide." }, { status: 400 });

  const admin = createAdminClient();

  // Vérifier que l'utilisateur est participant
  const { data: conv } = await (admin as any).from("conversations")
    .select("id, artisan_id, client_id")
    .eq("id", conversation_id)
    .single();

  if (!conv || (conv.artisan_id !== user.id && conv.client_id !== user.id)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { data: message, error } = await (admin as any).from("messages").insert({
    conversation_id,
    auteur_id: user.id,
    contenu: contenu?.trim() ?? null,
    type,
    photo_url: photo_url ?? null,
    lu: false,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mettre à jour derniere_activite
  await (admin as any).from("conversations")
    .update({ derniere_activite: new Date().toISOString() })
    .eq("id", conversation_id);

  return NextResponse.json(message);
}

export async function PATCH(request: Request) {
  // Marquer les messages d'une conversation comme lus
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { conversation_id } = await request.json();
  const admin = createAdminClient();

  await (admin as any).from("messages")
    .update({ lu: true })
    .eq("conversation_id", conversation_id)
    .neq("auteur_id", user.id);

  return NextResponse.json({ ok: true });
}

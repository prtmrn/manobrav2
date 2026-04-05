import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Schema Zod ───────────────────────────────────────────────────────────────

const AvisSchema = z.object({
  reservation_id: z.string().uuid({ message: "reservation_id doit être un UUID valide." }),
  note: z
    .number({ error: "La note doit être un nombre." })
    .int({ message: "La note doit être un entier." })
    .min(1, "La note minimum est 1.")
    .max(5, "La note maximum est 5."),
  commentaire: z
    .string()
    .max(1000, "Le commentaire ne peut pas dépasser 1000 caractères.")
    .trim()
    .optional(),
});

// ─── POST /api/avis ────────────────────────────────────────────────────────────
// Soumet un avis pour une réservation terminée.
// Le trigger Supabase met à jour note_moyenne/nombre_avis automatiquement.

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  // ── Validation Zod ────────────────────────────────────────────────────────
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const parsed = AvisSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides." },
      { status: 400 }
    );
  }

  const { reservation_id, note, commentaire } = parsed.data;

  const admin = createAdminClient();

  // ── Vérifier réservation ──────────────────────────────────────────────────
  const { data: resa } = await admin
    .from("reservations")
    .select("id, client_id, artisan_id, statut")
    .eq("id", reservation_id)
    .maybeSingle();

  if (!resa) {
    return NextResponse.json(
      { error: "Réservation introuvable." },
      { status: 404 }
    );
  }
  if (resa.client_id !== user.id) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }
  if (resa.statut !== "termine") {
    return NextResponse.json(
      { error: "Un avis ne peut être soumis que pour une réservation terminée." },
      { status: 422 }
    );
  }

  // ── Vérifier pas de doublon ───────────────────────────────────────────────
  const { data: existing } = await admin
    .from("avis")
    .select("id")
    .eq("reservation_id", reservation_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Un avis a déjà été soumis pour cette réservation." },
      { status: 409 }
    );
  }

  // ── Nom du client pour affichage public ───────────────────────────────────
  const { data: clientProfile } = await admin
    .from("profiles_clients")
    .select("prenom, nom")
    .eq("id", user.id)
    .maybeSingle();

  const nomClient =
    `${clientProfile?.prenom ?? ""} ${clientProfile?.nom ?? ""}`.trim() ||
    "Anonyme";

  // ── Insertion ─────────────────────────────────────────────────────────────
  const { error: insertError } = await admin.from("avis").insert({
    reservation_id,
    client_id: user.id,
    artisan_id: resa.artisan_id,
    nom_client: nomClient,
    note,
    commentaire: commentaire || null,
  });

  if (insertError) {
    console.error("[API /avis] insert error:", insertError.message);
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

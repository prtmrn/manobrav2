import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ReservationStatut } from "@/types";

// ─── Transitions de statut autorisées ─────────────────────────────────────────

const CLIENT_TRANSITIONS: Partial<Record<ReservationStatut, ReservationStatut[]>> = {
  en_attente: ["annule"],
  confirme: ["annule"],
};

const PRESTA_TRANSITIONS: Partial<Record<ReservationStatut, ReservationStatut[]>> = {
  en_attente: ["confirme", "annule"],
  confirme: ["en_cours", "termine", "annule"],
  en_cours: ["termine"],
};

// ─── PATCH /api/reservations/[id]/status ──────────────────────────────────────

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();

  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  // ── 2. Role ───────────────────────────────────────────────────────────────
  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileData as { role: string } | null;
  const role = profile?.role;

  if (!role) {
    return NextResponse.json({ error: "Profil introuvable." }, { status: 403 });
  }

  // ── 3. Validation du body ────────────────────────────────────────────────
  let newStatut: ReservationStatut;
  try {
    const body = await request.json();
    newStatut = body.statut as ReservationStatut;
  } catch {
    return NextResponse.json({ error: "Body JSON invalide." }, { status: 400 });
  }

  const validStatuts: ReservationStatut[] = [
    "en_attente",
    "confirme",
    "en_cours",
    "termine",
    "annule",
  ];
  if (!validStatuts.includes(newStatut)) {
    return NextResponse.json({ error: "Statut invalide." }, { status: 422 });
  }

  // ── 4. Récupération de la réservation actuelle ────────────────────────────
  const { data: resaData, error: fetchError } = await supabase
    .from("reservations")
    .select("id, statut, client_id, artisan_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !resaData) {
    return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
  }

  const resa = resaData as {
    id: string;
    statut: ReservationStatut;
    client_id: string;
    artisan_id: string;
  };

  // ── 5. Vérification des transitions autorisées ────────────────────────────
  let allowedNext: ReservationStatut[] = [];

  if (role === "client" && resa.client_id === user.id) {
    allowedNext = CLIENT_TRANSITIONS[resa.statut] ?? [];
  } else if (role === "artisan" && resa.artisan_id === user.id) {
    allowedNext = PRESTA_TRANSITIONS[resa.statut] ?? [];
  }

  if (!allowedNext.includes(newStatut)) {
    return NextResponse.json(
      {
        error: `Transition ${resa.statut} → ${newStatut} non autorisée pour ce rôle.`,
      },
      { status: 403 }
    );
  }

  // ── 6. Mise à jour (RLS valide en plus de notre check applicatif) ─────────
  const { data: updated, error: updateError } = await supabase
    .from("reservations")
    // @ts-expect-error – @supabase/ssr@0.5.x / supabase-js@2.98.x generic mismatch
    .update({ statut: newStatut })
    .eq("id", id)
    .select("id, statut")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ reservation: updated });
}

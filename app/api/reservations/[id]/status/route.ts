import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ReservationStatut } from "@/types";
import { sendBrevoEmail } from "@/lib/brevo";

const CLIENT_TRANSITIONS: Partial<Record<ReservationStatut, ReservationStatut[]>> = {
  en_attente: ["annule"],
  confirme: ["annule"],
};

const PRESTA_TRANSITIONS: Partial<Record<ReservationStatut, ReservationStatut[]>> = {
  en_attente: ["confirme", "annule"],
  confirme: ["en_cours", "termine", "annule"],
  en_cours: ["termine"],
};

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { data: profileData } = await supabase
    .from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (profileData as any)?.role;
  if (!role) return NextResponse.json({ error: "Profil introuvable." }, { status: 403 });

  let newStatut: ReservationStatut;
  try {
    const body = await request.json();
    newStatut = body.statut as ReservationStatut;
  } catch {
    return NextResponse.json({ error: "Body JSON invalide." }, { status: 400 });
  }

  const validStatuts: ReservationStatut[] = ["en_attente", "confirme", "en_cours", "termine", "annule"];
  if (!validStatuts.includes(newStatut)) {
    return NextResponse.json({ error: "Statut invalide." }, { status: 422 });
  }

  // Récupérer la réservation complète
  const { data: resaData, error: fetchError } = await admin
    .from("reservations")
    .select("id, statut, client_id, artisan_id, date, heure_debut, heure_fin, adresse_intervention, montant_total, service_id, guest_email, guest_nom")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !resaData) {
    return NextResponse.json({ error: "Réservation introuvable." }, { status: 404 });
  }

  const resa = resaData as any;

  let allowedNext: ReservationStatut[] = [];
  if (role === "client" && resa.client_id === user.id) {
    allowedNext = CLIENT_TRANSITIONS[resa.statut as ReservationStatut] ?? [];
  } else if (role === "artisan" && resa.artisan_id === user.id) {
    allowedNext = PRESTA_TRANSITIONS[resa.statut as ReservationStatut] ?? [];
  }

  if (!allowedNext.includes(newStatut)) {
    return NextResponse.json(
      { error: `Transition ${resa.statut} → ${newStatut} non autorisée pour ce rôle.` },
      { status: 403 }
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("reservations")
    // @ts-expect-error
    .update({ statut: newStatut })
    .eq("id", id)
    .select("id, statut")
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  // ── Emails post-transition ────────────────────────────────────────────────
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://manobra.fr";

    // Récupérer les infos artisan
    const { data: artisanProfile } = await admin
      .from("profiles_artisans")
      .select("nom, prenom, metier")
      .eq("id", resa.artisan_id)
      .maybeSingle();
    const artisan = artisanProfile as any;

    // Récupérer email artisan
    const { data: artisanAuth } = await admin.auth.admin.getUserById(resa.artisan_id);
    const artisanEmail = artisanAuth?.user?.email ?? "";

    // Récupérer le service
    const { data: serviceData } = await admin
      .from("services")
      .select("titre")
      .eq("id", resa.service_id)
      .maybeSingle();
    const serviceTitre = (serviceData as any)?.titre ?? "Prestation";

    // Email client si artisan accepte ou refuse
    if (role === "artisan" && (newStatut === "confirme" || newStatut === "annule")) {
      let clientEmail = resa.guest_email ?? "";
      let clientPrenom = resa.guest_nom ?? "Client";

      if (resa.client_id) {
        const { data: clientAuth } = await admin.auth.admin.getUserById(resa.client_id);
        clientEmail = clientAuth?.user?.email ?? clientEmail;
        const { data: clientProfile } = await admin
          .from("profiles_clients")
          .select("prenom, nom")
          .eq("id", resa.client_id)
          .maybeSingle();
        clientPrenom = (clientProfile as any)?.prenom ?? clientPrenom;
      }

      if (clientEmail) {
        const subject = newStatut === "confirme"
          ? `Votre réservation est confirmée - ${serviceTitre}`
          : `Votre réservation a été refusée - ${serviceTitre}`;
        const statusLabel = newStatut === "confirme" ? "confirmée" : "refusée";
        const color = newStatut === "confirme" ? "#16a34a" : "#dc2626";

        await sendBrevoEmail({
          to: [{ email: clientEmail, name: clientPrenom }],
          subject,
          htmlContent: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
              <h1 style="font-size:22px;color:#111">Bonjour ${clientPrenom},</h1>
              <p style="color:#444">Votre demande de réservation pour <strong>${serviceTitre}</strong> a été <strong style="color:${color}">${statusLabel}</strong> par ${artisan?.prenom ?? ""} ${artisan?.nom ?? ""}.</p>
              <p style="color:#444">Date : <strong>${resa.date}</strong> de ${resa.heure_debut?.slice(0,5)} à ${resa.heure_fin?.slice(0,5)}</p>
              ${newStatut === "confirme" ? `<a href="${siteUrl}/dashboard/reservations" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">Voir ma réservation</a>` : ""}
              <p style="margin-top:32px;color:#888;font-size:13px">L'équipe Manobra</p>
            </div>
          `,
        });
      }
    }

    // Email artisan si client annule
    if (role === "client" && newStatut === "annule" && artisanEmail) {
      await sendBrevoEmail({
        to: [{ email: artisanEmail, name: artisan?.prenom ?? '' }],
        subject: `Réservation annulée - ${serviceTitre}`,
        htmlContent: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px">
            <h1 style="font-size:22px;color:#111">Bonjour ${artisan?.prenom ?? ""},</h1>
            <p style="color:#444">Une réservation pour <strong>${serviceTitre}</strong> a été annulée par le client.</p>
            <p style="color:#444">Date : <strong>${resa.date}</strong> de ${resa.heure_debut?.slice(0,5)} à ${resa.heure_fin?.slice(0,5)}</p>
            <a href="https://artisan.manobra.fr/dashboard/reservations" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#16a34a;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">Voir mes réservations</a>
            <p style="margin-top:32px;color:#888;font-size:13px">L'équipe Manobra</p>
          </div>
        `,
      });
    }
  } catch (emailErr) {
    console.error("Erreur envoi email status:", emailErr);
    // Ne pas bloquer la réponse si l'email échoue
  }

  return NextResponse.json({ reservation: updated });
}

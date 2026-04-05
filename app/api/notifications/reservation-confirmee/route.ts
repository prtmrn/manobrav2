import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendEmailConfirmationClient,
  sendEmailNotifartisan,
} from "@/lib/brevo";

// ─── Config ───────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
  );
}

/**
 * Vérifie que la requête vient d'une source autorisée.
 * En prod : header "Authorization: Bearer <CRON_SECRET>"
 * CRON_SECRET doit toujours être défini — on refuse si absent (fail closed).
 */
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Sécurité : on refuse l'accès si CRON_SECRET n'est pas configuré.
  if (!secret) {
    console.warn("[CRON] CRON_SECRET non défini — accès refusé par sécurité.");
    return false;
  }
  return request.headers.get("Authorization") === `Bearer ${secret}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReservationDetail {
  id: string;
  client_id: string;
  artisan_id: string;
  client_nom: string | null;
  client_prenom: string | null;
  artisan_nom: string | null;
  artisan_prenom: string | null;
  artisan_metier: string | null;
  service_titre: string | null;
  date: string;
  heure_debut: string;
  heure_fin: string;
  adresse_intervention: string | null;
  montant_total: number | null;
}

// ─── POST /api/notifications/reservation-confirmee ────────────────────────────
//
// Appelée par le webhook Stripe après confirmation d'un paiement.
// Body : { reservation_id: string }
// Envoie les emails (1) confirmation client + (2) notification artisan.

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  // ── Lire le body ────────────────────────────────────────────────────────────
  let reservationId: string;
  try {
    const body = (await request.json()) as { reservation_id?: string };
    if (!body.reservation_id) throw new Error("reservation_id manquant");
    reservationId = body.reservation_id;
  } catch {
    return NextResponse.json(
      { error: "Body invalide. Attendu : { reservation_id: string }" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // ── Récupérer la réservation enrichie (vue) ─────────────────────────────────
  const { data: rdRaw, error: fetchErr } = await admin
    .from("reservations_detail")
    .select(
      "id, client_id, artisan_id, client_nom, client_prenom, artisan_nom, artisan_prenom, artisan_metier, service_titre, date, heure_debut, heure_fin, adresse_intervention, montant_total"
    )
    .eq("id", reservationId)
    .maybeSingle();

  if (fetchErr) {
    console.error("[reservation-confirmee] Erreur Supabase :", fetchErr.message);
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  if (!rdRaw) {
    return NextResponse.json(
      { error: `Réservation ${reservationId} introuvable.` },
      { status: 404 }
    );
  }

  const rd = rdRaw as ReservationDetail;

  // ── Récupérer les emails via auth.admin ─────────────────────────────────────
  const [clientAuthRes, artisanAuthRes] = await Promise.all([
    admin.auth.admin.getUserById(rd.client_id),
    admin.auth.admin.getUserById(rd.artisan_id),
  ]);

  const clientEmail      = clientAuthRes.data.user?.email ?? "";
  const artisanEmail = artisanAuthRes.data.user?.email ?? "";

  const clientPrenom  = rd.client_prenom  ?? clientEmail.split("@")[0]      ?? "Client";
  const artisanPrenom = rd.artisan_prenom ?? artisanEmail.split("@")[0] ?? "artisan";

  const clientNomComplet =
    `${rd.client_prenom ?? ""} ${rd.client_nom ?? ""}`.trim() || clientEmail;
  const artisanNomComplet =
    `${rd.artisan_prenom ?? ""} ${rd.artisan_nom ?? ""}`.trim() || artisanEmail;

  const siteUrl = getSiteUrl();
  const commonData = {
    reservationId: rd.id,
    serviceTitre:  rd.service_titre         ?? "Prestation",
    date:          rd.date,
    heureDebut:    rd.heure_debut,
    heureFin:      rd.heure_fin,
    adresse:       rd.adresse_intervention,
    montantTotal:  rd.montant_total,
    siteUrl,
  };

  // ── Envoyer les deux emails ─────────────────────────────────────────────────
  const results = await Promise.allSettled([
    clientEmail
      ? sendEmailConfirmationClient({
          ...commonData,
          clientEmail,
          clientPrenom,
          artisanNomComplet,
          artisanMetier: rd.artisan_metier ?? "artisan",
        })
      : Promise.resolve(),

    artisanEmail
      ? sendEmailNotifartisan({
          ...commonData,
          artisanEmail,
          artisanPrenom,
          clientNomComplet,
        })
      : Promise.resolve(),
  ]);

  // ── Logger les erreurs éventuelles ─────────────────────────────────────────
  results.forEach((r) => {
    if (r.status === "rejected") {
      console.error(
        "[reservation-confirmee] Erreur envoi email :",
        r.reason
      );
    }
  });

  const errorsCount = results.filter((r) => r.status === "rejected").length;

  console.log(
    `[reservation-confirmee] Réservation ${reservationId} ` +
    `→ client=${clientEmail || "?"}, presta=${artisanEmail || "?"}, ` +
    `erreurs=${errorsCount}`
  );

  return NextResponse.json({
    ok: true,
    reservation_id: reservationId,
    emails_sent: {
      client:      !!clientEmail,
      artisan: !!artisanEmail,
    },
    errors: errorsCount,
  });
}

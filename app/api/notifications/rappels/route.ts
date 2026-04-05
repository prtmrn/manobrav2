import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendEmailRappelClient,
  sendEmailRappelartisan,
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

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // En production, CRON_SECRET doit toujours être défini.
  // Si non défini, on bloque pour éviter une exposition accidentelle.
  if (!secret) {
    console.warn("[CRON] CRON_SECRET non défini — accès refusé par sécurité.");
    return false;
  }
  return request.headers.get("Authorization") === `Bearer ${secret}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReservationRappel {
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
}

// ─── GET /api/notifications/rappels ──────────────────────────────────────────
//
// Cron Vercel : 0 9 * * * (09h UTC = 10h CET / 11h CEST)
//
// Récupère toutes les réservations confirmées pour demain et envoie :
//   - Template (3) : rappel 24h au CLIENT
//   - Template (4) : rappel 24h au artisan

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  // ── Date de demain (UTC) ─────────────────────────────────────────────────────
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0]; // YYYY-MM-DD

  const admin   = createAdminClient();
  const siteUrl = getSiteUrl();

  // ── Réservations confirmées pour demain ──────────────────────────────────────
  const { data: rows, error } = await admin
    .from("reservations_detail")
    .select(
      "id, client_id, artisan_id, " +
      "client_nom, client_prenom, " +
      "artisan_nom, artisan_prenom, artisan_metier, " +
      "service_titre, date, heure_debut, heure_fin, adresse_intervention"
    )
    .eq("date", tomorrowStr)
    .eq("statut", "confirme");

  if (error) {
    console.error("[Rappels] Erreur Supabase :", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const reservations = (rows ?? []) as unknown as ReservationRappel[];
  console.log(`[Rappels] ${reservations.length} réservation(s) pour le ${tomorrowStr}.`);

  let emailsSent  = 0;
  let emailErrors = 0;

  // ── Traitement réservation par réservation ───────────────────────────────────
  for (const rd of reservations) {
    // Récupérer les emails (auth.admin — bypass RLS)
    const [clientAuthRes, artisanAuthRes] = await Promise.all([
      admin.auth.admin.getUserById(rd.client_id),
      admin.auth.admin.getUserById(rd.artisan_id),
    ]);

    const clientEmail      = clientAuthRes.data.user?.email      ?? "";
    const artisanEmail = artisanAuthRes.data.user?.email ?? "";

    const clientPrenom      = rd.client_prenom      ?? clientEmail.split("@")[0]      ?? "Client";
    const artisanPrenom = rd.artisan_prenom ?? artisanEmail.split("@")[0] ?? "artisan";

    const clientNomComplet =
      `${rd.client_prenom ?? ""} ${rd.client_nom ?? ""}`.trim() || clientEmail;
    const artisanNomComplet =
      `${rd.artisan_prenom ?? ""} ${rd.artisan_nom ?? ""}`.trim() || artisanEmail;

    // Envoyer rappel client + rappel artisan en parallèle
    const results = await Promise.allSettled([
      clientEmail
        ? sendEmailRappelClient({
            clientEmail,
            clientPrenom,
            artisanNomComplet,
            serviceTitre: rd.service_titre ?? "Prestation",
            date:         rd.date,
            heureDebut:   rd.heure_debut,
            adresse:      rd.adresse_intervention,
            siteUrl,
          })
        : Promise.resolve(),

      artisanEmail
        ? sendEmailRappelartisan({
            artisanEmail,
            artisanPrenom,
            clientNomComplet,
            serviceTitre: rd.service_titre ?? "Prestation",
            date:         rd.date,
            heureDebut:   rd.heure_debut,
            adresse:      rd.adresse_intervention,
            siteUrl,
          })
        : Promise.resolve(),
    ]);

    for (const r of results) {
      if (r.status === "fulfilled") {
        emailsSent++;
      } else {
        emailErrors++;
        console.error(
          `[Rappels] Erreur email pour réservation ${rd.id} :`,
          r.reason
        );
      }
    }
  }

  console.log(
    `[Rappels] Terminé. Réservations=${reservations.length}, ` +
    `emails envoyés=${emailsSent}, erreurs=${emailErrors}.`
  );

  return NextResponse.json({
    date_rappels:          tomorrowStr,
    reservations_traitees: reservations.length,
    emails_envoyes:        emailsSent,
    erreurs:               emailErrors,
  });
}

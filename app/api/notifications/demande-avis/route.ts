import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmailDemandeAvis } from "@/lib/brevo";

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
    console.warn("[CRON] CRON_SECRET non défini | accès refusé par sécurité.");
    return false;
  }
  return request.headers.get("Authorization") === `Bearer ${secret}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReservationCandidate {
  id: string;
  client_id: string;
  artisan_id: string;
  service_id: string | null;
  date: string;
  heure_fin: string;
}

// ─── GET /api/notifications/demande-avis ─────────────────────────────────────
//
// Cron Vercel : 0 * * * * (toutes les heures)
//
// Logique :
//   - Cherche les réservations dont la fin théorique était il y a 2–3h
//   - (fenêtre d'1h = fréquence du cron, pour attraper chaque réservation une fois)
//   - avis_envoye_at IS NULL → n'a pas encore reçu l'email
//   - statut NOT IN ('annule', 'en_attente') → la prestation a eu lieu
//   - Envoie le Template (5) : demande d'avis au CLIENT
//   - Met à jour avis_envoye_at pour éviter tout doublon

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const now       = Date.now();
  const TWO_H_MS  = 2 * 60 * 60 * 1000;
  const THREE_H_MS = 3 * 60 * 60 * 1000;

  // Fenêtre de dates : on cherche hier et aujourd'hui
  // (une intervention terminée hier soir peut tomber dans la fenêtre de 2–3h)
  const todayStr     = new Date().toISOString().split("T")[0];
  const yesterdayStr = new Date(now - 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const admin   = createAdminClient();
  const siteUrl = getSiteUrl();

  // ── Candidats : réservations non encore traitées ─────────────────────────────
  const { data: candidatesRaw, error } = await admin
    .from("reservations")
    .select("id, client_id, artisan_id, service_id, date, heure_fin")
    .is("avis_envoye_at", null)
    .in("statut", ["confirme", "en_cours", "termine"])
    .gte("date", yesterdayStr)
    .lte("date", todayStr);

  if (error) {
    console.error("[Avis] Erreur Supabase :", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const candidates = (candidatesRaw ?? []) as ReservationCandidate[];

  // ── Filtrer : fin théorique il y a 2–3h ──────────────────────────────────────
  const eligible = candidates.filter((r) => {
    // Combiner date + heure_fin → timestamp local (le serveur est en UTC)
    const endTs = new Date(`${r.date}T${r.heure_fin}Z`).getTime();
    const diff  = now - endTs;
    return diff >= TWO_H_MS && diff < THREE_H_MS;
  });

  console.log(
    `[Avis] Candidats=${candidates.length}, éligibles=${eligible.length}.`
  );

  let emailsSent  = 0;
  let emailErrors = 0;

  // ── Traitement éligible par éligible ─────────────────────────────────────────
  for (const rd of eligible) {
    try {
      // Données client
      const [clientProfileRes, artisanProfileRes, serviceRes, clientAuthRes] =
        await Promise.all([
          admin
            .from("profiles_clients")
            .select("nom, prenom")
            .eq("id", rd.client_id)
            .maybeSingle(),
          admin
            .from("profiles_artisans")
            .select("nom, prenom")
            .eq("id", rd.artisan_id)
            .maybeSingle(),
          rd.service_id
            ? admin.from("services").select("titre").eq("id", rd.service_id).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
          admin.auth.admin.getUserById(rd.client_id),
        ]);

      const clientProfile     = clientProfileRes.data as { nom: string | null; prenom: string | null } | null;
      const artisanProfile = artisanProfileRes.data as { nom: string | null; prenom: string | null } | null;
      const service            = serviceRes.data as { titre: string } | null;
      const clientEmail        = clientAuthRes.data.user?.email ?? "";

      if (!clientEmail) {
        console.warn(`[Avis] Email client introuvable pour réservation ${rd.id}, ignorée.`);
        continue;
      }

      const clientPrenom = clientProfile?.prenom ?? clientEmail.split("@")[0] ?? "Client";
      const artisanNomComplet =
        `${artisanProfile?.prenom ?? ""} ${artisanProfile?.nom ?? ""}`.trim() ||
        "Votre artisan";

      // ── Envoi de l'email ───────────────────────────────────────────────────
      await sendEmailDemandeAvis({
        clientEmail,
        clientPrenom,
        artisanNomComplet,
        serviceTitre: service?.titre ?? "Prestation",
        date:         rd.date,
        reservationId: rd.id,
        siteUrl,
      });

      // ── Marquer l'email comme envoyé (idempotence) ─────────────────────────
      const { error: updateErr } = await admin
        .from("reservations")
        .update({ avis_envoye_at: new Date().toISOString() } as never)
        .eq("id", rd.id);

      if (updateErr) {
        console.error(
          `[Avis] Erreur mise à jour avis_envoye_at pour ${rd.id} :`,
          updateErr.message
        );
      }

      emailsSent++;
      console.log(`[Avis] Email envoyé → réservation ${rd.id}, client ${clientEmail}.`);
    } catch (err) {
      emailErrors++;
      console.error(`[Avis] Erreur pour réservation ${rd.id} :`, err);
    }
  }

  console.log(
    `[Avis] Terminé. Envoyés=${emailsSent}, erreurs=${emailErrors}.`
  );

  return NextResponse.json({
    checked:        candidates.length,
    eligible:       eligible.length,
    emails_envoyes: emailsSent,
    erreurs:        emailErrors,
  });
}

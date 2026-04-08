import { createAdminClient } from "@/lib/supabase/admin";

// ─── Logger email en base ─────────────────────────────────────────────────────
async function logEmail(opts: {
  destinataire: string;
  sujet: string;
  categorie: string;
  reservationId?: string | null;
  artisanId?: string | null;
  clientId?: string | null;
}) {
  try {
    const admin = createAdminClient();
    await (admin as any).from("email_logs").insert({
      destinataire: opts.destinataire,
      sujet: opts.sujet,
      categorie: opts.categorie,
      statut: "envoye",
      reservation_id: opts.reservationId ?? null,
      artisan_id: opts.artisanId ?? null,
      client_id: opts.clientId ?? null,
    });
  } catch {
    // Ne pas bloquer l'envoi si le log échoue
  }
}

// ─── Client Brevo (HTTP direct) ──────────────────────────────────────────────

async function sendTransacEmail(payload: object): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn("[Brevo] BREVO_API_KEY absent – email non envoyé.");
    return;
  }

  console.log("[Brevo] Tentative envoi vers api.brevo.com...");
  console.log("[Brevo] API key présente :", apiKey.slice(0, 20) + "...");
  console.log("[Brevo] Payload :", JSON.stringify(payload).slice(0, 200));

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  console.log("[Brevo] Statut réponse :", res.status);
  if (!res.ok) {
    const err = await res.text();
    console.error("[Brevo] Erreur envoi :", res.status, err);
  } else {
    console.log("[Brevo] Email envoyé avec succès !");
  }
}

function getTemplateId(envVar: string): number | null {
  const val = process.env[envVar];
  if (!val) return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

interface SendEmailOpts {
  to: Array<{ email: string; name?: string }>;
  templateId?: number | null;
  params?: Record<string, string | number | null | undefined>;
  subject?: string;
  htmlContent?: string;
}

/** Envoie un email transactionnel via l'API Brevo (HTTP direct). */
async function sendEmail(opts: SendEmailOpts): Promise<void> {
  const sender = {
    email: process.env.BREVO_SENDER_EMAIL ?? "noreply@manobra.fr",
    name: process.env.BREVO_SENDER_NAME ?? "Manobra",
  };

  if (opts.templateId) {
    await sendTransacEmail({
      to: opts.to,
      templateId: opts.templateId,
      params: opts.params ?? {},
      sender,
    });
  } else {
    if (!opts.subject || !opts.htmlContent) {
      console.warn("[Brevo] subject et htmlContent requis sans templateId.");
      return;
    }
    await sendTransacEmail({
      to: opts.to,
      subject: opts.subject,
      htmlContent: opts.htmlContent,
      sender,
    });
  }
}

/** Envoie un email transactionnel en HTML pur (rétrocompatibilité). */
export async function sendBrevoEmail(opts: {
  to: Array<{ email: string; name?: string }>;
  subject: string;
  htmlContent: string;
}): Promise<void> {
  await sendEmail({ to: opts.to, subject: opts.subject, htmlContent: opts.htmlContent });
}

// ─── Helpers de formatage ─────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatPrix(montant: number | null): string {
  if (montant === null || montant === 0) return "Sur devis";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format(montant);
}

function sliceHM(time: string): string {
  return time.slice(0, 5);
}

// ─── Template HTML partagé ───────────────────────────────────────────────────

function wrapHtml(title: string, body: string): string {
  const brand = "#22c55e";
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f6;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:580px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
        <tr>
          <td style="background:${brand};padding:28px 32px;text-align:center">
            <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-.3px">${title}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            ${body}
          </td>
        </tr>
        <tr>
          <td style="background:#f8faf8;padding:16px 32px;text-align:center;border-top:1px solid #e8f0e8">
            <p style="margin:0;font-size:12px;color:#9ca3af">
              Cet email a été envoyé automatiquement. Ne pas répondre directement.<br>
              &copy; ${new Date().getFullYear()} Ma Plateforme
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function detailRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:10px 16px;font-size:14px;color:#6b7280;white-space:nowrap;vertical-align:top">${label}</td>
      <td style="padding:10px 16px;font-size:14px;color:#111827;font-weight:500">${value}</td>
    </tr>`;
}

function ctaButton(text: string, url: string): string {
  return `
    <div style="text-align:center;margin:28px 0 8px">
      <a href="${url}" style="display:inline-block;padding:13px 28px;background:#22c55e;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px">
        ${text}
      </a>
    </div>`;
}

// ─── Email 1 : confirmation au CLIENT ────────────────────────────────────────

export interface ReservationEmailData {
  reservationId: string;
  clientEmail: string;
  clientPrenom: string;
  artisanNomComplet: string;
  artisanMetier: string;
  serviceTitre: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  adresse: string | null;
  montantTotal: number | null;
  siteUrl: string;
}

export async function sendEmailConfirmationClient(
  data: ReservationEmailData
): Promise<void> {
  await logEmail({
    destinataire: data.clientEmail,
    sujet: `Demande envoyée - ${data.serviceTitre}`,
    categorie: "confirmation_client",
    reservationId: data.reservationId,
  });
  const ref = data.reservationId.slice(0, 8).toUpperCase();
  const dashUrl = `${data.siteUrl}/dashboard/client/reservations`;
  const templateId = getTemplateId("BREVO_TEMPLATE_CONFIRMATION_CLIENT");

  if (templateId) {
    await sendEmail({
      to: [{ email: data.clientEmail, name: data.clientPrenom }],
      templateId,
      params: {
        prenom: data.clientPrenom,
        artisan: data.artisanNomComplet,
        metier: data.artisanMetier,
        service: data.serviceTitre,
        reference: ref,
        date: formatDate(data.date),
        heure: `${sliceHM(data.heureDebut)} -> ${sliceHM(data.heureFin)}`,
        adresse: data.adresse ?? "",
        montant: formatPrix(data.montantTotal),
        dashboard_url: dashUrl,
      },
    });
    return;
  }

  const body = `
    <p style="font-size:15px;color:#374151;margin:0 0 20px">
      Bonjour <strong>${data.clientPrenom}</strong>,
    </p>
    <p style="font-size:15px;color:#374151;margin:0 0 24px">
      Votre demande de reservation a bien ete transmise a
      <strong>${data.artisanNomComplet}</strong> (<em>${data.artisanMetier}</em>).
      Vous serez notifie(e) des qu'il confirme votre creneau.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:24px;border-collapse:collapse">
      <tr><td colspan="2" style="padding:12px 16px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;border-bottom:1px solid #e5e7eb">
        Ref. ${ref}
      </td></tr>
      ${detailRow("Service", data.serviceTitre)}
      ${detailRow("artisan", `${data.artisanNomComplet} - ${data.artisanMetier}`)}
      ${detailRow("Date", formatDate(data.date))}
      ${detailRow("Horaire", `${sliceHM(data.heureDebut)} -> ${sliceHM(data.heureFin)}`)}
      ${data.adresse ? detailRow("Adresse", data.adresse) : ""}
      ${detailRow("Montant estime", formatPrix(data.montantTotal))}
      ${detailRow("Statut", "En attente de confirmation")}
    </table>
    ${ctaButton("Voir mes reservations", dashUrl)}
    <p style="font-size:13px;color:#9ca3af;text-align:center;margin:16px 0 0">
      Le paiement sera traite apres confirmation du artisan.
    </p>`;

  await sendEmail({
    to: [{ email: data.clientEmail, name: data.clientPrenom }],
    subject: `Demande envoyee - ${data.serviceTitre} avec ${data.artisanNomComplet}`,
    htmlContent: wrapHtml("Votre demande a ete envoyee !", body),
  });
}

// ─── Email 2 : notification au artisan ────────────────────────────────────

export interface NotifPrestaEmailData {
  artisanEmail: string;
  artisanPrenom: string;
  clientNomComplet: string;
  serviceTitre: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  adresse: string | null;
  montantTotal: number | null;
  siteUrl: string;
}

export async function sendEmailNotifartisan(
  data: NotifPrestaEmailData
): Promise<void> {
  await logEmail({
    destinataire: data.artisanEmail,
    sujet: `Nouvelle demande - ${data.serviceTitre}`,
    categorie: "notification_artisan",
  });
  const dashUrl = `${data.siteUrl}/dashboard/artisan/reservations`;
  const templateId = getTemplateId("BREVO_TEMPLATE_NOTIF_artisan");

  if (templateId) {
    await sendEmail({
      to: [{ email: data.artisanEmail, name: data.artisanPrenom }],
      templateId,
      params: {
        prenom: data.artisanPrenom,
        client: data.clientNomComplet,
        service: data.serviceTitre,
        date: formatDate(data.date),
        heure: `${sliceHM(data.heureDebut)} -> ${sliceHM(data.heureFin)}`,
        adresse: data.adresse ?? "",
        montant: formatPrix(data.montantTotal),
        dashboard_url: dashUrl,
      },
    });
    return;
  }

  const body = `
    <p style="font-size:15px;color:#374151;margin:0 0 20px">
      Bonjour <strong>${data.artisanPrenom}</strong>,
    </p>
    <p style="font-size:15px;color:#374151;margin:0 0 24px">
      Vous avez recu une nouvelle demande de reservation de la part de
      <strong>${data.clientNomComplet}</strong>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:24px;border-collapse:collapse">
      <tr><td colspan="2" style="padding:12px 16px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;border-bottom:1px solid #e5e7eb">
        Nouvelle demande
      </td></tr>
      ${detailRow("Client", data.clientNomComplet)}
      ${detailRow("Service demande", data.serviceTitre)}
      ${detailRow("Date", formatDate(data.date))}
      ${detailRow("Horaire", `${sliceHM(data.heureDebut)} -> ${sliceHM(data.heureFin)}`)}
      ${data.adresse ? detailRow("Adresse", data.adresse) : ""}
      ${detailRow("Montant", formatPrix(data.montantTotal))}
    </table>
    ${ctaButton("Voir la demande", dashUrl)}`;

  await sendEmail({
    to: [{ email: data.artisanEmail, name: data.artisanPrenom }],
    subject: `Nouvelle demande de ${data.clientNomComplet} - ${data.serviceTitre}`,
    htmlContent: wrapHtml("Nouvelle demande de reservation", body),
  });
}

// ─── Email 3 : echec de paiement au CLIENT ────────────────────────────────────

export interface PaiementEchouEmailData {
  clientEmail: string;
  clientPrenom: string;
  montantTotal: number | null;
  paymentIntentId: string;
  errorMessage: string;
  siteUrl: string;
}

export async function sendEmailPaiementEchouClient(
  data: PaiementEchouEmailData
): Promise<void> {
  const dashUrl = `${data.siteUrl}/dashboard/client/reservations`;
  const ref = data.paymentIntentId.slice(-8).toUpperCase();

  const body = `
    <p style="font-size:15px;color:#374151;margin:0 0 20px">
      Bonjour <strong>${data.clientPrenom}</strong>,
    </p>
    <p style="font-size:15px;color:#374151;margin:0 0 24px">
      Nous n'avons pas pu traiter votre paiement. Votre reservation n'a pas ete confirmee.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#fff8f8;border-radius:8px;border:1px solid #fecaca;margin-bottom:24px;border-collapse:collapse">
      <tr><td colspan="2" style="padding:12px 16px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#ef4444;border-bottom:1px solid #fecaca">
        Paiement refuse
      </td></tr>
      ${detailRow("Reference", ref)}
      ${detailRow("Montant", formatPrix(data.montantTotal))}
      ${detailRow("Motif", data.errorMessage)}
    </table>
    ${ctaButton("Retenter une reservation", dashUrl)}`;

  await sendEmail({
    to: [{ email: data.clientEmail, name: data.clientPrenom }],
    subject: `Paiement refuse - Votre reservation n'a pas pu etre confirmee`,
    htmlContent: wrapHtml("Echec du paiement", body),
  });
}

// ─── Email 4 : abonnement ACTIVE au artisan ──────────────────────────────

export interface AbonnementActifEmailData {
  artisanEmail: string;
  artisanPrenom: string;
  planActif: "essentiel" | "pro";
  siteUrl: string;
}

export async function sendEmailAbonnementActif(
  data: AbonnementActifEmailData
): Promise<void> {
  const dashUrl = `${data.siteUrl}/dashboard/artisan`;
  const planLabel = data.planActif === "pro" ? "Plan Pro" : "Plan Essentiel";

  const features =
    data.planActif === "pro"
      ? ["Mis en avant sur la carte", "Services illimites", "Badge Verifie sur votre profil", "Statistiques avancees"]
      : ["Visible sur la carte", "Jusqu'a 5 services", "Support email"];

  const featureRows = features
    .map((f) => `<li style="font-size:14px;color:#374151;margin-bottom:8px">${f}</li>`)
    .join("");

  const body = `
    <p style="font-size:15px;color:#374151;margin:0 0 20px">
      Bonjour <strong>${data.artisanPrenom}</strong>,
    </p>
    <p style="font-size:15px;color:#374151;margin:0 0 24px">
      Votre abonnement <strong>${planLabel}</strong> est maintenant actif.
      Votre profil est visible sur Manobra.
    </p>
    <div style="background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0;padding:20px 20px 12px;margin-bottom:24px">
      <ul style="margin:0;padding-left:20px">${featureRows}</ul>
    </div>
    ${ctaButton("Acceder a mon tableau de bord", dashUrl)}`;

  await sendEmail({
    to: [{ email: data.artisanEmail, name: data.artisanPrenom }],
    subject: `Votre compte Manobra est actif - ${planLabel}`,
    htmlContent: wrapHtml("Bienvenue sur Manobra !", body),
  });
}

// ─── Email 5 : abonnement DESACTIVE au artisan ───────────────────────────

export interface AbonnementDesactiveEmailData {
  artisanEmail: string;
  artisanPrenom: string;
  motif: string;
  siteUrl: string;
}

function motifLabel(motif: string): string {
  switch (motif) {
    case "past_due": return "paiement en retard";
    case "unpaid":   return "facture impayee";
    case "canceled": return "resiliation de l'abonnement";
    default:         return "suspension de l'abonnement";
  }
}

export async function sendEmailAbonnementDesactive(
  data: AbonnementDesactiveEmailData
): Promise<void> {
  const reactiverUrl = `${data.siteUrl}/dashboard/artisan/abonnement`;

  const body = `
    <p style="font-size:15px;color:#374151;margin:0 0 20px">
      Bonjour <strong>${data.artisanPrenom}</strong>,
    </p>
    <p style="font-size:15px;color:#374151;margin:0 0 24px">
      Votre compte artisan a ete desactive suite a un <strong>${motifLabel(data.motif)}</strong>.
    </p>
    <div style="background:#fef2f2;border-radius:12px;border:1px solid #fecaca;padding:16px 20px;margin-bottom:24px">
      <ul style="margin:0;padding-left:20px;font-size:13px;color:#b91c1c;line-height:1.8">
        <li>Votre profil n'est plus visible sur la carte</li>
        <li>Vous ne recevrez plus de nouvelles demandes de reservation</li>
        <li>Vos reservations en cours ne sont pas affectees</li>
      </ul>
    </div>
    ${ctaButton("Reactiver mon abonnement", reactiverUrl)}`;

  await sendEmail({
    to: [{ email: data.artisanEmail, name: data.artisanPrenom }],
    subject: `Votre compte Manobra a ete desactive`,
    htmlContent: wrapHtml("Compte artisan desactive", body),
  });
}

// ─── Email 6 : rappel 24h avant au CLIENT ────────────────────────────────────

export interface RappelClientEmailData {
  clientEmail: string;
  clientPrenom: string;
  artisanNomComplet: string;
  serviceTitre: string;
  date: string;
  heureDebut: string;
  adresse: string | null;
  siteUrl: string;
}

export async function sendEmailRappelClient(
  data: RappelClientEmailData
): Promise<void> {
  const dashUrl = `${data.siteUrl}/dashboard/client/reservations`;
  const templateId = getTemplateId("BREVO_TEMPLATE_RAPPEL_CLIENT");

  if (templateId) {
    await sendEmail({
      to: [{ email: data.clientEmail, name: data.clientPrenom }],
      templateId,
      params: {
        prenom: data.clientPrenom,
        service: data.serviceTitre,
        artisan: data.artisanNomComplet,
        date: formatDate(data.date),
        heure: sliceHM(data.heureDebut),
        adresse: data.adresse ?? "",
        dashboard_url: dashUrl,
      },
    });
    return;
  }

  const body = `
    <p style="font-size:15px;color:#374151;margin:0 0 20px">
      Bonjour <strong>${data.clientPrenom}</strong>,
    </p>
    <p style="font-size:15px;color:#374151;margin:0 0 24px">
      Votre rendez-vous a lieu <strong>demain</strong> !
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:24px;border-collapse:collapse">
      <tr><td colspan="2" style="padding:12px 16px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;border-bottom:1px solid #e5e7eb">
        Rappel de votre rendez-vous
      </td></tr>
      ${detailRow("Service", data.serviceTitre)}
      ${detailRow("artisan", data.artisanNomComplet)}
      ${detailRow("Date", formatDate(data.date))}
      ${detailRow("Heure", sliceHM(data.heureDebut))}
      ${data.adresse ? detailRow("Adresse", data.adresse) : ""}
    </table>
    ${ctaButton("Voir mes reservations", dashUrl)}`;

  await sendEmail({
    to: [{ email: data.clientEmail, name: data.clientPrenom }],
    subject: `Rappel - ${data.serviceTitre} demain avec ${data.artisanNomComplet}`,
    htmlContent: wrapHtml("Votre rendez-vous est demain !", body),
  });
}

// ─── Email 7 : rappel 24h avant au artisan ───────────────────────────────

export interface RappelPrestaEmailData {
  artisanEmail: string;
  artisanPrenom: string;
  clientNomComplet: string;
  serviceTitre: string;
  date: string;
  heureDebut: string;
  adresse: string | null;
  siteUrl: string;
}

export async function sendEmailRappelartisan(
  data: RappelPrestaEmailData
): Promise<void> {
  const dashUrl = `${data.siteUrl}/dashboard/artisan/reservations`;
  const templateId = getTemplateId("BREVO_TEMPLATE_RAPPEL_artisan");

  if (templateId) {
    await sendEmail({
      to: [{ email: data.artisanEmail, name: data.artisanPrenom }],
      templateId,
      params: {
        prenom: data.artisanPrenom,
        client: data.clientNomComplet,
        service: data.serviceTitre,
        date: formatDate(data.date),
        heure: sliceHM(data.heureDebut),
        adresse: data.adresse ?? "",
        dashboard_url: dashUrl,
      },
    });
    return;
  }

  const body = `
    <p style="font-size:15px;color:#374151;margin:0 0 20px">
      Bonjour <strong>${data.artisanPrenom}</strong>,
    </p>
    <p style="font-size:15px;color:#374151;margin:0 0 24px">
      Vous avez une intervention <strong>demain</strong>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:24px;border-collapse:collapse">
      <tr><td colspan="2" style="padding:12px 16px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;border-bottom:1px solid #e5e7eb">
        Rappel d'intervention
      </td></tr>
      ${detailRow("Client", data.clientNomComplet)}
      ${detailRow("Service", data.serviceTitre)}
      ${detailRow("Date", formatDate(data.date))}
      ${detailRow("Heure", sliceHM(data.heureDebut))}
      ${data.adresse ? detailRow("Adresse", data.adresse) : ""}
    </table>
    ${ctaButton("Voir mes reservations", dashUrl)}`;

  await sendEmail({
    to: [{ email: data.artisanEmail, name: data.artisanPrenom }],
    subject: `Rappel - Intervention demain pour ${data.clientNomComplet}`,
    htmlContent: wrapHtml("Votre intervention est demain !", body),
  });
}

// ─── Email 8 : demande d'avis au CLIENT ──────────────────────────────────────

export interface DemandeAvisEmailData {
  clientEmail: string;
  clientPrenom: string;
  artisanNomComplet: string;
  serviceTitre: string;
  date: string;
  reservationId: string;
  siteUrl: string;
}

export async function sendEmailDemandeAvis(
  data: DemandeAvisEmailData
): Promise<void> {
  const ref = data.reservationId.slice(0, 8).toUpperCase();
  const avisUrl = `${data.siteUrl}/avis/${data.reservationId}`;
  const templateId = getTemplateId("BREVO_TEMPLATE_AVIS_CLIENT");

  if (templateId) {
    await sendEmail({
      to: [{ email: data.clientEmail, name: data.clientPrenom }],
      templateId,
      params: {
        prenom: data.clientPrenom,
        artisan: data.artisanNomComplet,
        service: data.serviceTitre,
        date: formatDate(data.date),
        reference: ref,
        avis_url: avisUrl,
      },
    });
    return;
  }

  const body = `
    <p style="font-size:15px;color:#374151;margin:0 0 20px">
      Bonjour <strong>${data.clientPrenom}</strong>,
    </p>
    <p style="font-size:15px;color:#374151;margin:0 0 24px">
      Votre prestation avec <strong>${data.artisanNomComplet}</strong>
      (<em>${data.serviceTitre}</em>) est terminee. Votre avis aide d'autres clients.
    </p>
    <div style="background:#fffbeb;border-radius:12px;border:1px solid #fde68a;padding:16px 20px;margin-bottom:24px;text-align:center">
      <p style="font-size:24px;margin:0 0 4px">&#11088;&#11088;&#11088;&#11088;&#11088;</p>
      <p style="font-size:14px;color:#92400e;margin:0">Cela ne prend que 30 secondes !</p>
    </div>
    ${ctaButton("Laisser mon avis", avisUrl)}
    <p style="font-size:13px;color:#9ca3af;text-align:center;margin:16px 0 0">
      Ref. ${ref} - Merci de votre confiance !
    </p>`;

  await sendEmail({
    to: [{ email: data.clientEmail, name: data.clientPrenom }],
    subject: `Votre avis sur ${data.serviceTitre} - ${data.artisanNomComplet}`,
    htmlContent: wrapHtml("Comment s'est passee votre prestation ?", body),
  });
}

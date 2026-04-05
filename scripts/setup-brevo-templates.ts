/**
 * setup-brevo-templates.ts
 *
 * Crée les 5 templates d'emails transactionnels dans Brevo via le SDK v4,
 * puis écrit les IDs dans .env.local.
 *
 * Usage :
 *   npx tsx --env-file=.env.local scripts/setup-brevo-templates.ts
 */

import { BrevoClient } from "@getbrevo/brevo";
import * as fs from "node:fs";
import * as path from "node:path";

// ─── Charger .env.local manuellement ─────────────────────────────────────────

const ENV_FILE = path.resolve(process.cwd(), ".env.local");

if (fs.existsSync(ENV_FILE)) {
  const lines = fs.readFileSync(ENV_FILE, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// ─── Vérifications ────────────────────────────────────────────────────────────

const API_KEY = process.env.BREVO_API_KEY;
if (!API_KEY) {
  console.error("❌  BREVO_API_KEY manquant dans .env.local");
  console.error("    Ajoutez : BREVO_API_KEY=votre_cle_api");
  process.exit(1);
}

const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL ?? "noreply@maplateforme.fr";
const SENDER_NAME  = process.env.BREVO_SENDER_NAME  ?? "Ma Plateforme";
const SITE_URL     = process.env.NEXT_PUBLIC_SITE_URL ?? "https://maplateforme.fr";

const client = new BrevoClient({ apiKey: API_KEY });

// ─── Helpers HTML ─────────────────────────────────────────────────────────────

const BRAND = "#22c55e";
const YEAR  = new Date().getFullYear();

function wrapHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f6;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:580px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
        <tr>
          <td style="background:${BRAND};padding:28px 32px;text-align:center">
            <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700">${title}</h1>
          </td>
        </tr>
        <tr><td style="padding:32px">${body}</td></tr>
        <tr>
          <td style="background:#f8faf8;padding:16px 32px;text-align:center;border-top:1px solid #e8f0e8">
            <p style="margin:0;font-size:12px;color:#9ca3af">
              Email automatique — Ne pas répondre.<br>&copy; ${YEAR} Ma Plateforme
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 16px;font-size:14px;color:#6b7280;white-space:nowrap">${label}</td>
    <td style="padding:8px 16px;font-size:14px;color:#111827;font-weight:500">${value}</td>
  </tr>`;
}

function btn(text: string, url: string): string {
  return `<div style="text-align:center;margin:28px 0 8px">
    <a href="${url}" style="display:inline-block;padding:13px 28px;background:${BRAND};color:#fff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px">${text}</a>
  </div>`;
}

// ─── Définitions des 5 templates ─────────────────────────────────────────────

interface TemplateDefinition {
  envKey: string;
  templateName: string;
  subject: string;
  htmlContent: string;
}

const TEMPLATES: TemplateDefinition[] = [
  // ── Template 1 : Confirmation réservation CLIENT ──────────────────────────
  {
    envKey: "BREVO_TEMPLATE_CONFIRMATION_CLIENT",
    templateName: "Manobra - Confirmation reservation client",
    subject: "Demande envoyée – {{params.service}} avec {{params.artisan}}",
    htmlContent: wrapHtml(
      "Votre demande a été envoyée !",
      `<p style="font-size:15px;color:#374151;margin:0 0 20px">Bonjour <strong>{{params.prenom}}</strong>,</p>
      <p style="font-size:15px;color:#374151;margin:0 0 24px">
        Votre demande de réservation a bien été transmise à <strong>{{params.artisan}}</strong>
        (<em>{{params.metier}}</em>). Vous serez notifié(e) dès confirmation.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:24px;border-collapse:collapse">
        <tr><td colspan="2" style="padding:12px 16px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;border-bottom:1px solid #e5e7eb">
          Réf. {{params.reference}}
        </td></tr>
        ${row("Service", "{{params.service}}")}
        ${row("artisan", "{{params.artisan}} — {{params.metier}}")}
        ${row("Date", "{{params.date}}")}
        ${row("Horaire", "{{params.heure}}")}
        ${row("Adresse", "{{params.adresse}}")}
        ${row("Montant estimé", "{{params.montant}}")}
        ${row("Statut", "⏳ En attente de confirmation")}
      </table>
      ${btn("Voir mes réservations", "{{params.dashboard_url}}")}
      <p style="font-size:13px;color:#9ca3af;text-align:center;margin:16px 0 0">
        Le paiement sera traité après confirmation du artisan.
      </p>`
    ),
  },

  // ── Template 2 : Nouvelle réservation artisan ─────────────────────────
  {
    envKey: "BREVO_TEMPLATE_NOTIF_artisan",
    templateName: "Manobra - Nouvelle reservation artisan",
    subject: "Nouvelle demande de {{params.client}} – {{params.service}}",
    htmlContent: wrapHtml(
      "Nouvelle demande de réservation",
      `<p style="font-size:15px;color:#374151;margin:0 0 20px">Bonjour <strong>{{params.prenom}}</strong>,</p>
      <p style="font-size:15px;color:#374151;margin:0 0 24px">
        Vous avez reçu une nouvelle demande de réservation de la part de <strong>{{params.client}}</strong>.
        Connectez-vous pour l'accepter ou la refuser.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:24px;border-collapse:collapse">
        <tr><td colspan="2" style="padding:12px 16px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;border-bottom:1px solid #e5e7eb">
          Nouvelle demande
        </td></tr>
        ${row("Client", "{{params.client}}")}
        ${row("Service demandé", "{{params.service}}")}
        ${row("Date", "{{params.date}}")}
        ${row("Horaire", "{{params.heure}}")}
        ${row("Adresse", "{{params.adresse}}")}
        ${row("Montant", "{{params.montant}}")}
      </table>
      ${btn("Voir la demande", "{{params.dashboard_url}}")}
      <p style="font-size:13px;color:#9ca3af;text-align:center;margin:16px 0 0">
        Répondez rapidement pour assurer la satisfaction de votre client.
      </p>`
    ),
  },

  // ── Template 3 : Rappel 24h avant CLIENT ─────────────────────────────────
  {
    envKey: "BREVO_TEMPLATE_RAPPEL_CLIENT",
    templateName: "Manobra - Rappel 24h client",
    subject: "Rappel – {{params.service}} demain avec {{params.artisan}}",
    htmlContent: wrapHtml(
      "Votre rendez-vous est demain !",
      `<p style="font-size:15px;color:#374151;margin:0 0 20px">Bonjour <strong>{{params.prenom}}</strong>,</p>
      <p style="font-size:15px;color:#374151;margin:0 0 24px">
        Votre rendez-vous a lieu <strong>demain</strong> ! Voici un rappel des détails :
      </p>
      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:24px;border-collapse:collapse">
        <tr><td colspan="2" style="padding:12px 16px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;border-bottom:1px solid #e5e7eb">
          Rappel de votre rendez-vous
        </td></tr>
        ${row("Service", "{{params.service}}")}
        ${row("artisan", "{{params.artisan}}")}
        ${row("Date", "{{params.date}}")}
        ${row("Heure", "{{params.heure}}")}
        ${row("Adresse", "{{params.adresse}}")}
      </table>
      ${btn("Voir mes réservations", "{{params.dashboard_url}}")}
      <p style="font-size:13px;color:#9ca3af;text-align:center;margin:16px 0 0">
        En cas d'empêchement, contactez votre artisan dès que possible.
      </p>`
    ),
  },

  // ── Template 4 : Rappel 24h avant artisan ────────────────────────────
  {
    envKey: "BREVO_TEMPLATE_RAPPEL_artisan",
    templateName: "Manobra - Rappel 24h artisan",
    subject: "Rappel – Intervention demain pour {{params.client}}",
    htmlContent: wrapHtml(
      "Votre intervention est demain !",
      `<p style="font-size:15px;color:#374151;margin:0 0 20px">Bonjour <strong>{{params.prenom}}</strong>,</p>
      <p style="font-size:15px;color:#374151;margin:0 0 24px">
        Vous avez une intervention <strong>demain</strong>. Voici les détails :
      </p>
      <table width="100%" cellpadding="0" cellspacing="0"
             style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:24px;border-collapse:collapse">
        <tr><td colspan="2" style="padding:12px 16px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;border-bottom:1px solid #e5e7eb">
          Rappel d'intervention
        </td></tr>
        ${row("Client", "{{params.client}}")}
        ${row("Service", "{{params.service}}")}
        ${row("Date", "{{params.date}}")}
        ${row("Heure", "{{params.heure}}")}
        ${row("Adresse", "{{params.adresse}}")}
      </table>
      ${btn("Voir mes réservations", "{{params.dashboard_url}}")}
      <p style="font-size:13px;color:#9ca3af;text-align:center;margin:16px 0 0">
        Préparez-vous bien pour cette intervention !
      </p>`
    ),
  },

  // ── Template 5 : Demande d'avis CLIENT ───────────────────────────────────
  {
    envKey: "BREVO_TEMPLATE_AVIS_CLIENT",
    templateName: "Manobra - Demande avis client",
    subject: "Votre avis sur {{params.service}} – {{params.artisan}}",
    htmlContent: wrapHtml(
      "Comment s'est passée votre prestation ?",
      `<p style="font-size:15px;color:#374151;margin:0 0 20px">Bonjour <strong>{{params.prenom}}</strong>,</p>
      <p style="font-size:15px;color:#374151;margin:0 0 24px">
        Votre prestation avec <strong>{{params.artisan}}</strong>
        (<em>{{params.service}}</em>) du <strong>{{params.date}}</strong>
        est terminée. Votre avis aide d'autres clients à choisir les meilleurs artisans.
      </p>
      <div style="background:#fffbeb;border-radius:12px;border:1px solid #fde68a;padding:16px 20px;margin-bottom:24px;text-align:center">
        <p style="font-size:28px;margin:0 0 4px">&#11088;&#11088;&#11088;&#11088;&#11088;</p>
        <p style="font-size:14px;color:#92400e;margin:0">Cela ne prend que 30 secondes !</p>
      </div>
      ${btn("Laisser mon avis", "{{params.avis_url}}")}
      <p style="font-size:13px;color:#9ca3af;text-align:center;margin:16px 0 0">
        Réf. {{params.reference}} — Merci de votre confiance !
      </p>`
    ),
  },
];

// ─── Utilitaire : mettre à jour .env.local ────────────────────────────────────

function updateEnvFile(key: string, value: string): void {
  let content = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, "utf-8") : "";
  const regex = new RegExp(`^${key}=.*$`, "m");
  const line  = `${key}=${value}`;
  if (regex.test(content)) {
    content = content.replace(regex, line);
  } else {
    content = content.trimEnd() + `\n${line}\n`;
  }
  fs.writeFileSync(ENV_FILE, content, "utf-8");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("🚀  Création des templates Brevo…\n");
  console.log(`    Expéditeur : ${SENDER_NAME} <${SENDER_EMAIL}>`);
  console.log(`    Site       : ${SITE_URL}\n`);

  const results: Record<string, number> = {};

  for (const tpl of TEMPLATES) {
    process.stdout.write(`  📧  ${tpl.templateName} … `);
    try {
      const response = await client.transactionalEmails.createSmtpTemplate({
        templateName: tpl.templateName,
        subject:      tpl.subject,
        htmlContent:  tpl.htmlContent,
        sender:       { email: SENDER_EMAIL, name: SENDER_NAME },
        isActive:     true,
      });
      const id = response.id;
      results[tpl.envKey] = id;
      updateEnvFile(tpl.envKey, String(id));
      console.log(`✅  ID=${id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`❌  Erreur : ${msg}`);
    }
  }

  console.log("\n─────────────────────────────────────────────────────");
  console.log("📋  Variables ajoutées dans .env.local :\n");
  for (const [key, id] of Object.entries(results)) {
    console.log(`    ${key}=${id}`);
  }
  console.log("\n✅  Terminé ! Redémarrez votre serveur Next.js.\n");
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});

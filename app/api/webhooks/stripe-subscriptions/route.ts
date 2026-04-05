import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendEmailAbonnementActif,
  sendEmailAbonnementDesactive,
} from "@/lib/brevo";

// ─── Empêche le cache Next.js ─────────────────────────────────────────────────
export const dynamic = "force-dynamic";

// ─── Stripe ───────────────────────────────────────────────────────────────────
// stripe initialized lazily via getStripe()

/**
 * Secret propre à ce endpoint. Configurer dans Stripe Dashboard →
 * Webhooks → "Add endpoint" → URL : /api/webhooks/stripe-subscriptions.
 * Par défaut, utilise STRIPE_WEBHOOK_SECRET si non défini.
 */
const webhookSecret =
  process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET ??
  process.env.STRIPE_WEBHOOK_SECRET ??
  "";

// ─── Statuts "actifs" (profil visible) vs "inactifs" ─────────────────────────

const ACTIVE_STATUSES = new Set(["active", "trialing"]);
const INACTIVE_STATUSES = new Set(["past_due", "canceled", "unpaid", "paused"]);

function isActive(status: string): boolean {
  return ACTIVE_STATUSES.has(status);
}

function isInactive(status: string): boolean {
  return INACTIVE_STATUSES.has(status);
}

/** Détermine plan_actif depuis un price_id Stripe. */
function planFromPriceId(priceId: string): "essentiel" | "pro" | "aucun" {
  if (priceId === process.env.STRIPE_PRICE_ESSENTIEL) return "essentiel";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  return "aucun";
}

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
  );
}

// ─── Handler : customer.subscription.created ─────────────────────────────────

async function handleSubscriptionCreated(
  subscription: Stripe.Subscription
): Promise<void> {
  const admin = createAdminClient();

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  // Trouver le artisan
  const { data: prestaData } = await admin
    .from("profiles_artisans")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  const presta = prestaData as { id: string } | null;
  if (!presta) {
    console.warn(
      `[StripeSubscriptions] subscription.created : artisan introuvable pour customer ${customerId}`
    );
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id ?? "";
  const plan = planFromPriceId(priceId);
  const status = subscription.status;
  const periodEnd = (
    subscription as unknown as { current_period_end?: number }
  ).current_period_end;
  const endDate = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;

  const shouldBeActive = isActive(status);

  // Mettre à jour le profil
  const { error } = await admin
    .from("profiles_artisans")
    .update({
      actif: shouldBeActive,
      plan_actif: shouldBeActive ? plan : "aucun",
      stripe_subscription_id: subscription.id,
      subscription_status: status,
      subscription_end_date: endDate,
    } as never)
    .eq("id", presta.id);

  if (error) {
    console.error(
      "[StripeSubscriptions] Erreur mise à jour subscription.created :",
      error.message
    );
    return;
  }

  console.log(
    `[StripeSubscriptions] subscription.created → id=${presta.id}, actif=${shouldBeActive}, plan=${plan}`
  );

  // Envoyer email si actif
  if (shouldBeActive && plan !== "aucun") {
    await sendActivationEmail(presta.id, plan);
  }
}

// ─── Handler : customer.subscription.updated ─────────────────────────────────

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const admin = createAdminClient();

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  // Trouver le artisan avec son statut actuel (pour détecter la transition)
  const { data: prestaData } = await admin
    .from("profiles_artisans")
    .select("id, actif, subscription_status")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  const presta = prestaData as {
    id: string;
    actif: boolean | null;
    subscription_status: string | null;
  } | null;

  if (!presta) {
    console.warn(
      `[StripeSubscriptions] subscription.updated : artisan introuvable pour customer ${customerId}`
    );
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id ?? "";
  const plan = planFromPriceId(priceId);
  const newStatus = subscription.status;
  const oldStatus = presta.subscription_status ?? "";
  const periodEnd = (
    subscription as unknown as { current_period_end?: number }
  ).current_period_end;
  const endDate = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;

  const shouldBeActive = isActive(newStatus);
  const wasActive = presta.actif === true;

  // Mise à jour du profil
  const { error } = await admin
    .from("profiles_artisans")
    .update({
      actif: shouldBeActive,
      plan_actif: shouldBeActive ? plan : "aucun",
      stripe_subscription_id: subscription.id,
      subscription_status: newStatus,
      subscription_end_date: endDate,
    } as never)
    .eq("id", presta.id);

  if (error) {
    console.error(
      "[StripeSubscriptions] Erreur mise à jour subscription.updated :",
      error.message
    );
    return;
  }

  console.log(
    `[StripeSubscriptions] subscription.updated → id=${presta.id}, ` +
    `${oldStatus} → ${newStatus}, actif=${shouldBeActive}, plan=${plan}`
  );

  // Envoyer email seulement lors des transitions de statut
  if (!wasActive && shouldBeActive && plan !== "aucun") {
    // Réactivation : inactif → actif
    await sendActivationEmail(presta.id, plan);
  } else if (wasActive && isInactive(newStatus)) {
    // Désactivation : actif → inactif
    await sendDeactivationEmail(presta.id, newStatus);
  }
}

// ─── Handler : customer.subscription.deleted ─────────────────────────────────

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const admin = createAdminClient();

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  // Trouver le artisan
  const { data: prestaData } = await admin
    .from("profiles_artisans")
    .select("id, actif")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  const presta = prestaData as { id: string; actif: boolean | null } | null;
  if (!presta) {
    console.warn(
      `[StripeSubscriptions] subscription.deleted : artisan introuvable pour customer ${customerId}`
    );
    return;
  }

  const wasActive = presta.actif === true;

  const { error } = await admin
    .from("profiles_artisans")
    .update({
      actif: false,
      plan_actif: "aucun",
      stripe_subscription_id: null,
      subscription_status: "canceled",
      subscription_end_date: (() => {
        const pe = (subscription as unknown as { current_period_end?: number })
          .current_period_end;
        return pe ? new Date(pe * 1000).toISOString() : null;
      })(),
    } as never)
    .eq("id", presta.id);

  if (error) {
    console.error(
      "[StripeSubscriptions] Erreur mise à jour subscription.deleted :",
      error.message
    );
    return;
  }

  console.log(
    `[StripeSubscriptions] subscription.deleted → id=${presta.id}, actif=false`
  );

  // Email de désactivation seulement si le compte était actif
  if (wasActive) {
    await sendDeactivationEmail(presta.id, "canceled");
  }
}

// ─── Helpers : envoi d'emails ─────────────────────────────────────────────────

async function sendActivationEmail(
  prestaId: string,
  plan: "essentiel" | "pro"
): Promise<void> {
  const admin = createAdminClient();

  const [authRes, profileRes] = await Promise.all([
    admin.auth.admin.getUserById(prestaId),
    admin
      .from("profiles_artisans")
      .select("prenom")
      .eq("id", prestaId)
      .maybeSingle(),
  ]);

  const email = authRes.data.user?.email ?? "";
  const profile = profileRes.data as { prenom: string | null } | null;
  const prenom = profile?.prenom ?? email.split("@")[0] ?? "artisan";

  if (!email) {
    console.warn("[StripeSubscriptions] Email activation : email introuvable pour", prestaId);
    return;
  }

  sendEmailAbonnementActif({
    artisanEmail: email,
    artisanPrenom: prenom,
    planActif: plan,
    siteUrl: getSiteUrl(),
  }).catch((err) =>
    console.error("[StripeSubscriptions] Erreur email activation :", err)
  );
}

async function sendDeactivationEmail(
  prestaId: string,
  motif: string
): Promise<void> {
  const admin = createAdminClient();

  const [authRes, profileRes] = await Promise.all([
    admin.auth.admin.getUserById(prestaId),
    admin
      .from("profiles_artisans")
      .select("prenom")
      .eq("id", prestaId)
      .maybeSingle(),
  ]);

  const email = authRes.data.user?.email ?? "";
  const profile = profileRes.data as { prenom: string | null } | null;
  const prenom = profile?.prenom ?? email.split("@")[0] ?? "artisan";

  if (!email) {
    console.warn("[StripeSubscriptions] Email désactivation : email introuvable pour", prestaId);
    return;
  }

  sendEmailAbonnementDesactive({
    artisanEmail: email,
    artisanPrenom: prenom,
    motif,
    siteUrl: getSiteUrl(),
  }).catch((err) =>
    console.error("[StripeSubscriptions] Erreur email désactivation :", err)
  );
}

// ─── POST /api/webhooks/stripe-subscriptions ──────────────────────────────────

export async function POST(request: Request) {
  // 1. Body brut + signature
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("[StripeSubscriptions] Header stripe-signature manquant.");
    return NextResponse.json({ error: "Signature manquante." }, { status: 400 });
  }

  if (!webhookSecret) {
    console.error("[StripeSubscriptions] STRIPE_SUBSCRIPTION_WEBHOOK_SECRET non configuré.");
    return NextResponse.json(
      { error: "Configuration serveur incorrecte." },
      { status: 500 }
    );
  }

  // 2. Vérification signature Stripe
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature invalide.";
    console.error("[StripeSubscriptions] Signature invalide :", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  console.log(`[StripeSubscriptions] Événement reçu : ${event.type} (${event.id})`);

  // 3. Dispatcher
  try {
    switch (event.type) {
      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`[StripeSubscriptions] Événement ignoré : ${event.type}`);
    }
  } catch (err) {
    // Erreur métier : 200 pour éviter les re-tentatives Stripe
    console.error(`[StripeSubscriptions] Erreur traitement ${event.type} :`, err);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmailPaiementEchouClient } from "@/lib/brevo";

// ─── Empêche le cache Next.js sur cette route ─────────────────────────────────
export const dynamic = "force-dynamic";

// ─── Stripe instance ──────────────────────────────────────────────────────────
// stripe initialized lazily via getStripe()

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

// ─── Types internes ───────────────────────────────────────────────────────────

interface ReservationRow {
  id: string;
  statut: string;
  client_id: string;
  artisan_id: string;
  service_id: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  adresse_intervention: string | null;
  montant_total: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
  );
}

/** Détermine le plan actif depuis un price_id Stripe. */
function planFromPriceId(priceId: string): "essentiel" | "pro" | "aucun" {
  if (priceId === process.env.STRIPE_PRICE_ESSENTIEL) return "essentiel";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  return "aucun";
}

/**
 * Déclenche la route de notification de confirmation en mode fire-and-forget.
 * On ne bloque pas le webhook Stripe sur la réponse.
 */
function triggerConfirmationNotif(reservationId: string): void {
  const url = `${getSiteUrl()}/api/notifications/reservation-confirmee`;
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.CRON_SECRET
        ? { Authorization: `Bearer ${process.env.CRON_SECRET}` }
        : {}),
    },
    body: JSON.stringify({ reservation_id: reservationId }),
  }).catch((err) => {
    console.error(
      `[Webhook] Erreur appel /api/notifications/reservation-confirmee :`,
      err
    );
  });
}

// ─── Handler : payment_intent.succeeded ───────────────────────────────────────

async function handlePaymentSucceeded(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const admin = createAdminClient();

  // 1. Trouver la réservation via stripe_payment_intent_id
  const { data: reservation, error: fetchErr } = await admin
    .from("reservations")
    .select(
      "id, statut, client_id, artisan_id, service_id, date, heure_debut, heure_fin, adresse_intervention, montant_total"
    )
    .eq("stripe_payment_intent_id", paymentIntent.id)
    .maybeSingle();

  if (fetchErr) {
    console.error("[Webhook] Erreur récupération réservation :", fetchErr.message);
    return;
  }

  if (!reservation) {
    // Race condition : le webhook arrive avant POST /api/reservations/confirm
    console.warn(
      `[Webhook] Réservation non trouvée pour PI ${paymentIntent.id} – sera mis à jour lors de l'insertion.`
    );
    return;
  }

  const row = reservation as ReservationRow;

  // 2. Idempotence – ne rien faire si déjà dans un statut terminal
  if (row.statut === "confirme" || row.statut === "annule") {
    console.log(
      `[Webhook] Réservation ${row.id} déjà en statut "${row.statut}", ignorée.`
    );
    return;
  }

  // 3. Mise à jour du statut → confirme
  const { error: updateErr } = await admin
    .from("reservations")
    .update({ statut: "confirme" } as never)
    .eq("id", row.id);

  if (updateErr) {
    console.error("[Webhook] Erreur mise à jour statut :", updateErr.message);
    return;
  }

  console.log(`[Webhook] Réservation ${row.id} → confirme`);

  // 4. Déléguer l'envoi des emails à la route de notification (fire-and-forget)
  triggerConfirmationNotif(row.id);
}

// ─── Handler : payment_intent.payment_failed ─────────────────────────────────

async function handlePaymentFailed(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  const admin = createAdminClient();

  // 1. Chercher la réservation (peut ne pas encore exister | race condition)
  const { data: reservation, error: fetchErr } = await admin
    .from("reservations")
    .select("id, statut, client_id, montant_total")
    .eq("stripe_payment_intent_id", paymentIntent.id)
    .maybeSingle();

  if (fetchErr) {
    console.error("[Webhook] Erreur récupération réservation (failed) :", fetchErr.message);
  }

  const row = reservation as {
    id: string;
    statut: string;
    client_id: string;
    montant_total: number | null;
  } | null;

  // 2. Mettre à jour le statut si la réservation existe et n'est pas déjà terminée
  if (row && row.statut !== "annule" && row.statut !== "confirme") {
    const { error: updateErr } = await admin
      .from("reservations")
      .update({ statut: "annule" } as never)
      .eq("id", row.id);

    if (updateErr) {
      console.error(
        "[Webhook] Erreur mise à jour statut (annule) :",
        updateErr.message
      );
    } else {
      console.log(`[Webhook] Réservation ${row.id} → annule`);
    }
  }

  // 3. Envoyer l'email d'échec au client
  const clientId    = row?.client_id ?? paymentIntent.metadata?.client_id;
  const montantTotal = row?.montant_total ?? null;

  if (!clientId) {
    console.warn("[Webhook] Impossible d'envoyer email échec : client_id introuvable.");
    return;
  }

  const clientAuthRes = await admin.auth.admin.getUserById(clientId);
  const clientEmail   = clientAuthRes.data.user?.email ?? "";

  if (!clientEmail) {
    console.warn("[Webhook] Email client introuvable pour l'envoi de l'email d'échec.");
    return;
  }

  const clientProfileRes = await admin
    .from("profiles_clients")
    .select("prenom")
    .eq("id", clientId)
    .maybeSingle();

  const clientProfile = clientProfileRes.data as { prenom: string | null } | null;
  const clientPrenom  = clientProfile?.prenom ?? clientEmail.split("@")[0] ?? "Client";

  const lastError    = paymentIntent.last_payment_error;
  const errorMessage = lastError?.message ?? "Votre paiement a été refusé par votre banque.";

  sendEmailPaiementEchouClient({
    clientEmail,
    clientPrenom,
    montantTotal,
    paymentIntentId: paymentIntent.id,
    errorMessage,
    siteUrl: getSiteUrl(),
  }).catch((err) => {
    console.error("[Webhook] Erreur envoi email échec paiement :", err);
  });
}

// ─── Handler : account.updated ────────────────────────────────────────────────

async function handleAccountUpdated(account: Stripe.Account): Promise<void> {
  const admin = createAdminClient();

  const complete =
    account.details_submitted === true && account.charges_enabled === true;

  const { error } = await admin
    .from("profiles_artisans")
    .update({ stripe_onboarding_complete: complete } as never)
    .eq("stripe_account_id", account.id);

  if (error) {
    console.error(
      "[Webhook] Erreur mise à jour stripe_onboarding_complete :",
      error.message
    );
  } else {
    console.log(
      `[Webhook] account.updated → stripe_account_id=${account.id}, complete=${complete}`
    );
  }
}

// ─── Handler : checkout.session.completed (abonnements) ──────────────────────

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  // On ne traite que les sessions en mode abonnement
  if (session.mode !== "subscription") return;

  const userId       = session.metadata?.supabase_user_id;
  const plan         = session.metadata?.plan as "essentiel" | "pro" | undefined;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  if (!userId || !plan || !subscriptionId || !customerId) {
    console.warn("[Webhook] checkout.session.completed : métadonnées manquantes.", {
      userId,
      plan,
      subscriptionId,
      customerId,
    });
    return;
  }

  // Récupérer la subscription complète pour avoir la date de fin
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  // current_period_end retiré des types TS Stripe (clover API) → accès runtime
  const subPeriodEnd = (
    subscription as unknown as { current_period_end?: number }
  ).current_period_end;
  const endDate = subPeriodEnd
    ? new Date(subPeriodEnd * 1000).toISOString()
    : null;

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles_artisans")
    .update({
      stripe_customer_id:    customerId,
      stripe_subscription_id: subscriptionId,
      plan_actif:             plan,
      subscription_status:    subscription.status,
      subscription_end_date:  endDate,
    } as never)
    .eq("id", userId);

  if (error) {
    console.error(
      "[Webhook] Erreur mise à jour abonnement (checkout) :",
      error.message
    );
  } else {
    console.log(
      `[Webhook] Abonnement activé → user=${userId}, plan=${plan}, status=${subscription.status}`
    );
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

  // Trouver le artisan par customer ID
  const { data: prestaData } = await admin
    .from("profiles_artisans")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  const presta = prestaData as { id: string } | null;
  if (!presta) {
    console.warn(
      `[Webhook] subscription.updated : artisan introuvable pour customer ${customerId}`
    );
    return;
  }

  // Déterminer le plan depuis le price_id
  const priceId  = subscription.items.data[0]?.price?.id ?? "";
  const plan     = planFromPriceId(priceId);
  const periodEnd = (
    subscription as unknown as { current_period_end?: number }
  ).current_period_end;
  const endDate  = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;

  const { error } = await admin
    .from("profiles_artisans")
    .update({
      stripe_subscription_id: subscription.id,
      plan_actif:             plan,
      subscription_status:    subscription.status,
      subscription_end_date:  endDate,
    } as never)
    .eq("id", presta.id);

  if (error) {
    console.error(
      "[Webhook] Erreur mise à jour subscription.updated :",
      error.message
    );
  } else {
    console.log(
      `[Webhook] subscription.updated → id=${presta.id}, plan=${plan}, status=${subscription.status}`
    );
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

  // Trouver le artisan par customer ID
  const { data: prestaData } = await admin
    .from("profiles_artisans")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  const presta = prestaData as { id: string } | null;
  if (!presta) {
    console.warn(
      `[Webhook] subscription.deleted : artisan introuvable pour customer ${customerId}`
    );
    return;
  }

  const periodEnd = (
    subscription as unknown as { current_period_end?: number }
  ).current_period_end;

  const { error } = await admin
    .from("profiles_artisans")
    .update({
      stripe_subscription_id: null,
      plan_actif:             "aucun",
      subscription_status:    "canceled",
      subscription_end_date:  periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
    } as never)
    .eq("id", presta.id);

  if (error) {
    console.error(
      "[Webhook] Erreur mise à jour subscription.deleted :",
      error.message
    );
  } else {
    console.log(
      `[Webhook] subscription.deleted → id=${presta.id}, plan → aucun`
    );
  }
}

// ─── POST /api/webhooks/stripe ────────────────────────────────────────────────

export async function POST(request: Request) {
  // 1. Lire le body brut (nécessaire pour la vérification de signature Stripe)
  const body      = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("[Webhook] Header stripe-signature manquant.");
    return NextResponse.json({ error: "Signature manquante." }, { status: 400 });
  }

  if (!webhookSecret) {
    console.error("[Webhook] STRIPE_WEBHOOK_SECRET non configuré.");
    return NextResponse.json(
      { error: "Configuration serveur incorrecte." },
      { status: 500 }
    );
  }

  // 2. Vérifier la signature Stripe
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature invalide.";
    console.error("[Webhook] Signature Stripe invalide :", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  console.log(`[Webhook] Événement reçu : ${event.type} (${event.id})`);

  // 3. Dispatcher selon le type d'événement
  try {
    switch (event.type) {
      // ── Paiements ponctuels (réservations) ────────────────────────────────
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      // ── Stripe Connect ─────────────────────────────────────────────────────
      case "account.updated":
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      // ── Abonnements ────────────────────────────────────────────────────────
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      default:
        console.log(`[Webhook] Événement ignoré : ${event.type}`);
    }
  } catch (err) {
    // Erreur métier : on logue mais on retourne 200 pour éviter les re-tentatives
    console.error(`[Webhook] Erreur traitement ${event.type} :`, err);
  }

  // 4. Toujours retourner 200 après traitement (sauf signature invalide ci-dessus)
  return NextResponse.json({ received: true }, { status: 200 });
}

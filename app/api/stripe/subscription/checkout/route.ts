import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Plan = "essentiel" | "pro";

function getPriceId(plan: Plan): string | undefined {
  if (plan === "essentiel") return process.env.STRIPE_PRICE_ESSENTIEL;
  if (plan === "pro") return process.env.STRIPE_PRICE_PRO;
}

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
  );
}

// ─── POST /api/stripe/subscription/checkout ──────────────────────────────────

export async function POST(request: Request) {
  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  // 2. Role check — artisans uniquement
  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileData as { role: string } | null;
  if (profile?.role !== "artisan") {
    return NextResponse.json(
      { error: "Accès réservé aux artisans." },
      { status: 403 }
    );
  }

  // 3. Parse plan
  const body = (await request.json()) as { plan?: string };
  const plan = body.plan as Plan | undefined;
  if (!plan || !["essentiel", "pro"].includes(plan)) {
    return NextResponse.json({ error: "Plan invalide." }, { status: 400 });
  }

  const priceId = getPriceId(plan);
  if (!priceId) {
    return NextResponse.json(
      {
        error: `Prix Stripe non configuré pour le plan "${plan}". Vérifiez STRIPE_PRICE_${plan.toUpperCase()} dans .env.local.`,
      },
      { status: 500 }
    );
  }

  const admin = createAdminClient();
  const siteUrl = getSiteUrl();

  // 4. Récupérer les données artisan
  const { data: prestaData } = await admin
    .from("profiles_artisans")
    .select("stripe_customer_id, plan_actif")
    .eq("id", user.id)
    .maybeSingle();

  const presta = prestaData as {
    stripe_customer_id: string | null;
    plan_actif: string;
  } | null;

  // 5. Si déjà sur ce plan → rediriger vers portail (évite les doublons)
  if (presta?.plan_actif === plan) {
    const portalRes = await createPortalSession(
      presta.stripe_customer_id!,
      siteUrl
    );
    if (portalRes) return NextResponse.json({ url: portalRes }, { status: 200 });
    return NextResponse.json(
      { error: "Vous êtes déjà abonné à ce plan." },
      { status: 409 }
    );
  }

  // 6. Obtenir ou créer le Customer Stripe
  let customerId = presta?.stripe_customer_id ?? null;
  if (!customerId) {
    const authRes = await admin.auth.admin.getUserById(user.id);
    const email = authRes.data.user?.email ?? "";

    const customer = await stripe.customers.create({
      email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;

    // Sauvegarder le customer_id
    await admin
      .from("profiles_artisans")
      .update({ stripe_customer_id: customerId } as never)
      .eq("id", user.id);
  }

  // 7. Créer la session Checkout en mode abonnement
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/dashboard/artisan/abonnement?subscription=success`,
    cancel_url: `${siteUrl}/dashboard/artisan/abonnement?subscription=cancelled`,
    allow_promotion_codes: true,
    metadata: {
      supabase_user_id: user.id,
      plan,
    },
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
        plan,
      },
    },
  });

  return NextResponse.json({ url: session.url }, { status: 201 });
}

// ─── Helper interne : créer une session portail ───────────────────────────────

async function createPortalSession(
  customerId: string,
  siteUrl: string
): Promise<string | null> {
  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl}/dashboard/artisan/abonnement`,
    });
    return portalSession.url;
  } catch {
    return null;
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
  );
}

// ─── POST /api/stripe/subscription/portal ────────────────────────────────────

export async function POST() {
  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const admin = createAdminClient();

  // 2. Récupérer le stripe_customer_id
  const { data: prestaData } = await admin
    .from("profiles_artisans")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const presta = prestaData as { stripe_customer_id: string | null } | null;

  if (!presta?.stripe_customer_id) {
    return NextResponse.json(
      { error: "Aucun compte Stripe associé. Souscrivez d'abord à un plan." },
      { status: 400 }
    );
  }

  // 3. Créer la session Customer Portal
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: presta.stripe_customer_id,
    return_url: `${getSiteUrl()}/dashboard/artisan/abonnement`,
  });

  return NextResponse.json({ url: portalSession.url }, { status: 200 });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

/**
 * GET /api/stripe/connect/callback
 *
 * Stripe redirige ici après que le artisan a complété (ou quitté)
 * le formulaire d'onboarding Express.
 *
 * 1. Récupère le stripe_account_id depuis la base.
 * 2. Vérifie le statut du compte via l'API Stripe.
 * 3. Met à jour stripe_onboarding_complete en base.
 * 4. Redirige vers /dashboard/artisan/abonnement avec un paramètre de statut.
 */
export async function GET() {
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const abonnementUrl = `${siteUrl}/dashboard/artisan/abonnement`;

  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${siteUrl}/auth/login`);
  }

  // ── 2. Récupération du stripe_account_id ─────────────────────────────────
  const { data: prestaData } = await supabase
    .from("profiles_artisans")
    .select("stripe_account_id")
    .eq("id", user.id)
    .maybeSingle();

  const presta = prestaData as { stripe_account_id: string | null } | null;
  const accountId = presta?.stripe_account_id;

  if (!accountId) {
    return NextResponse.redirect(`${abonnementUrl}?stripe=error`);
  }

  // ── 3. Vérification du statut via Stripe ─────────────────────────────────
  let complete = false;
  try {
    const account = await stripe.accounts.retrieve(accountId);
    complete = (account.details_submitted ?? false) && (account.charges_enabled ?? false);
  } catch (err) {
    console.error("[Stripe] Erreur récupération compte:", err);
    return NextResponse.redirect(`${abonnementUrl}?stripe=error`);
  }

  // ── 4. Mise à jour en base ────────────────────────────────────────────────
  await supabase
    .from("profiles_artisans")
    // @ts-expect-error – @supabase/ssr@0.5.x / supabase-js generic mismatch
    .update({ stripe_onboarding_complete: complete })
    .eq("id", user.id);

  // ── 5. Redirection ────────────────────────────────────────────────────────
  return NextResponse.redirect(
    `${abonnementUrl}?stripe=${complete ? "success" : "pending"}`
  );
}

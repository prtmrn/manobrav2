import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

/**
 * GET /api/stripe/connect/onboard
 *
 * 1. Crée (ou récupère) un compte Stripe Express pour le artisan.
 * 2. Génère un AccountLink d'onboarding.
 * 3. Redirige vers l'URL Stripe.
 */
export async function GET() {
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${siteUrl}/auth/login`);
  }

  // ── 2. Rôle artisan ──────────────────────────────────────────────────
  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileData as { role: string } | null;
  if (!profile || profile.role !== "artisan") {
    return NextResponse.redirect(`${siteUrl}/dashboard`);
  }

  // ── 3. Récupération du stripe_account_id existant ────────────────────────
  const { data: prestaData } = await supabase
    .from("profiles_artisans")
    .select("stripe_account_id")
    .eq("id", user.id)
    .maybeSingle();

  const presta = prestaData as { stripe_account_id: string | null } | null;
  let accountId = presta?.stripe_account_id ?? null;

  // ── 4. Création du compte Express si nécessaire ──────────────────────────
  if (!accountId) {
    try {
      const account = await stripe.accounts.create({
        type: "express",
        metadata: { supabase_user_id: user.id },
      });
      accountId = account.id;

      // Sauvegarde du stripe_account_id en base
      await supabase
        .from("profiles_artisans")
        // @ts-expect-error – @supabase/ssr@0.5.x / supabase-js generic mismatch
        .update({ stripe_account_id: accountId })
        .eq("id", user.id);
    } catch (err) {
      console.error("[Stripe] Erreur création compte Express:", err);
      return NextResponse.redirect(
        `${siteUrl}/dashboard/artisan/abonnement?stripe=error`
      );
    }
  }

  // ── 5. Génération du lien d'onboarding ───────────────────────────────────
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${siteUrl}/api/stripe/connect/onboard`,
      return_url: `${siteUrl}/api/stripe/connect/callback`,
      type: "account_onboarding",
    });

    return NextResponse.redirect(accountLink.url);
  } catch (err) {
    console.error("[Stripe] Erreur génération AccountLink:", err);
    return NextResponse.redirect(
      `${siteUrl}/dashboard/artisan/abonnement?stripe=error`
    );
  }
}

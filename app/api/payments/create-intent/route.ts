import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

// ─── Schema Zod ───────────────────────────────────────────────────────────────

const CreateIntentSchema = z.object({
  artisanId: z.string().uuid({ message: "artisanId doit être un UUID valide." }),
  montantTotal: z
    .number({ error: "montantTotal doit être un nombre." })
    .finite({ message: "montantTotal doit être un nombre fini." })
    .positive({ message: "Le montant doit être supérieur à 0." })
    .min(0.5, { message: "Le montant minimum est de 0,50 €." })
    .max(100_000, { message: "Le montant maximum est de 100 000 €." }),
});

// ─── POST /api/payments/create-intent ────────────────────────────────────────

export async function POST(request: Request) {
  const supabase = await createClient();

  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  // ── 2. Rôle client ───────────────────────────────────────────────────────
  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileData as { role: string } | null;
  if (!profile || profile.role !== "client") {
    return NextResponse.json(
      { error: "Seuls les clients peuvent initier un paiement." },
      { status: 403 }
    );
  }

  // ── 3. Validation Zod ────────────────────────────────────────────────────
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide." }, { status: 400 });
  }

  const parsed = CreateIntentSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides." },
      { status: 422 }
    );
  }

  const { artisanId, montantTotal } = parsed.data;

  // ── 4. Récupération du compte Stripe du artisan ──────────────────────
  const { data: prestaData } = await supabase
    .from("profiles_artisans")
    .select("stripe_account_id, stripe_onboarding_complete, actif")
    .eq("id", artisanId)
    .maybeSingle();

  const presta = prestaData as {
    stripe_account_id: string | null;
    stripe_onboarding_complete: boolean;
    actif: boolean;
  } | null;

  if (!presta || !presta.actif) {
    return NextResponse.json(
      { error: "artisan introuvable ou inactif." },
      { status: 404 }
    );
  }

  if (!presta?.stripe_account_id) {
    return NextResponse.json(
      {
        error:
          "Le artisan n'a pas encore configuré son compte de paiement Stripe.",
      },
      { status: 400 }
    );
  }

  if (!presta.stripe_onboarding_complete) {
    return NextResponse.json(
      {
        error:
          "Le compte Stripe du artisan n'est pas encore validé. Veuillez réessayer ultérieurement.",
      },
      { status: 400 }
    );
  }

  // ── 5. Calcul des montants (en centimes) ─────────────────────────────────
  const amountCents = Math.round(montantTotal * 100);
  // Commission plateforme : 10 %
  const feeCents = Math.round(amountCents * 0.1);

  // ── 6. Création du PaymentIntent ──────────────────────────────────────────
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "eur",
      // La commission (10 %) reste sur le compte plateforme
      application_fee_amount: feeCents,
      // Le solde net (90 %) est reversé au artisan
      transfer_data: {
        destination: presta.stripe_account_id,
      },
      metadata: {
        client_id: user.id,
        artisan_id: artisanId,
        montant_total_eur: montantTotal.toString(),
        commission_eur: (feeCents / 100).toString(),
      },
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json(
      { clientSecret: paymentIntent.client_secret },
      { status: 201 }
    );
  } catch (err) {
    console.error("[Stripe] Erreur création PaymentIntent :", err);
    return NextResponse.json(
      {
        error:
          "Impossible d'initialiser le paiement. Veuillez réessayer.",
      },
      { status: 500 }
    );
  }
}

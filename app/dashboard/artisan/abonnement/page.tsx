import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AbonnementView from "@/components/dashboard/artisan/AbonnementView";

export const metadata = { title: "Mon abonnement – Dashboard artisan" };

type SearchParams = Promise<{ stripe?: string; subscription?: string }>;

type PrestaAbonnement = {
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  stripe_customer_id: string | null;
  plan_actif: "aucun" | "essentiel" | "pro";
  subscription_status: string | null;
  subscription_end_date: string | null;
};

export default async function AbonnementPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: prestaData } = await supabase
    .from("profiles_artisans")
    .select(
      "stripe_account_id, stripe_onboarding_complete, stripe_customer_id, plan_actif, subscription_status, subscription_end_date"
    )
    .eq("id", user.id)
    .maybeSingle();

  const presta = prestaData as PrestaAbonnement | null;
  const { stripe: stripeStatus, subscription: subscriptionParam } = await searchParams;

  return (
    <AbonnementView
      planActif={presta?.plan_actif ?? "aucun"}
      subscriptionStatus={presta?.subscription_status ?? null}
      subscriptionEndDate={presta?.subscription_end_date ?? null}
      hasStripeCustomer={!!presta?.stripe_customer_id}
      stripeAccountId={presta?.stripe_account_id ?? null}
      stripeComplete={presta?.stripe_onboarding_complete ?? false}
      stripeStatus={stripeStatus}
      subscriptionParam={subscriptionParam}
    />
  );
}

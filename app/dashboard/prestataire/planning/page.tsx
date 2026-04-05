import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PlanningClient from "@/components/planning/PlanningClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mon planning | Manobra",
};

export default async function PlanningPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile as { role: string }).role !== "artisan") {
    redirect("/dashboard");
  }

  // Fetch disponibilités + indisponibilités en parallèle
  const today = new Date().toISOString().split("T")[0];

  const [dispoRes, indispoRes] = await Promise.all([
    supabase
      .from("disponibilites")
      .select("*")
      .eq("artisan_id", user.id)
      .order("jour_semaine", { ascending: true })
      .order("heure_debut", { ascending: true }),

    supabase
      .from("indisponibilites")
      .select("*")
      .eq("artisan_id", user.id)
      .gte("date_fin", today) // uniquement présentes/futures
      .order("date_debut", { ascending: true }),
  ]);

  return (
    <PlanningClient
      userId={user.id}
      initialDispos={(dispoRes.data ?? []) as import("@/types").Tables<"disponibilites">[]}
      initialIndispos={(indispoRes.data ?? []) as import("@/types").Tables<"indisponibilites">[]}
    />
  );
}

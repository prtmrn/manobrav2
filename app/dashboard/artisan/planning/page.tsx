import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import PlanningClient from "@/components/planning/PlanningClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mon planning | Manobra" };
export const dynamic = "force-dynamic";

export default async function PlanningPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || (profile as { role: string }).role !== "artisan") redirect("/dashboard");

  const admin = createAdminClient();
  const today = new Date().toISOString().split("T")[0];
  const in60days = new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0];

  const [artisanRes, dispoRes, indispoRes, resaRes] = await Promise.all([
    admin.from("profiles_artisans").select("google_calendar_connected").eq("id", user.id).single(),
    admin.from("disponibilites").select("*").eq("artisan_id", user.id).order("jour_semaine").order("heure_debut"),
    admin.from("indisponibilites").select("*").eq("artisan_id", user.id).gte("date_fin", today).order("date_debut"),
    admin.from("reservations_detail")
      .select("id, date, heure_debut, heure_fin, statut, service_titre, client_nom, client_prenom, adresse_intervention")
      .eq("artisan_id", user.id)
      .in("statut", ["confirme", "en_cours", "en_attente"])
      .gte("date", today)
      .lte("date", in60days)
      .order("date").order("heure_debut"),
  ]);

  return (
    <PlanningClient
      userId={user.id}
      googleCalendarConnected={(artisanRes.data as any)?.google_calendar_connected ?? false}
      initialDispos={(dispoRes.data ?? []) as any[]}
      initialIndispos={(indispoRes.data ?? []) as any[]}
      initialReservations={(resaRes.data ?? []) as any[]}
    />
  );
}

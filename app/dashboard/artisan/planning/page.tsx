import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import PlanningClient from "@/components/planning/PlanningClient";
import UrgenceWidget from "@/components/dashboard/artisan/UrgenceWidget";
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
  const in90days = new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0];

  const [artisanRes, dispoRes, indispoRes, resaRes] = await Promise.all([
    admin.from("profiles_artisans").select("google_calendar_connected, urgence_actif, urgence_fin, urgence_sanction_fin, delai_entre_interventions_minutes, disponible_urgence").eq("id", user.id).single(),
    admin.from("disponibilites").select("*").eq("artisan_id", user.id).order("jour_semaine").order("heure_debut"),
    admin.from("indisponibilites").select("*").eq("artisan_id", user.id).gte("date_fin", today).order("date_debut"),
    admin.from("reservations_detail")
      .select("id, date, heure_debut, heure_fin, statut, service_titre, client_nom, client_prenom, adresse_intervention")
      .eq("artisan_id", user.id)
      .in("statut", ["confirme", "en_cours", "en_attente"])
      .gte("date", today)
      .lte("date", in90days)
      .order("date").order("heure_debut"),
  ]);

  const artisanData = artisanRes.data as any;

  return (
    <div>
      <div className="max-w-3xl mx-auto px-4 pt-6">
        <UrgenceWidget
          urgenceActif={artisanData?.urgence_actif ?? false}
          urgenceFin={artisanData?.urgence_fin ?? null}
          urgenceSanctionFin={artisanData?.urgence_sanction_fin ?? null}
          delaiEntreInterventions={artisanData?.delai_entre_interventions_minutes ?? 60}
          disponibleUrgence={artisanData?.disponible_urgence ?? false}
          artisanId={user.id}
        />
      </div>
      <PlanningClient
      userId={user.id}
      googleCalendarConnected={artisanData?.google_calendar_connected ?? false}
      initialDispos={(dispoRes.data ?? []) as any[]}
      initialIndispos={(indispoRes.data ?? []) as any[]}
      initialReservations={(resaRes.data ?? []) as any[]}
    />
    </div>
  );
}

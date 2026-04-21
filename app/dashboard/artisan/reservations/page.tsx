import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import PrestaReservationsView from "@/components/dashboard/artisan/PrestaReservationsView";
import type { ReservationStatut } from "@/types";

export const metadata: Metadata = { title: "Réservations reçues" };

export type PrestaReservationItem = {
  id: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  statut: ReservationStatut;
  adresse_intervention: string | null;
  montant_total: number | null;
  created_at: string;
  client_id: string | null;
  client_nom: string | null;
  client_prenom: string | null;
  client_photo_url: string | null;
  service_titre: string | null;
};

export default async function PrestaReservationsPage() {
  const supabase = await createClient();

  // ── Auth ──────────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileData as { role: string } | null;
  if (profile?.role !== "artisan") redirect("/dashboard");

  // ── Fetch via la vue enrichie ─────────────────────────────────────────────
  const admin = createAdminClient();
  console.log("[DEBUG] artisan user.id:", user.id);
  const { data, error: fetchError } = await admin
    .from("reservations_detail")
    .select(
      "id, date, heure_debut, heure_fin, statut, adresse_intervention, " +
      "montant_total, created_at, client_id, client_nom, client_prenom, " +
      "client_photo_url, service_titre"
    )
    .eq("artisan_id", user.id)
    .order("date", { ascending: false });
  console.log("[DEBUG] reservations data:", JSON.stringify(data), "error:", fetchError);

  const reservations = (data ?? []) as unknown as PrestaReservationItem[];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-gray-900">Réservations reçues</h1>
        <p className="text-gray-500 text-sm mt-1">
          Gérez les demandes de vos clients et mettez à jour l&apos;avancement.
        </p>
      </div>
      <PrestaReservationsView reservations={reservations} />
    </div>
  );
}

import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import ClientReservationsView from "@/components/dashboard/ClientReservationsView";
import type { ReservationStatut } from "@/types";

export const metadata: Metadata = { title: "Mes réservations" };

export type ReservationItem = {
  id: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  statut: ReservationStatut;
  adresse_intervention: string | null;
  montant_total: number | null;
  created_at: string;
  artisan_id: string | null;
  artisan_nom: string | null;
  artisan_prenom: string | null;
  artisan_metier: string | null;
  artisan_photo_url: string | null;
  service_titre: string | null;
};

export default async function ClientReservationsPage() {
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
  if (profile?.role !== "client") redirect("/dashboard");

  // ── Fetch réservations via la vue enrichie ────────────────────────────────
  const { data } = await supabase
    .from("reservations_detail")
    .select(
      "id, date, heure_debut, heure_fin, statut, adresse_intervention, " +
      "montant_total, created_at, artisan_id, artisan_nom, " +
      "artisan_prenom, artisan_metier, artisan_photo_url, service_titre"
    )
    .eq("client_id", user.id)
    .order("date", { ascending: false });

  const reservations = (data ?? []) as ReservationItem[];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-gray-900">Mes réservations</h1>
        <p className="text-gray-500 text-sm mt-1">
          Suivez et gérez toutes vos demandes de prestation.
        </p>
      </div>
      <ClientReservationsView reservations={reservations} />
    </div>
  );
}

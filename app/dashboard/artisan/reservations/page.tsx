import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import PrestaReservationsView from "@/components/dashboard/artisan/PrestaReservationsView";
import type { ReservationStatut } from "@/types";
export const metadata: Metadata = { title: "Réservations reçues" };
export const dynamic = "force-dynamic";
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
  guest_email: string | null;
  guest_nom: string | null;
  service_titre: string | null;
  message_initial: string | null;
  conversation_id: string | null;
};
export default async function PrestaReservationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileData as { role: string } | null;
  if (profile?.role !== "artisan") redirect("/dashboard");
  const admin = createAdminClient();
  const { data } = await admin
    .from("reservations_detail")
    .select(
      "id, date, heure_debut, heure_fin, statut, adresse_intervention, " +
      "montant_total, created_at, client_id, client_nom, client_prenom, guest_email, guest_nom, service_titre"
    )
    .eq("artisan_id", user.id)
    .order("date", { ascending: false });

  const rawResas = (data ?? []) as any[];

  const reservations: PrestaReservationItem[] = await Promise.all(
    rawResas.map(async (r) => {
      const { data: convData } = await (admin as any)
        .from("conversations")
        .select("id")
        .eq("reservation_id", r.id)
        .maybeSingle();

      let messageInitial: string | null = null;
      if (convData?.id) {
        const { data: firstMsg } = await (admin as any)
          .from("messages")
          .select("contenu")
          .eq("conversation_id", convData.id)
          .eq("type", "texte")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        messageInitial = firstMsg?.contenu ?? null;
      }

      return {
        ...r,
        conversation_id: convData?.id ?? null,
        message_initial: messageInitial,
      } as PrestaReservationItem;
    })
  );

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

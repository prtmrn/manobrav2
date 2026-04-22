import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ReservationTunnel from "@/components/reservation/ReservationTunnel";
import type { Tartisan, TService } from "@/components/reservation/ReservationTunnel";

interface PageProps {
  params: Promise<{ artisan_id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { artisan_id } = await params;
  const supabase = await createClient();
  const metaRes = await supabase
    .from("profiles_artisans")
    .select("nom, prenom, metier")
    .eq("id", artisan_id)
    .maybeSingle();
  const metaData = metaRes.data as { nom: string | null; prenom: string | null; metier: string | null } | null;
  if (!metaData) return { title: "Réservation" };
  const fullName = `${metaData.prenom ?? ""} ${metaData.nom ?? ""}`.trim();
  return {
    title: `Réserver avec ${fullName}`,
    description: `Réservez une prestation avec ${fullName}.`,
    robots: { index: false, follow: false },
  };
}

export default async function ReserverPage({ params }: PageProps) {
  const { artisan_id } = await params;
  const supabase = await createClient();

  // Authentification optionnelle
  const { data: { user } } = await supabase.auth.getUser();

  // Si connecté en tant qu'artisan, rediriger
  if (user) {
    const profileRes = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const profile = profileRes.data as { role: string } | null;
    if (profile?.role === "artisan") {
      redirect("/dashboard/artisan");
    }
  }

  const [artisanRes, servicesRes] = await Promise.all([
    supabase
      .from("profiles_artisans")
      .select("id, nom, prenom, metier, photo_url, ville, note_moyenne, abonnement_pro")
      .eq("id", artisan_id)
      .eq("actif", true)
      .maybeSingle(),
    supabase
      .from("services")
      .select("id, titre, description, duree_minutes, prix, categorie")
      .eq("artisan_id", artisan_id)
      .eq("actif", true)
      .order("prix", { ascending: true }),
  ]);

  if (!artisanRes.data) notFound();

  let clientProfile: { prenom: string | null; nom: string | null; telephone: string | null } | null = null;
  if (user) {
    const admin = createAdminClient();
    const { data: cp } = await admin
      .from("profiles_clients")
      .select("prenom, nom, telephone")
      .eq("id", user.id)
      .maybeSingle();
    clientProfile = cp as any;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ReservationTunnel
        artisan={artisanRes.data as Tartisan}
        services={(servicesRes.data ?? []) as TService[]}
clientId={user?.id ?? null}
        clientProfile={clientProfile}
        isGuest={!user}
      />
    </div>
  );
}

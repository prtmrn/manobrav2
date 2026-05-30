import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ProfilArtisanClient from "./ProfilArtisanClient";

export const metadata: Metadata = {
  title: "Mon profil | Manobra",
};

export default async function ProfilArtisanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile as any).role !== "artisan") redirect("/dashboard");

  const adminClient = createAdminClient();
  const { data: artisan } = await (adminClient
    .from("profiles_artisans") as any)
    .select("nom, prenom, bio, metier, adresse, ville, code_postal, photo_url, siret, telephone, latitude, longitude, zone_intervention_km, tarif_horaire_min, tarif_horaire_max, frais_deplacement, disponible_urgence, assurance_rc_numero, assurance_rc_assureur, assurance_decennale_numero, assurance_decennale_assureur, qualification_cstb_numero, verification_status, verification_note")
    .eq("id", user.id)
    .single();

  return (
    <ProfilArtisanClient
      userId={user.id}
      email={user.email ?? ""}
      initialData={artisan ?? {}}
    />
  );
}

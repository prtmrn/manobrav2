import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import ProfilArtisanClient from "./ProfilArtisanClient";

export const metadata: Metadata = {
  title: "Mon profil — Manobra",
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

  const { data: artisan } = await supabase
    .from("profiles_artisans")
    .select("nom, prenom, bio, metier, adresse, ville, code_postal, photo_url")
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

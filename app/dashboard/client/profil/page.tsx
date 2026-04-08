import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import ProfilClientForm from "./ProfilClientForm";

export const metadata: Metadata = {
  title: "Mon profil | Manobra",
};

export default async function ProfilClientPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile as any).role !== "client") redirect("/dashboard");

  const { data: client } = await supabase
    .from("profiles_clients")
    .select("nom, prenom, telephone, adresse, ville, code_postal")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <ProfilClientForm
      userId={user.id}
      email={user.email ?? ""}
      initialData={client ?? {}}
    />
  );
}

import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import ServicesClient from "./ServicesClient";

export const metadata: Metadata = {
  title: "Mes services | Manobra",
};

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/dashboard/artisan/services");

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("artisan_id", user.id)
    .order("created_at", { ascending: false });

  return <ServicesClient userId={user.id} services={services ?? []} />;
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

/**
 * Dashboard racine : redirige vers le bon dashboard selon le rôle.
 *
 * artisan sans profil complet → /onboarding/artisan
 * artisan avec profil         → /dashboard/artisan
 * Client                          → /dashboard/client (à venir) ou page générique
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // @ts-ignore Supabase generated types
  // @ts-ignore
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (profile as any)?.role as UserRole | null;

  if (role === "artisan") {
    redirect("/dashboard/artisan");
  }

  if ((role as string) === "admin") redirect("/dashboard/admin");
  // Client — le middleware réécrit /dashboard → /dashboard/client
  return null;
}

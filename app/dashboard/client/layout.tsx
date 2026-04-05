import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import type { NavItem } from "@/components/dashboard/DashboardShell";

const navItems: NavItem[] = [
  {
    href: "/dashboard/client",
    label: "Accueil",
    icon: "home",
    exact: true,
  },
  {
    href: "/dashboard/client/recherche",
    label: "Trouver un artisan",
    icon: "search",
  },
  {
    href: "/dashboard/client/reservations",
    label: "Mes réservations",
    icon: "clipboard",
  },
  {
    href: "/dashboard/client/profil",
    label: "Mon profil",
    icon: "user",
  },
];

export default async function ClientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Vérification auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Vérification rôle
  // @ts-ignore Supabase generated types
  // @ts-ignore
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile as any).role !== "client") redirect("/dashboard");

  // Données de profil client
  // @ts-ignore
  const { data: client } = await supabase
    .from("profiles_clients")
    .select("nom, prenom")
    .eq("id", user.id)
    .single();

  const userName =
    (client as any)?.nom
      ? `${(client as any).prenom ?? ""} ${(client as any).nom}`.trim()
      : null;

  return (
    <DashboardShell
      navItems={navItems}
      userEmail={user.email ?? ""}
      userPhotoUrl={null}
      userName={userName}
      role="client"
    >
      {children}
    </DashboardShell>
  );
}

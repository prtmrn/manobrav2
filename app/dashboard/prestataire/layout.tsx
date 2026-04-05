import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import type { NavItem } from "@/components/dashboard/DashboardShell";

const navItems: NavItem[] = [
  {
    href: "/dashboard/artisan",
    label: "Accueil",
    icon: "home",
    exact: true,
  },
  {
    href: "/dashboard/artisan/profil",
    label: "Mon profil",
    icon: "user",
  },
  {
    href: "/dashboard/artisan/services",
    label: "Mes services",
    icon: "briefcase",
  },
  {
    href: "/dashboard/artisan/planning",
    label: "Mon planning",
    icon: "calendar",
  },
  {
    href: "/dashboard/artisan/reservations",
    label: "Mes réservations",
    icon: "clipboard",
  },
  {
    href: "/dashboard/artisan/abonnement",
    label: "Mon abonnement",
    icon: "credit-card",
  },
];

export default async function artisanDashboardLayout({
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

  if (!profile || (profile as any).role !== "artisan") redirect("/dashboard");

  // Données de profil pour l'affichage (header + sidebar)
  // @ts-ignore Supabase generated types
  // @ts-ignore
  const { data: artisan } = await supabase
    .from("profiles_artisans")
    .select("nom, prenom, photo_url")
    .eq("id", user.id)
    .single();

  const userName =
    (artisan as any)?.nom
      ? `${(artisan as any).prenom ?? ""} ${(artisan as any).nom}`.trim()
      : null;

  return (
    <DashboardShell
      navItems={navItems}
      userEmail={user.email ?? ""}
      userPhotoUrl={(artisan as any)?.photo_url ?? null}
      userName={userName}
      role="artisan"
    >
      {children}
    </DashboardShell>
  );
}

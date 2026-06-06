import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import DashboardShell from "@/components/dashboard/DashboardShell";
import type { NavItem } from "@/components/dashboard/DashboardShell";



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

  // Compter les messages non lus
  const admin = createAdminClient();
  const { count: unreadCount } = await (admin as any)
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("lu", false)
    .neq("auteur_id", user.id)
    .in("conversation_id",
      (await (admin as any)
        .from("conversations")
        .select("id")
        .eq("artisan_id", user.id)
        .then((r: any) => (r.data ?? []).map((c: any) => c.id)))
    );

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Accueil", icon: "home", exact: true },
    { href: "/dashboard/profil", label: "Mon profil", icon: "user" },
    { href: "/dashboard/services", label: "Mes services", icon: "briefcase" },
    { href: "/dashboard/planning", label: "Mon planning", icon: "calendar" },
    { href: "/dashboard/reservations", label: "Mes réservations", icon: "clipboard" },
    {
      href: "/dashboard/artisan/messages",
      label: "Messages",
      icon: "chat",
      badge: unreadCount && unreadCount > 0 ? String(unreadCount) : undefined,
    },
    { href: "/dashboard/abonnement", label: "Mon abonnement", icon: "credit-card" },
  ];

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

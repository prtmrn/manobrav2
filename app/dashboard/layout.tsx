import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientShell from "@/components/dashboard/ClientShell";

export default async function ClientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    .select("nom, prenom")
    .eq("id", user.id)
    .single();

  const userName = (client as any)?.prenom
    ? `${(client as any).prenom ?? ""} ${(client as any).nom ?? ""}`.trim()
    : null;

  return (
    <ClientShell userEmail={user.email ?? ""} userName={userName}>
      {children}
    </ClientShell>
  );
}

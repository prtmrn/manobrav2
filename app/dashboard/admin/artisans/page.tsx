import { createAdminClient } from "@/lib/supabase/admin";
import AdminArtisansTable from "@/components/admin/AdminArtisansTable";
export const dynamic = "force-dynamic";

export default async function AdminArtisansPage() {
  const admin = createAdminClient();
  const { data: artisans } = await (admin.from("profiles_artisans") as any)
    .select("id, nom, prenom, metier, ville, actif, siret, note_moyenne, nombre_avis, created_at, verification_status, verification_note, assurance_rc_numero, assurance_rc_assureur, assurance_decennale_numero, assurance_decennale_assureur, qualification_cstb_numero, bypass_verification")
    .order("created_at", { ascending: false });

  const { data: emails } = await admin.auth.admin.listUsers();
  const emailMap: Record<string, string> = {};
  for (const u of emails.users) emailMap[u.id] = u.email ?? "";

  return <AdminArtisansTable artisans={artisans ?? []} emailMap={emailMap} />;
}

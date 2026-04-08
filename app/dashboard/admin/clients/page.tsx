import { createAdminClient } from "@/lib/supabase/admin";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Clients | Admin Manobra" };
export const dynamic = "force-dynamic";

export default async function AdminClientsPage() {
  const admin = createAdminClient();

  const { data: authUsers } = await admin.auth.admin.listUsers();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, role, created_at")
    .eq("role", "client");

  const { data: clientProfiles } = await admin
    .from("profiles_clients")
    .select("id, nom, prenom");

  const { data: reservationsData } = await admin
    .from("reservations")
    .select("client_id");

  const emailMap = new Map(authUsers.users.map((u) => [u.id, u.email]));
  const clientProfileMap = new Map((clientProfiles ?? []).map((c: any) => [c.id, c]));
  const reservCount = new Map<string, number>();
  for (const r of reservationsData ?? []) {
    if (r.client_id) reservCount.set(r.client_id, (reservCount.get(r.client_id) ?? 0) + 1);
  }

  const list = (profiles ?? []) as Array<{ id: string; created_at: string }>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Clients</h1>
        <p className="text-sm text-gray-400 mt-1">{list.length} inscrits</p>
      </div>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Client</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Réservations</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Inscrit le</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {list.map((c) => {
              const cp = clientProfileMap.get(c.id) as any;
              const nom = cp ? `${cp.prenom ?? ""} ${cp.nom ?? ""}`.trim() : "N/A";
              const email = emailMap.get(c.id) ?? "N/A";
              const nbRes = reservCount.get(c.id) ?? 0;
              const date = new Date(c.created_at).toLocaleDateString("fr-FR", {
                day: "numeric", month: "short", year: "numeric"
              });
              return (
                <tr key={c.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{nom}</p>
                    <p className="text-xs text-gray-500">{email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-semibold ${nbRes > 0 ? "text-brand-400" : "text-gray-600"}`}>
                      {nbRes}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{date}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.length === 0 && (
          <div className="p-8 text-center text-gray-500 text-sm">Aucun client inscrit.</div>
        )}
      </div>
    </div>
  );
}

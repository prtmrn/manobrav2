import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Messages | Manobra" };
export const dynamic = "force-dynamic";

export default async function ClientMessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createAdminClient();

  const { data: conversations } = await (admin as any)
    .from("conversations")
    .select("id, reservation_id, derniere_activite, artisan_id")
    .eq("client_id", user.id)
    .order("derniere_activite", { ascending: false });

  const convs = conversations ?? [];

  const enriched = await Promise.all(convs.map(async (conv: any) => {
    const [lastMsgRes, unreadRes, artisanRes, resaRes] = await Promise.all([
      (admin as any).from("messages").select("contenu, type, created_at, auteur_id")
        .eq("conversation_id", conv.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      (admin as any).from("messages").select("id", { count: "exact", head: true })
        .eq("conversation_id", conv.id).eq("lu", false).neq("auteur_id", user.id),
      (admin as any).from("profiles_artisans").select("nom, prenom, metier, photo_url")
        .eq("id", conv.artisan_id).maybeSingle(),
      (admin as any).from("reservations").select("date, statut, heure_debut, heure_fin")
        .eq("id", conv.reservation_id).maybeSingle(),
    ]);

    const artisan = artisanRes.data;
    const artisanName = artisan ? `${artisan.prenom ?? ""} ${artisan.nom ?? ""}`.trim() : "Artisan";

    return { ...conv, artisanName, artisan, lastMessage: lastMsgRes.data, unreadCount: unreadRes.count ?? 0, reservation: resaRes.data };
  }));

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Messages</h1>
      {enriched.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">Aucune conversation pour le moment.</p>
          <p className="text-gray-400 text-xs mt-1">Les conversations apparaissent dès que vous faites une demande.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {enriched.map((conv: any) => (
            <Link key={conv.id} href={`/dashboard/messages/${conv.id}`}
              className={`block bg-white rounded-2xl border p-4 hover:shadow-md transition-all ${
                conv.unreadCount > 0 ? "border-green-200 bg-green-50/30" : "border-gray-100"
              }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-green-700">{conv.artisanName[0]?.toUpperCase() ?? "?"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-semibold truncate ${conv.unreadCount > 0 ? "text-gray-900" : "text-gray-700"}`}>
                      {conv.artisanName}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {conv.unreadCount > 0 && (
                        <span className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{conv.unreadCount}</span>
                      )}
                      {conv.lastMessage && (
                        <span className="text-[11px] text-gray-400">
                          {new Date(conv.lastMessage.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {conv.artisan?.metier ?? "Artisan"}
                    {conv.lastMessage ? ` · ${conv.lastMessage.type === "photo" ? "Photo" : conv.lastMessage.type === "devis" ? "Devis reçu" : conv.lastMessage.contenu}` : ""}
                  </p>
                  {conv.reservation && (
                    <span className={`inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      conv.reservation.statut === "confirme" ? "bg-green-100 text-green-700"
                      : conv.reservation.statut === "en_attente" ? "bg-amber-100 text-amber-700"
                      : conv.reservation.statut === "termine" ? "bg-gray-100 text-gray-500"
                      : "bg-red-100 text-red-600"
                    }`}>
                      {conv.reservation.statut === "en_attente" ? "En attente"
                        : conv.reservation.statut === "confirme" ? "Confirmée"
                        : conv.reservation.statut === "termine" ? "Terminée" : "Annulée"}
                      {conv.reservation.date ? ` · ${new Date(conv.reservation.date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` : ""}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

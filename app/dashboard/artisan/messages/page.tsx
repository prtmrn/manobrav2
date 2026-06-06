import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Messages | Manobra" };
export const dynamic = "force-dynamic";

export default async function ArtisanMessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createAdminClient();

  const { data: conversations } = await (admin as any)
    .from("conversations")
    .select("id, reservation_id, derniere_activite, client_id, guest_email")
    .eq("artisan_id", user.id)
    .order("derniere_activite", { ascending: false });

  const convs = conversations ?? [];
  const convIds = convs.map((c: any) => c.id);
  const resaIds = convs.map((c: any) => c.reservation_id);
  const clientIds = convs.map((c: any) => c.client_id).filter(Boolean);

  // Batch — 4 requêtes pour toutes les conversations
  const [allMsgsRes, allUnreadRes, allClientsRes, allResasRes] = await Promise.all([
    // Derniers messages (tous, on garde le plus récent par conv côté JS)
    convIds.length > 0
      ? (admin as any).from("messages")
          .select("conversation_id, contenu, type, created_at, auteur_id")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),

    // Nombre de non lus par conversation
    convIds.length > 0
      ? (admin as any).from("messages")
          .select("conversation_id, id")
          .in("conversation_id", convIds)
          .eq("lu", false)
          .neq("auteur_id", user.id)
      : Promise.resolve({ data: [] }),

    // Profils clients
    clientIds.length > 0
      ? (admin as any).from("profiles_clients")
          .select("id, nom, prenom")
          .in("id", clientIds)
      : Promise.resolve({ data: [] }),

    // Réservations
    resaIds.length > 0
      ? (admin as any).from("reservations")
          .select("id, date, statut")
          .in("id", resaIds)
      : Promise.resolve({ data: [] }),
  ]);

  // Indexer par conversation_id / id
  const lastMsgByConv: Record<string, any> = {};
  for (const msg of (allMsgsRes.data ?? [])) {
    if (!lastMsgByConv[msg.conversation_id]) lastMsgByConv[msg.conversation_id] = msg;
  }

  const unreadByConv: Record<string, number> = {};
  for (const msg of (allUnreadRes.data ?? [])) {
    unreadByConv[msg.conversation_id] = (unreadByConv[msg.conversation_id] ?? 0) + 1;
  }

  const clientById: Record<string, any> = {};
  for (const client of (allClientsRes.data ?? [])) {
    clientById[client.id] = client;
  }

  const resaById: Record<string, any> = {};
  for (const resa of (allResasRes.data ?? [])) {
    resaById[resa.id] = resa;
  }

  const enriched = convs.map((conv: any) => {
    const client = clientById[conv.client_id];
    const clientName = client && (client.prenom || client.nom)
      ? `${client.prenom ?? ""} ${client.nom ?? ""}`.trim()
      : conv.guest_email ?? "Client";

    return {
      ...conv,
      clientName,
      lastMessage: lastMsgByConv[conv.id] ?? null,
      unreadCount: unreadByConv[conv.id] ?? 0,
      reservation: resaById[conv.reservation_id] ?? null,
    };
  });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Messages</h1>

      {enriched.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">Aucune conversation pour le moment.</p>
          <p className="text-gray-400 text-xs mt-1">Les conversations apparaissent dès qu'un client fait une demande.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {enriched.map((conv: any) => (
            <Link
              key={conv.id}
              href={`/dashboard/artisan/messages/${conv.id}`}
              className={`block bg-white rounded-2xl border p-4 hover:shadow-md transition-all ${
                conv.unreadCount > 0 ? "border-brand-200 bg-brand-50/30" : "border-gray-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-brand-700">
                    {conv.clientName[0]?.toUpperCase() ?? "?"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-semibold truncate ${conv.unreadCount > 0 ? "text-gray-900" : "text-gray-700"}`}>
                      {conv.clientName}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {conv.unreadCount > 0 && (
                        <span className="bg-brand-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {conv.unreadCount}
                        </span>
                      )}
                      {conv.lastMessage && (
                        <span className="text-[11px] text-gray-400">
                          {new Date(conv.lastMessage.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {conv.lastMessage
                      ? conv.lastMessage.type === "photo" ? "Photo"
                        : conv.lastMessage.type === "devis" ? "Devis envoyé"
                        : conv.lastMessage.contenu
                      : "Aucun message"}
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
                        : conv.reservation.statut === "termine" ? "Terminée"
                        : "Annulée"}
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

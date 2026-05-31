import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import ChatWindow from "@/components/chat/ChatWindow";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ id: string }> }

export default async function ClientConversationPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const admin = createAdminClient();

  const { data: conv } = await (admin as any)
    .from("conversations")
    .select("id, reservation_id, artisan_id, client_id")
    .eq("id", id)
    .eq("client_id", user.id)
    .single();

  if (!conv) notFound();

  const [artisanRes, resaRes] = await Promise.all([
    (admin as any).from("profiles_artisans").select("nom, prenom, metier").eq("id", conv.artisan_id).maybeSingle(),
    (admin as any).from("reservations").select("date, statut, heure_debut, heure_fin").eq("id", conv.reservation_id).maybeSingle(),
  ]);

  const artisan = artisanRes.data;
  const artisanName = artisan ? `${artisan.prenom ?? ""} ${artisan.nom ?? ""}`.trim() : "Artisan";
  const resa = resaRes.data;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/dashboard/messages" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-green-700">{artisanName[0]?.toUpperCase() ?? "?"}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{artisanName}</p>
          {artisan?.metier && <p className="text-xs text-gray-500">{Array.isArray(artisan.metier) ? artisan.metier.join(" · ") : artisan.metier}</p>}
        </div>
        {resa && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
            resa.statut === "confirme" ? "bg-green-100 text-green-700"
            : resa.statut === "en_attente" ? "bg-amber-100 text-amber-700"
            : resa.statut === "termine" ? "bg-gray-100 text-gray-500"
            : "bg-red-100 text-red-600"
          }`}>
            {resa.statut === "en_attente" ? "En attente"
              : resa.statut === "confirme" ? "Confirmée"
              : resa.statut === "termine" ? "Terminée" : "Annulée"}
          </span>
        )}
      </div>

      <ChatWindow
        conversationId={conv.id}
        currentUserId={user.id}
        otherName={artisanName}
        isArtisan={false}
        reservationStatut={resa?.statut ?? "en_attente"}
      />
    </div>
  );
}

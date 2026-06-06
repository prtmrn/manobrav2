"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

interface Message {
  id: string;
  auteur_id: string;
  contenu: string | null;
  type: string;
  photo_url: string | null;
  lu: boolean;
  created_at: string;
}

interface Devis {
  id: string;
  message_id: string;
  montant: number;
  description: string | null;
  statut: string;
}

interface Props {
  conversationId: string;
  currentUserId: string;
  otherName: string;
  isArtisan: boolean;
  reservationStatut: string;
}

export default function ChatWindow({ conversationId, currentUserId, otherName, isArtisan, reservationStatut }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [devis, setDevis] = useState<Record<string, Devis>>({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showDevisForm, setShowDevisForm] = useState(false);
  const [devisMontant, setDevisMontant] = useState("");
  const [devisDesc, setDevisDesc] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  useEffect(() => {
    // Charger les messages
    async function load() {
      const { data } = await (supabase as any)
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (data) setMessages(data);

      // Charger les devis
      const msgIds = (data ?? []).filter((m: Message) => m.type === "devis").map((m: Message) => m.id);
      if (msgIds.length > 0) {
        const { data: devisData } = await (supabase as any)
          .from("devis_chat")
          .select("*")
          .in("message_id", msgIds);
        if (devisData) {
          const map: Record<string, Devis> = {};
          devisData.forEach((d: Devis) => { map[d.message_id] = d; });
          setDevis(map);
        }
      }

      // Marquer comme lu
      await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: conversationId }),
      });
    }
    load();

    // Realtime
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, async (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => [...prev, newMsg]);
        if (newMsg.type === "devis") {
          const { data } = await (supabase as any)
            .from("devis_chat").select("*").eq("message_id", newMsg.id).single();
          if (data) setDevis(prev => ({ ...prev, [newMsg.id]: data }));
        }
        if (newMsg.auteur_id !== currentUserId) {
          await fetch("/api/messages", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversation_id: conversationId }),
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, currentUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || sending) return;
    setSending(true);
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_id: conversationId, contenu: input.trim(), type: "texte" }),
    });
    setInput("");
    setSending(false);
  }

  async function sendPhoto(file: File) {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `chat/${conversationId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("chat-photos").upload(path, file);
    if (!error) {
      const { data: urlData } = supabase.storage.from("chat-photos").getPublicUrl(path);
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: conversationId, type: "photo", photo_url: urlData.publicUrl }),
      });
    }
    setUploading(false);
  }

  async function sendDevis() {
    if (!devisMontant || isNaN(parseFloat(devisMontant))) return;
    setSending(true);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_id: conversationId, type: "devis", contenu: `Devis : ${devisMontant}€` }),
    });
    const msg = await res.json();
    if (msg.id) {
      await (supabase as any).from("devis_chat").insert({
        message_id: msg.id,
        montant: parseFloat(devisMontant),
        description: devisDesc || null,
        statut: "en_attente",
      });
    }
    setDevisMontant("");
    setDevisDesc("");
    setShowDevisForm(false);
    setSending(false);
  }

  async function respondDevis(devisId: string, statut: "accepte" | "refuse") {
    await (supabase as any).from("devis_chat").update({ statut }).eq("id", devisId);
    setDevis(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(k => {
        if (updated[k].id === devisId) updated[k] = { ...updated[k], statut };
      });
      return updated;
    });
  }

  function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  }

  let lastDate = "";

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.map((msg) => {
          const isMe = msg.auteur_id === currentUserId;
          const msgDate = new Date(msg.created_at).toDateString();
          const showDate = msgDate !== lastDate;
          lastDate = msgDate;
          const d = devis[msg.id];

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="text-center my-3">
                  <span className="text-[11px] text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                    {fmtDate(msg.created_at)}
                  </span>
                </div>
              )}
              <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1`}>
                <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                  {msg.type === "photo" && msg.photo_url ? (
                    <div className={`rounded-2xl overflow-hidden ${isMe ? "rounded-tr-sm" : "rounded-tl-sm"}`}>
                      <Image src={msg.photo_url} alt="Photo" width={240} height={180} className="object-cover" unoptimized />
                    </div>
                  ) : msg.type === "devis" && d ? (
                    <div className={`rounded-2xl p-4 w-64 ${isMe ? "bg-brand-600 text-white rounded-tr-sm" : "bg-white border border-gray-200 rounded-tl-sm"}`}>
                      <p className={`text-xs font-semibold mb-1 ${isMe ? "text-brand-100" : "text-gray-500"}`}>Devis</p>
                      <p className={`text-2xl font-bold ${isMe ? "text-white" : "text-gray-900"}`}>{d.montant.toLocaleString("fr-FR")} €</p>
                      {d.description && <p className={`text-xs mt-1 ${isMe ? "text-brand-100" : "text-gray-500"}`}>{d.description}</p>}
                      {d.statut === "en_attente" && !isMe && (
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => respondDevis(d.id, "accepte")}
                            className="flex-1 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold">
                            Accepter
                          </button>
                          <button onClick={() => respondDevis(d.id, "refuse")}
                            className="flex-1 py-1.5 rounded-lg bg-red-100 text-red-600 text-xs font-semibold">
                            Refuser
                          </button>
                        </div>
                      )}
                      {d.statut !== "en_attente" && (
                        <span className={`inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          d.statut === "accepte" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                        }`}>
                          {d.statut === "accepte" ? "Accepté" : "Refusé"}
                        </span>
                      )}
                    </div>
                  ) : msg.contenu?.includes("meet.jit.si") ? (
                    <div className={`px-4 py-3 rounded-2xl ${
                      isMe ? "bg-brand-600 rounded-tr-sm" : "bg-white border border-gray-200 rounded-tl-sm"
                    }`}>
                      <p className={`text-xs font-medium mb-2 ${isMe ? "text-brand-100" : "text-gray-500"}`}>
                        Appel vidéo — diagnostic
                      </p>
                      
                        href={msg.contenu.match(/https:\/\/meet\.jit\.si\/\S+/)?.[0] ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                          isMe
                            ? "bg-white/20 hover:bg-white/30 text-white"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white"
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Rejoindre l&apos;appel
                      </a>
                    </div>
                  ) : (
                    <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                      isMe
                        ? "bg-brand-600 text-white rounded-tr-sm"
                        : "bg-white border border-gray-200 text-gray-900 rounded-tl-sm"
                    }`}>
                      {msg.contenu}
                    </div>
                  )}
                  <span className="text-[10px] text-gray-400 mt-0.5 px-1">{fmtTime(msg.created_at)}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Formulaire devis */}
      {showDevisForm && isArtisan && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-xs font-semibold text-gray-700 mb-2">Envoyer un devis</p>
          <div className="flex gap-2 mb-2">
            <input type="number" placeholder="Montant (€)" value={devisMontant}
              onChange={e => setDevisMontant(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500" />
          </div>
          <input type="text" placeholder="Description (optionnel)" value={devisDesc}
            onChange={e => setDevisDesc(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:border-brand-500" />
          <div className="flex gap-2">
            <button onClick={() => setShowDevisForm(false)}
              className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-600">
              Annuler
            </button>
            <button onClick={sendDevis} disabled={sending || !devisMontant}
              className="flex-1 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold disabled:opacity-50">
              Envoyer le devis
            </button>
          </div>
        </div>
      )}

      {/* Zone de saisie */}
      <div className="px-4 py-3 bg-white border-t border-gray-200">
        <div className="flex items-center gap-2">
          {/* Photo */}
          <button onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
            title="Envoyer une photo">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { if (e.target.files?.[0]) sendPhoto(e.target.files[0]); }} />

          {/* Devis — artisan seulement */}
          {isArtisan && (
            <button onClick={() => setShowDevisForm(v => !v)}
              className="p-2 rounded-xl text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors flex-shrink-0"
              title="Envoyer un devis">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          )}

          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Écrivez un message..."
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
          />
          <button onClick={sendMessage} disabled={!input.trim() || sending}
            className="p-2.5 rounded-xl bg-brand-600 text-white disabled:opacity-40 hover:bg-brand-700 transition-colors flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

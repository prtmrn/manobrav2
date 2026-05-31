"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminArtisanActions from "@/components/admin/AdminArtisanActions";

interface Artisan {
  id: string;
  nom: string | null;
  prenom: string | null;
  metier: string | string[] | null;
  ville: string | null;
  actif: boolean;
  siret: string | null;
  note_moyenne: number;
  nombre_avis: number;
  created_at: string;
  verification_status: string | null;
  verification_note: string | null;
  assurance_rc_numero: string | null;
  assurance_rc_assureur: string | null;
  assurance_decennale_numero: string | null;
  assurance_decennale_assureur: string | null;
  qualification_cstb_numero: string | null;
  bypass_verification: boolean;
}

interface Props {
  artisans: Artisan[];
  emailMap: Record<string, string>;
}

function VerifBadge({ status }: { status: string | null }) {
  switch (status) {
    case "verifie":    return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-900/60 text-emerald-400 border border-emerald-800 whitespace-nowrap">✓ Vérifié</span>;
    case "en_attente": return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-yellow-900/60 text-yellow-400 border border-yellow-800 whitespace-nowrap">⏳ Attente</span>;
    case "rejete":     return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-900/60 text-red-400 border border-red-800 whitespace-nowrap">✗ Rejeté</span>;
    default:           return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-800 text-gray-500 border border-gray-700 whitespace-nowrap">Non soumis</span>;
  }
}

export default function AdminArtisansTable({ artisans, emailMap }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "actifs" | "inactifs" | "en_attente">("all");

  const total = artisans.length;
  const actifs = artisans.filter((a) => a.actif).length;
  const inactifs = total - actifs;
  const enAttente = artisans.filter((a) => a.verification_status === "en_attente").length;

  const filtered = artisans.filter((a) => {
    if (filter === "actifs") return a.actif;
    if (filter === "inactifs") return !a.actif;
    if (filter === "en_attente") return a.verification_status === "en_attente";
    return true;
  });

  const allSelected = filtered.length > 0 && filtered.every((a) => selected.has(a.id));

  function toggleAll() {
    setSelected((s) => {
      const n = new Set(s);
      allSelected ? filtered.forEach((a) => n.delete(a.id)) : filtered.forEach((a) => n.add(a.id));
      return n;
    });
  }

  function toggleOne(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function bulkAction(action: "activer" | "desactiver" | "valider" | "rejeter" | "supprimer") {
    if (selected.size === 0) return;
    if (action === "supprimer" && !confirm(`Supprimer ${selected.size} artisan(s) ? Action irréversible.`)) return;
    setBulkLoading(true);
    await Promise.all(Array.from(selected).map(async (id) => {
      if (action === "activer" || action === "desactiver") {
        await fetch("/api/admin/artisans/toggle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ artisanId: id, actif: action === "activer" }) });
      } else if (action === "valider" || action === "rejeter") {
        await fetch("/api/admin/artisans/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ artisanId: id, status: action === "valider" ? "verifie" : "rejete", note: "" }) });
      } else if (action === "supprimer") {
        await fetch("/api/admin/artisans/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ artisanId: id }) });
      }
    }));
    setSelected(new Set());
    setBulkLoading(false);
    router.refresh();
  }

  const tabs: { label: string; value: typeof filter }[] = [
    { label: "Tous", value: "all" },
    { label: "Actifs", value: "actifs" },
    { label: "Inactifs", value: "inactifs" },
    { label: enAttente > 0 ? `En attente (${enAttente})` : "En attente", value: "en_attente" },
  ];

  return (
    <div className="p-4 space-y-3">
      <div>
        <h1 className="text-lg font-bold text-white">Artisans</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          {total} inscrits · {actifs} actifs · {inactifs} inactifs
          {enAttente > 0 && <span className="text-yellow-400"> · {enAttente} en attente</span>}
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button key={t.value} onClick={() => { setFilter(t.value); setSelected(new Set()); }}
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
              filter === t.value ? "bg-brand-600 text-white border-brand-600" : "bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-500"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {enAttente > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-xl px-3 py-2 flex items-center gap-2">
          <span className="text-yellow-400 text-sm">⚠️</span>
          <p className="text-yellow-300 text-xs"><span className="font-semibold">{enAttente} profil{enAttente > 1 ? "s" : ""}</span> en attente de vérification.</p>
        </div>
      )}

      {selected.size > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-white font-semibold">{selected.size} sélectionné{selected.size > 1 ? "s" : ""}</span>
          <div className="flex gap-1.5 flex-wrap ml-1">
            <button onClick={() => bulkAction("activer")} disabled={bulkLoading} className="text-[11px] px-2 py-1 rounded bg-green-900/50 text-green-400 border border-green-800 hover:bg-green-900 disabled:opacity-50 font-medium">Activer</button>
            <button onClick={() => bulkAction("desactiver")} disabled={bulkLoading} className="text-[11px] px-2 py-1 rounded bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600 disabled:opacity-50 font-medium">Désactiver</button>
            <button onClick={() => bulkAction("valider")} disabled={bulkLoading} className="text-[11px] px-2 py-1 rounded bg-emerald-900/50 text-emerald-400 border border-emerald-800 hover:bg-emerald-900 disabled:opacity-50 font-medium">✓ Valider</button>
            <button onClick={() => bulkAction("rejeter")} disabled={bulkLoading} className="text-[11px] px-2 py-1 rounded bg-orange-900/50 text-orange-400 border border-orange-800 hover:bg-orange-900 disabled:opacity-50 font-medium">Rejeter</button>
            <button onClick={() => bulkAction("supprimer")} disabled={bulkLoading} className="text-[11px] px-2 py-1 rounded bg-red-900/50 text-red-400 border border-red-800 hover:bg-red-900 disabled:opacity-50 font-medium">Supprimer</button>
          </div>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-[11px] text-gray-500 hover:text-gray-300">Annuler</button>
        </div>
      )}

      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="px-2 py-2 w-8 text-center">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 accent-brand-500 cursor-pointer" />
              </th>
              <th className="text-left px-2 py-2 font-semibold text-gray-400 uppercase tracking-wider text-[10px]">Artisan</th>
              <th className="text-left px-2 py-2 font-semibold text-gray-400 uppercase tracking-wider text-[10px] w-32">Métier</th>
              <th className="text-left px-2 py-2 font-semibold text-gray-400 uppercase tracking-wider text-[10px] w-20">Ville</th>
              <th className="text-left px-2 py-2 font-semibold text-gray-400 uppercase tracking-wider text-[10px] w-32">SIRET</th>
              <th className="text-left px-2 py-2 font-semibold text-gray-400 uppercase tracking-wider text-[10px] w-14">Avis</th>
              <th className="text-left px-2 py-2 font-semibold text-gray-400 uppercase tracking-wider text-[10px] w-16">Statut</th>
              <th className="text-left px-2 py-2 font-semibold text-gray-400 uppercase tracking-wider text-[10px] w-24">Vérification</th>
              <th className="text-left px-2 py-2 font-semibold text-gray-400 uppercase tracking-wider text-[10px]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/80">
            {filtered.map((a) => {
              const nom = `${a.prenom ?? ""} ${a.nom ?? ""}`.trim() || "Sans nom";
              const email = emailMap[a.id] ?? "";
              const date = new Date(a.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
              const metier = Array.isArray(a.metier) ? (a.metier as string[]).join(" · ") : (a.metier ?? "N/A");
              const isSelected = selected.has(a.id);
              return (
                <tr key={a.id} className={`transition-colors ${isSelected ? "bg-brand-900/20" : a.verification_status === "en_attente" ? "bg-yellow-900/5" : "hover:bg-gray-800/30"}`}>
                  <td className="px-2 py-2 text-center">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleOne(a.id)} className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 accent-brand-500 cursor-pointer" />
                  </td>
                  <td className="px-2 py-2 min-w-[140px]">
                    <p className="font-semibold text-white text-xs">{nom}</p>
                    <p className="text-gray-500 text-[10px]">{email}</p>
                    <p className="text-gray-600 text-[10px]">{date}</p>
                    {a.bypass_verification && <span className="text-[10px] text-purple-400 font-mono">bypass</span>}
                  </td>
                  <td className="px-2 py-2">
                    <span className="text-gray-300 block truncate max-w-[120px]" title={metier}>{metier}</span>
                  </td>
                  <td className="px-2 py-2">
                    <span className="text-gray-300 whitespace-nowrap">{a.ville ?? "N/A"}</span>
                  </td>
                  <td className="px-2 py-2">
                    <span className={`font-mono whitespace-nowrap ${a.siret ? "text-green-400" : "text-red-400"}`}>
                      {a.siret ?? "Manquant"}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    {a.nombre_avis > 0
                      ? <span className="text-yellow-400 whitespace-nowrap">★ {a.note_moyenne.toFixed(1)} ({a.nombre_avis})</span>
                      : <span className="text-gray-600">0</span>}
                  </td>
                  <td className="px-2 py-2">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${
                      a.actif ? "bg-green-900/50 text-green-400 border border-green-800" : "bg-red-900/50 text-red-400 border border-red-800"
                    }`}>
                      <span className={`w-1 h-1 rounded-full flex-shrink-0 ${a.actif ? "bg-green-400" : "bg-red-400"}`} />
                      {a.actif ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <VerifBadge status={a.verification_status} />
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1.5 flex-nowrap">
                      <Link href={`/prestataires/${a.id}`} target="_blank" className="text-[11px] text-brand-400 hover:text-brand-300 font-medium whitespace-nowrap">
                        Voir →
                      </Link>
                      <AdminArtisanActions
                        artisanId={a.id}
                        actif={a.actif}
                        verificationStatus={a.verification_status ?? "non_soumis"}
                        verificationNote={a.verification_note ?? ""}
                        assuranceRcNumero={a.assurance_rc_numero ?? ""}
                        assuranceRcAssureur={a.assurance_rc_assureur ?? ""}
                        assuranceDecennaleNumero={a.assurance_decennale_numero ?? ""}
                        assuranceDecennaleAssureur={a.assurance_decennale_assureur ?? ""}
                        qualificationCstbNumero={a.qualification_cstb_numero ?? ""}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-gray-500 text-xs">Aucun artisan.</div>
        )}
      </div>
    </div>
  );
}

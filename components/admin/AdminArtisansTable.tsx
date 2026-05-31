"use client";
import { useState, useRef, useEffect, useCallback } from "react";
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

const STORAGE_KEY = "manobra_admin_artisans_col_widths";

const DEFAULT_WIDTHS: Record<string, number> = {
  check:    32,
  artisan:  170,
  metier:   140,
  ville:    80,
  siret:    130,
  avis:     60,
  statut:   70,
  verif:    90,
  docs:     50,
  voir:     55,
  compte:   85,
  suppr:    80,
  modif:    70,
};

function loadWidths(): Record<string, number> {
  if (typeof window === "undefined") return DEFAULT_WIDTHS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_WIDTHS, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_WIDTHS;
}

function saveWidths(widths: Record<string, number>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(widths)); } catch {}
}

const COLS = [
  { key: "check",   label: "" },
  { key: "artisan", label: "Artisan" },
  { key: "metier",  label: "Métier" },
  { key: "ville",   label: "Ville" },
  { key: "siret",   label: "SIRET" },
  { key: "avis",    label: "Avis" },
  { key: "statut",  label: "Statut" },
  { key: "verif",   label: "Vérification" },
  { key: "docs",    label: "Docs" },
  { key: "voir",    label: "Voir" },
  { key: "compte",  label: "Compte" },
  { key: "suppr",   label: "Suppr." },
  { key: "modif",   label: "Modif." },
];

const TD = "px-2 py-1.5 text-[11px] overflow-hidden";
const TH_TEXT = "text-[10px] font-semibold text-gray-400 uppercase tracking-wider";

export default function AdminArtisansTable({ artisans, emailMap }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "actifs" | "inactifs" | "en_attente">("all");
  const [colWidths, setColWidths] = useState<Record<string, number>>(DEFAULT_WIDTHS);

  // Charger depuis localStorage après le mount
  useEffect(() => {
    setColWidths(loadWidths());
  }, []);

  // Resize state
  const resizing = useRef<{ key: string; startX: number; startW: number } | null>(null);

  const onResizeStart = useCallback((key: string, e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = { key, startX: e.clientX, startW: colWidths[key] };

    function onMove(ev: MouseEvent) {
      if (!resizing.current) return;
      const delta = ev.clientX - resizing.current.startX;
      const newW = Math.max(30, resizing.current.startW + delta);
      setColWidths((prev) => ({ ...prev, [resizing.current!.key]: newW }));
    }

    function onUp() {
      if (resizing.current) {
        setColWidths((prev) => {
          const next = { ...prev };
          saveWidths(next);
          return next;
        });
        resizing.current = null;
      }
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [colWidths]);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Artisans</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {total} inscrits · {actifs} actifs · {inactifs} inactifs
            {enAttente > 0 && <span className="text-yellow-400"> · {enAttente} en attente</span>}
          </p>
        </div>
        <button
          onClick={() => { saveWidths(DEFAULT_WIDTHS); setColWidths(DEFAULT_WIDTHS); }}
          className="text-[10px] text-gray-500 hover:text-gray-300 border border-gray-700 px-2 py-0.5 rounded transition-colors"
        >
          Réinitialiser colonnes
        </button>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {tabs.map((t) => (
          <button key={t.value} onClick={() => { setFilter(t.value); setSelected(new Set()); }}
            className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
              filter === t.value ? "bg-brand-600 text-white border-brand-600" : "bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-500"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {enAttente > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-lg px-3 py-2 flex items-center gap-2">
          <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
          <p className="text-yellow-300 text-[11px]"><span className="font-semibold">{enAttente} profil{enAttente > 1 ? "s" : ""}</span> en attente de vérification.</p>
        </div>
      )}

      {selected.size > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-white font-semibold">{selected.size} sélectionné{selected.size > 1 ? "s" : ""}</span>
          <div className="flex gap-1 flex-wrap ml-1">
            {[
              { action: "activer" as const,    label: "Activer",     cls: "text-green-400 border-green-800 hover:bg-green-900/50" },
              { action: "desactiver" as const, label: "Désactiver",  cls: "text-gray-300 border-gray-600 hover:bg-gray-700" },
              { action: "valider" as const,    label: "✓ Valider",   cls: "text-emerald-400 border-emerald-800 hover:bg-emerald-900/50" },
              { action: "rejeter" as const,    label: "Rejeter",     cls: "text-orange-400 border-orange-800 hover:bg-orange-900/50" },
              { action: "supprimer" as const,  label: "Supprimer",   cls: "text-red-400 border-red-800 hover:bg-red-900/50" },
            ].map(({ action, label, cls }) => (
              <button key={action} onClick={() => bulkAction(action)} disabled={bulkLoading}
                className={`text-[10px] px-2 py-0.5 rounded border bg-transparent disabled:opacity-50 font-medium ${cls}`}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-[10px] text-gray-500 hover:text-gray-300">Annuler</button>
        </div>
      )}

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto select-none">
        <table className="text-[11px] border-collapse" style={{ tableLayout: "fixed", width: `${Object.values(colWidths).reduce((a, b) => a + b, 0)}px` }}>
          <colgroup>
            {COLS.map((c) => <col key={c.key} style={{ width: `${colWidths[c.key]}px` }} />)}
          </colgroup>
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/80">
              {COLS.map((col, i) => (
                <th key={col.key} className="relative px-2 py-2 text-left" style={{ width: colWidths[col.key] }}>
                  {col.key === "check" ? (
                    <input type="checkbox" checked={allSelected} onChange={toggleAll}
                      className="w-3 h-3 rounded border-gray-600 bg-gray-800 accent-brand-500 cursor-pointer" />
                  ) : (
                    <span className={`${TH_TEXT} block overflow-hidden text-ellipsis whitespace-nowrap`}>{col.label}</span>
                  )}
                  {/* Séparateur redimensionnable — sauf dernière colonne */}
                  {i < COLS.length - 1 && (
                    <div
                      onMouseDown={(e) => onResizeStart(col.key, e)}
                      className="absolute right-0 top-0 h-full w-2 cursor-col-resize flex items-center justify-center group z-10"
                      title="Glisser pour redimensionner"
                    >
                      <div className="w-px h-4 bg-gray-700 group-hover:bg-brand-500 group-hover:h-full transition-all" />
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {filtered.map((a) => {
              const nom = `${a.prenom ?? ""} ${a.nom ?? ""}`.trim() || "Sans nom";
              const email = emailMap[a.id] ?? "";
              const date = new Date(a.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
              const metier = Array.isArray(a.metier) ? (a.metier as string[]).join(" · ") : (a.metier ?? "N/A");
              const isSelected = selected.has(a.id);
              const hasDocs = !!(a.assurance_rc_numero || a.assurance_decennale_numero || a.qualification_cstb_numero);
              return (
                <tr key={a.id} className={`transition-colors ${isSelected ? "bg-brand-900/20" : a.verification_status === "en_attente" ? "bg-yellow-900/5" : "hover:bg-gray-800/30"}`}>
                  <td className={TD + " text-center"}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggleOne(a.id)}
                      className="w-3 h-3 rounded border-gray-600 bg-gray-800 accent-brand-500 cursor-pointer" />
                  </td>
                  <td className={TD}>
                    <p className="font-semibold text-white truncate">{nom}</p>
                    <p className="text-gray-500 text-[10px] truncate">{email}</p>
                    <p className="text-gray-600 text-[10px]">{date}</p>
                    {a.bypass_verification && <span className="text-[9px] text-purple-400 font-mono">bypass</span>}
                  </td>
                  <td className={TD}>
                    <span className="text-gray-300 block truncate" title={metier}>{metier}</span>
                  </td>
                  <td className={TD}>
                    <span className="text-gray-300 block truncate" title={a.ville ?? ""}>{a.ville ?? "N/A"}</span>
                  </td>
                  <td className={TD}>
                    <span className={`font-mono block truncate ${a.siret ? "text-green-400" : "text-red-400"}`} title={a.siret ?? ""}>
                      {a.siret ?? "Manquant"}
                    </span>
                  </td>
                  <td className={TD}>
                    {a.nombre_avis > 0
                      ? <span className="text-yellow-400 whitespace-nowrap">★ {a.note_moyenne.toFixed(1)} ({a.nombre_avis})</span>
                      : <span className="text-gray-600">0</span>}
                  </td>
                  <td className={TD}>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${
                      a.actif ? "bg-green-900/50 text-green-400 border border-green-800" : "bg-red-900/50 text-red-400 border border-red-800"
                    }`}>
                      <span className={`w-1 h-1 rounded-full flex-shrink-0 ${a.actif ? "bg-green-400" : "bg-red-400"}`} />
                      {a.actif ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className={TD}>
                    <VerifBadge status={a.verification_status} />
                  </td>
                  <td className={TD}>
                    {hasDocs || a.verification_status === "en_attente" ? (
                      <AdminArtisanActions
                        artisanId={a.id} actif={a.actif}
                        verificationStatus={a.verification_status ?? "non_soumis"}
                        verificationNote={a.verification_note ?? ""}
                        assuranceRcNumero={a.assurance_rc_numero ?? ""}
                        assuranceRcAssureur={a.assurance_rc_assureur ?? ""}
                        assuranceDecennaleNumero={a.assurance_decennale_numero ?? ""}
                        assuranceDecennaleAssureur={a.assurance_decennale_assureur ?? ""}
                        qualificationCstbNumero={a.qualification_cstb_numero ?? ""}
                        mode="docs"
                      />
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-gray-800 text-gray-700 cursor-not-allowed select-none">Docs</span>
                    )}
                  </td>
                  <td className={TD}>
                    <Link href={`/prestataires/${a.id}`} target="_blank"
                      className="text-[10px] text-brand-400 hover:text-brand-300 font-medium whitespace-nowrap">
                      Voir →
                    </Link>
                  </td>
                  <td className={TD}>
                    <AdminArtisanActions
                      artisanId={a.id} actif={a.actif}
                      verificationStatus={a.verification_status ?? "non_soumis"}
                      verificationNote="" assuranceRcNumero="" assuranceRcAssureur=""
                      assuranceDecennaleNumero="" assuranceDecennaleAssureur="" qualificationCstbNumero=""
                      mode="toggle"
                    />
                  </td>
                  <td className={TD}>
                    <AdminArtisanActions
                      artisanId={a.id} actif={a.actif}
                      verificationStatus={a.verification_status ?? "non_soumis"}
                      verificationNote="" assuranceRcNumero="" assuranceRcAssureur=""
                      assuranceDecennaleNumero="" assuranceDecennaleAssureur="" qualificationCstbNumero=""
                      mode="delete"
                    />
                  </td>
                  <td className={TD}>
                    <Link href={`/dashboard/admin/artisans/${a.id}`}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors whitespace-nowrap">
                      Modifier
                    </Link>
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

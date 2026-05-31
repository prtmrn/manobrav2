"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  artisanId: string;
  actif: boolean;
  verificationStatus: string;
  verificationNote: string;
  assuranceRcNumero: string;
  assuranceRcAssureur: string;
  assuranceDecennaleNumero: string;
  assuranceDecennaleAssureur: string;
  qualificationCstbNumero: string;
}

export default function AdminArtisanActions({
  artisanId, actif,
  verificationStatus, verificationNote,
  assuranceRcNumero, assuranceRcAssureur,
  assuranceDecennaleNumero, assuranceDecennaleAssureur,
  qualificationCstbNumero,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showVerifModal, setShowVerifModal] = useState(false);
  const [password, setPassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [rejectNote, setRejectNote] = useState(verificationNote);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  async function toggle() {
    setLoading(true);
    await fetch("/api/admin/artisans/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artisanId, actif: !actif }),
    });
    router.refresh();
    setLoading(false);
  }

  async function handleVerify(action: "verifie" | "rejete") {
    setVerifying(true);
    setVerifyError(null);
    try {
      const res = await fetch("/api/admin/artisans/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artisanId, status: action, note: action === "rejete" ? rejectNote : "" }),
      });
      if (res.ok) { setShowVerifModal(false); router.refresh(); }
      else { const err = await res.json(); setVerifyError(err.error ?? "Erreur."); }
    } finally { setVerifying(false); }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { setDeleteError("Session invalide."); setDeleting(false); return; }
      const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email, password });
      if (authError) { setDeleteError("Mot de passe incorrect."); setDeleting(false); return; }
      const res = await fetch("/api/admin/artisans/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artisanId }),
      });
      if (res.ok) { setShowDeleteModal(false); router.refresh(); }
      else { const err = await res.json(); setDeleteError(err.error ?? "Erreur lors de la suppression."); }
    } finally { setDeleting(false); }
  }

  const hasDocuments = assuranceRcNumero || assuranceDecennaleNumero || qualificationCstbNumero;

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {(verificationStatus === "en_attente" || hasDocuments) && (
          <button
            onClick={() => { setShowVerifModal(true); setVerifyError(null); setRejectNote(verificationNote); }}
            className="text-[11px] font-semibold px-2 py-0.5 rounded border border-yellow-800 text-yellow-400 hover:bg-yellow-900/30 transition-colors whitespace-nowrap"
          >
            Docs
          </button>
        )}
        <button
          onClick={toggle}
          disabled={loading}
          className={`text-[11px] font-semibold px-2 py-0.5 rounded border transition-colors disabled:opacity-50 ${
            actif ? "border-red-800 text-red-400 hover:bg-red-900/30" : "border-green-800 text-green-400 hover:bg-green-900/30"
          }`}
        >
          {loading ? "..." : actif ? "Désactiver" : "Activer"}
        </button>
        <button
          onClick={() => { setShowDeleteModal(true); setPassword(""); setDeleteError(null); }}
          className="text-[11px] font-semibold px-2 py-0.5 rounded border border-gray-700 text-gray-400 hover:bg-gray-800 transition-colors"
        >
          Supprimer
        </button>
      </div>

      {showVerifModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-white font-bold text-lg mb-4">Vérification du dossier</h2>
            <div className="space-y-3 mb-5">
              <div className="bg-gray-800 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Documents soumis</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">RC Pro</span>
                  {assuranceRcNumero ? (
                    <div className="text-right">
                      <p className="text-sm text-white font-mono">{assuranceRcNumero}</p>
                      {assuranceRcAssureur && <p className="text-xs text-gray-500">{assuranceRcAssureur}</p>}
                    </div>
                  ) : <span className="text-xs text-red-400">Non renseigné</span>}
                </div>
                <div className="border-t border-gray-700 pt-2 flex justify-between items-center">
                  <span className="text-sm text-gray-400">Décennale</span>
                  {assuranceDecennaleNumero ? (
                    <div className="text-right">
                      <p className="text-sm text-white font-mono">{assuranceDecennaleNumero}</p>
                      {assuranceDecennaleAssureur && <p className="text-xs text-gray-500">{assuranceDecennaleAssureur}</p>}
                    </div>
                  ) : <span className="text-xs text-gray-500">Non renseigné</span>}
                </div>
                <div className="border-t border-gray-700 pt-2 flex justify-between items-center">
                  <span className="text-sm text-gray-400">CSTB / QB</span>
                  {qualificationCstbNumero ? (
                    <p className="text-sm text-white font-mono">{qualificationCstbNumero}</p>
                  ) : <span className="text-xs text-gray-500">Non renseigné</span>}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Note (visible par l&apos;artisan en cas de rejet)</label>
                <textarea
                  value={rejectNote}
                  onChange={e => setRejectNote(e.target.value)}
                  placeholder="Ex: Numéro RC Pro invalide, merci de vérifier..."
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-600 resize-none"
                />
              </div>
            </div>
            {verifyError && <p className="text-red-400 text-xs mb-3">{verifyError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setShowVerifModal(false)} className="flex-1 px-4 py-2 rounded-lg border border-gray-700 text-gray-400 text-sm hover:bg-gray-800">Annuler</button>
              <button onClick={() => handleVerify("rejete")} disabled={verifying} className="flex-1 px-4 py-2 rounded-lg border border-red-800 text-red-400 hover:bg-red-900/30 text-sm font-semibold disabled:opacity-50">
                {verifying ? "..." : "Rejeter"}
              </button>
              <button onClick={() => handleVerify("verifie")} disabled={verifying} className="flex-1 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50">
                {verifying ? "..." : "Valider ✓"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-white font-bold text-lg mb-1">Supprimer ce compte artisan</h2>
            <p className="text-gray-400 text-sm mb-4">Cette action est irréversible. Elle supprimera le profil artisan, ses services et ses réservations. Confirmez avec votre mot de passe admin.</p>
            <input type="password" placeholder="Mot de passe admin" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-brand-500" />
            {deleteError && <p className="text-red-400 text-xs mb-3">{deleteError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2 rounded-lg border border-gray-700 text-gray-400 text-sm hover:bg-gray-800">Annuler</button>
              <button onClick={handleDelete} disabled={deleting || !password} className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50">
                {deleting ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

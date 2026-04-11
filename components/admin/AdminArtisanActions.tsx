"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminArtisanActions({ artisanId, actif }: { artisanId: string; actif: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [password, setPassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      // Vérifier le mot de passe admin
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { setDeleteError("Session invalide."); setDeleting(false); return; }
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (authError) { setDeleteError("Mot de passe incorrect."); setDeleting(false); return; }

      const res = await fetch("/api/admin/artisans/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artisanId }),
      });
      if (res.ok) {
        setShowDeleteModal(false);
        router.refresh();
      } else {
        const err = await res.json();
        setDeleteError(err.error ?? "Erreur lors de la suppression.");
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          disabled={loading}
          className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-50 ${
            actif
              ? "border-red-800 text-red-400 hover:bg-red-900/30"
              : "border-green-800 text-green-400 hover:bg-green-900/30"
          }`}
        >
          {loading ? "..." : actif ? "Désactiver" : "Activer"}
        </button>
        <button
          onClick={() => { setShowDeleteModal(true); setPassword(""); setDeleteError(null); }}
          className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 transition-colors"
        >
          Supprimer
        </button>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-white font-bold text-lg mb-1">Supprimer ce compte artisan</h2>
            <p className="text-gray-400 text-sm mb-4">
              Cette action est irréversible. Elle supprimera le profil artisan, ses services et ses réservations.
              Confirmez avec votre mot de passe admin.
            </p>
            <input
              type="password"
              placeholder="Mot de passe admin"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-brand-500"
            />
            {deleteError && (
              <p className="text-red-400 text-xs mb-3">{deleteError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-700 text-gray-400 text-sm hover:bg-gray-800"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || !password}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50"
              >
                {deleting ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

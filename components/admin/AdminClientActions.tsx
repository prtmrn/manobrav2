"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminClientActions({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { setError("Session invalide."); setDeleting(false); return; }
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email, password,
      });
      if (authError) { setError("Mot de passe incorrect."); setDeleting(false); return; }
      const res = await fetch("/api/admin/clients/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      if (res.ok) {
        setShowModal(false);
        router.refresh();
      } else {
        const err = await res.json();
        setError(err.error ?? "Erreur lors de la suppression.");
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => { setShowModal(true); setPassword(""); setError(null); }}
        className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 transition-colors"
      >
        Supprimer
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-white font-bold text-lg mb-1">Supprimer ce compte client</h2>
            <p className="text-gray-400 text-sm mb-4">
              Cette action est irréversible. Elle supprimera le compte client et toutes ses réservations.
              Confirmez avec votre mot de passe admin.
            </p>
            <input
              type="password"
              placeholder="Mot de passe admin"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-brand-500"
            />
            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setShowModal(false)}
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

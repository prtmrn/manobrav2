"use client";
import { useState } from "react";

interface Props {
  artisanId: string;
  artisanNom: string;
}

export default function PopupAfficherNumero({ artisanId, artisanNom }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [loading, setLoading] = useState(false);
  const [numero, setNumero] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, telephone: tel, artisan_id: artisanId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNumero(data.telephone ?? "Numero non disponible");
    } catch (_e) {
      setError("Une erreur est survenue. Veuillez reessayer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm py-3 px-6 rounded-xl transition-all shadow-lg"
      >
        Afficher le numero
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Contacter {artisanNom}</h2>
                <p className="text-sm text-gray-500 mt-0.5">Renseignez votre email pour voir le numero</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors ml-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {numero ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-3">Numero de {artisanNom}</p>
                
                  href={"tel:" + numero}
                  className="inline-flex items-center gap-2 text-2xl font-bold text-brand-600 hover:text-brand-700 transition-colors"
                >
                  {numero}
                </a>
                <p className="text-xs text-gray-400 mt-3">Un lien de connexion a ete envoye a {email}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="vous@exemple.com"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Telephone (optionnel)</label>
                  <input
                    type="tel"
                    value={tel}
                    onChange={e => setTel(e.target.value)}
                    placeholder="06 00 00 00 00"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors"
                >
                  {loading ? "Chargement..." : "Afficher le numero"}
                </button>
                <p className="text-xs text-gray-400 text-center">
                  En continuant, vous acceptez de recevoir des communications de Manobra.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

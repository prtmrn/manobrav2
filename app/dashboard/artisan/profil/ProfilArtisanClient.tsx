"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const METIERS = [
  "Serrurier", "Plombier", "Chauffagiste", "Électricien",
  "Vitrier", "Ramoneur", "Frigoriste", "Dépanneur", "Autre",
];

interface Props {
  userId: string;
  email: string;
  initialData: {
    nom?: string | null;
    prenom?: string | null;
    bio?: string | null;
    metier?: string | null;
    adresse?: string | null;
    ville?: string | null;
    code_postal?: string | null;
    photo_url?: string | null;
  };
}

export default function ProfilArtisanClient({ userId, email, initialData }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    nom: initialData.nom ?? "",
    prenom: initialData.prenom ?? "",
    bio: initialData.bio ?? "",
    metier: initialData.metier ?? "",
    adresse: initialData.adresse ?? "",
    ville: initialData.ville ?? "",
    code_postal: initialData.code_postal ?? "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass = "w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();
    // @ts-ignore Supabase generated types
    const { error: err } = await supabase
      .from("profiles_artisans")
      .upsert({
        id: userId,
        nom: form.nom,
        prenom: form.prenom,
        bio: form.bio || null,
        metier: form.metier || null,
        adresse: form.adresse || null,
        ville: form.ville || null,
        code_postal: form.code_postal || null,
      }, { onConflict: "id" });

    if (err) {
      setError(err.message);
    } else {
      setSuccess(true);
      router.refresh();
    }
    setIsSubmitting(false);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>
        <p className="text-sm text-gray-500 mt-1">
          Ces informations sont visibles par les clients sur votre fiche artisan.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Informations personnelles</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prénom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.prenom}
                onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                className={inputClass}
                placeholder="Jean"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                className={inputClass}
                placeholder="Dupont"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              disabled
              value={email}
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">L'email ne peut pas être modifié ici.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Métier</label>
            <select
              value={form.metier}
              onChange={(e) => setForm({ ...form, metier: e.target.value })}
              className={`${inputClass} bg-white`}
            >
              <option value="">Sélectionnez votre métier…</option>
              {METIERS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Biographie</label>
              <span className={`text-xs ${form.bio.length > 480 ? "text-orange-500" : "text-gray-400"}`}>
                {form.bio.length} / 500
              </span>
            </div>
            <textarea
              rows={4}
              maxLength={500}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className={`${inputClass} resize-none`}
              placeholder="Décrivez votre expérience, vos compétences…"
            />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Zone d'intervention</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
            <input
              type="text"
              value={form.adresse}
              onChange={(e) => setForm({ ...form, adresse: e.target.value })}
              className={inputClass}
              placeholder="12 rue de la Paix"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
              <input
                type="text"
                maxLength={5}
                value={form.code_postal}
                onChange={(e) => setForm({ ...form, code_postal: e.target.value })}
                className={inputClass}
                placeholder="75001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
              <input
                type="text"
                value={form.ville}
                onChange={(e) => setForm({ ...form, ville: e.target.value })}
                className={inputClass}
                placeholder="Paris"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            Profil mis à jour avec succès.
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {isSubmitting ? "Enregistrement…" : "Enregistrer les modifications"}
          </button>
        </div>
      </form>
    </div>
  );
}

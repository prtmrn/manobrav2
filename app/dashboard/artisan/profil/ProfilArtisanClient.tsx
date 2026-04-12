"use client";
import AddressAutocomplete from "@/components/ui/AddressAutocomplete";

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
    metier?: string[] | null;
    adresse?: string | null;
    ville?: string | null;
    code_postal?: string | null;
    photo_url?: string | null;
    telephone?: string | null;
    siret?: string | null;
    zone_intervention_km?: number | null;
    tarif_horaire_min?: number | null;
    tarif_horaire_max?: number | null;
    frais_deplacement?: string | null;
    disponible_urgence?: boolean | null;
    delai_urgence?: string | null;
  };
}

export default function ProfilArtisanClient({ userId, email, initialData }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    nom: initialData.nom ?? "",
    prenom: initialData.prenom ?? "",
    bio: initialData.bio ?? "",
    metiers: initialData.metier ?? [],
    adresse: initialData.adresse ?? "",
    ville: initialData.ville ?? "",
    code_postal: initialData.code_postal ?? "",
    telephone: initialData.telephone ?? "",
    siret: initialData.siret ?? "",
    zone_intervention_km: initialData.zone_intervention_km?.toString() ?? "20",
    tarif_horaire_min: initialData.tarif_horaire_min?.toString() ?? "",
    tarif_horaire_max: initialData.tarif_horaire_max?.toString() ?? "",
    frais_deplacement: initialData.frais_deplacement ?? "inclus",
    disponible_urgence: initialData.disponible_urgence ?? false,
    delai_urgence: initialData.delai_urgence ?? "1h",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass = "w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";
  const selectClass = `${inputClass} bg-white`;

  function toggleMetier(m: string) {
    setForm((prev) => ({
      ...prev,
      metiers: prev.metiers.includes(m)
        ? prev.metiers.filter((x) => x !== m)
        : [...prev.metiers, m],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.siret.trim()) {
      setError("Le numéro SIRET est obligatoire.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();
    const { error: err } = await supabase
      .from("profiles_artisans")
      // @ts-ignore Supabase generated types
      .upsert({
        id: userId,
        nom: form.nom,
        prenom: form.prenom,
        bio: form.bio || null,
        metier: form.metiers.length > 0 ? form.metiers : null,
        adresse: form.adresse || null,
        ville: form.ville || null,
        code_postal: form.code_postal || null,
        telephone: form.telephone || null,
        siret: form.siret || null,
        zone_intervention_km: form.zone_intervention_km ? parseInt(form.zone_intervention_km) : 20,
        tarif_horaire_min: form.tarif_horaire_min ? parseFloat(form.tarif_horaire_min) : null,
        tarif_horaire_max: form.tarif_horaire_max ? parseFloat(form.tarif_horaire_max) : null,
        frais_deplacement: form.frais_deplacement || null,
        disponible_urgence: form.disponible_urgence,
        delai_urgence: form.disponible_urgence ? form.delai_urgence : null,
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

        {/* Informations personnelles */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Informations personnelles</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom <span className="text-red-500">*</span></label>
              <input type="text" required value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} className={inputClass} placeholder="Jean" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom <span className="text-red-500">*</span></label>
              <input type="text" required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className={inputClass} placeholder="Dupont" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" disabled value={email} className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-400 bg-gray-50 cursor-not-allowed" />
            <p className="text-xs text-gray-400 mt-1">L'email ne peut pas être modifié ici.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input type="tel" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} className={inputClass} placeholder="06 12 34 56 78" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Numéro SIRET <span className="text-red-500">*</span></label>
            <input type="text" maxLength={14} value={form.siret} onChange={(e) => setForm({ ...form, siret: e.target.value.replace(/\s/g, "") })} className={inputClass} placeholder="12345678901234" />
            <p className="text-xs text-gray-400 mt-1">14 chiffres sans espaces | obligatoire pour activer votre profil.</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Biographie</label>
              <span className={`text-xs ${form.bio.length > 480 ? "text-orange-500" : "text-gray-400"}`}>{form.bio.length} / 500</span>
            </div>
            <textarea rows={4} maxLength={500} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className={`${inputClass} resize-none`} placeholder="Décrivez votre expérience, vos compétences…" />
          </div>
        </div>

        {/* Métiers */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-3">
          <h2 className="text-base font-semibold text-gray-900">Métier(s)</h2>
          <p className="text-xs text-gray-500">Sélectionnez un ou plusieurs métiers.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {METIERS.map((m) => {
              const selected = form.metiers.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMetier(m)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-colors text-left ${
                    selected
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {selected && <span className="mr-1">✓</span>}{m}
                </button>
              );
            })}
          </div>
        </div>

        {/* Zone d'intervention */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Zone d'intervention</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
            <AddressAutocomplete
              value={form.adresse}
              inputClass={inputClass}
              onChange={(result) => setForm({
                ...form,
                adresse: result.adresse,
                ville: result.ville,
                code_postal: result.code_postal,
                latitude: result.latitude,
                longitude: result.longitude,
              })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
              <input type="text" maxLength={5} value={form.code_postal} onChange={(e) => setForm({ ...form, code_postal: e.target.value })} className={inputClass} placeholder="75001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
              <input type="text" value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} className={inputClass} placeholder="Paris" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rayon d'intervention (km)</label>
            <select value={form.zone_intervention_km} onChange={(e) => setForm({ ...form, zone_intervention_km: e.target.value })} className={selectClass}>
              {[5, 10, 20, 30, 50, 100].map((km) => (
                <option key={km} value={km}>{km} km</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tarification */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Tarification</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tarif horaire min (€)</label>
              <input type="number" min="0" step="5" value={form.tarif_horaire_min} onChange={(e) => setForm({ ...form, tarif_horaire_min: e.target.value })} className={inputClass} placeholder="50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tarif horaire max (€)</label>
              <input type="number" min="0" step="5" value={form.tarif_horaire_max} onChange={(e) => setForm({ ...form, tarif_horaire_max: e.target.value })} className={inputClass} placeholder="80" />
            </div>
          </div>
          <p className="text-xs text-gray-400">Fourchette indicative | le devis définitif est établi sur place.</p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frais de déplacement</label>
            <select value={form.frais_deplacement} onChange={(e) => setForm({ ...form, frais_deplacement: e.target.value })} className={selectClass}>
              <option value="inclus">Inclus dans le tarif</option>
              <option value="gratuit">Gratuit</option>
              <option value="forfait">Forfait selon distance</option>
            </select>
          </div>
        </div>

        {/* Urgences */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Disponibilité urgence</h2>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.disponible_urgence}
              onChange={(e) => setForm({ ...form, disponible_urgence: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm font-medium text-gray-700">Disponible pour des interventions urgentes</span>
          </label>

          {form.disponible_urgence && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Délai d'intervention garanti</label>
              <select value={form.delai_urgence} onChange={(e) => setForm({ ...form, delai_urgence: e.target.value })} className={selectClass}>
                <option value="30min">30 minutes</option>
                <option value="1h">1 heure</option>
                <option value="2h">2 heures</option>
              </select>
            </div>
          )}
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">Profil mis à jour avec succès.</div>}

        <div className="flex justify-end">
          <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors">
            {isSubmitting ? "Enregistrement…" : "Enregistrer les modifications"}
          </button>
        </div>
      </form>
    </div>
  );
}

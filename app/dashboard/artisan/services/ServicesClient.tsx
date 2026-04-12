"use client";
import { METIER_LIST } from "@/components/map/metier-config";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Service {
  id: string;
  titre: string;
  description: string | null;
  prix: number | null;
  duree_minutes: number | null;
  actif: boolean;
  metier: string | null;
}

interface Props {
  userId: string;
  services: Service[];
}

export default function ServicesClient({ userId, services: initial }: Props) {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    titre: "",
    description: "",
    prix: "",
    duree_minutes: "",
    metier: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    titre: "",
    description: "",
    prix: "",
    duree_minutes: "",
    metier: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titre.trim()) return;
    setIsSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("services")
      // @ts-ignore Supabase generated types
      .insert({
        artisan_id: userId,
        titre: form.titre.trim(),
        description: form.description.trim() || null,
        prix: form.prix ? parseFloat(form.prix) : null,
        duree_minutes: form.duree_minutes ? parseInt(form.duree_minutes) : null,
        metier: form.metier || null,
        actif: true,
      })
      .select()
      .single();
    if (err) {
      setError(err.message);
      setIsSubmitting(false);
      return;
    }
    setServices((prev) => [data, ...prev]);
    setForm({ titre: "", description: "", prix: "", duree_minutes: "", metier: "" });
    setShowForm(false);
    setIsSubmitting(false);
    router.refresh();
  }

  function startEdit(service: Service) {
    setEditingId(service.id);
    setEditForm({
      titre: service.titre,
      description: service.description ?? "",
      prix: service.prix?.toString() ?? "",
      duree_minutes: service.duree_minutes?.toString() ?? "",
      metier: service.metier ?? "",
    });
  }

  async function handleEditSubmit(id: string) {
    if (!editForm.titre.trim()) return;
    setIsSubmitting(true);
    const supabase = createClient();
    await supabase
      .from("services")
      // @ts-ignore
      .update({
        titre: editForm.titre.trim(),
        description: editForm.description.trim() || null,
        prix: editForm.prix ? parseFloat(editForm.prix) : null,
        duree_minutes: editForm.duree_minutes ? parseInt(editForm.duree_minutes) : null,
        metier: editForm.metier || null,
      })
      .eq("id", id);
    setServices(prev => prev.map(s => s.id === id ? {
      ...s,
      titre: editForm.titre.trim(),
      description: editForm.description.trim() || null,
      prix: editForm.prix ? parseFloat(editForm.prix) : null,
      duree_minutes: editForm.duree_minutes ? parseInt(editForm.duree_minutes) : null,
      metier: editForm.metier || null,
    } : s));
    setEditingId(null);
    setIsSubmitting(false);
    router.refresh();
  }

  async function handleToggle(service: Service) {
    const supabase = createClient();
    await supabase
      .from("services")
      // @ts-ignore Supabase generated types
      .update({ actif: !service.actif })
      .eq("id", service.id);
    setServices((prev) =>
      prev.map((s) => s.id === service.id ? { ...s, actif: !s.actif } : s)
    );
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce service ?")) return;
    const supabase = createClient();
    // @ts-ignore Supabase generated types
    await supabase.from("services").delete().eq("id", id);
    setServices((prev) => prev.filter((s) => s.id !== id));
    router.refresh();
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes services</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ajoutez vos prestations pour que les clients puissent vous réserver.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter un service
        </button>
      </div>

      {/* Formulaire d'ajout */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Nouveau service</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex : Débouchage canalisation"
                value={form.titre}
                onChange={(e) => setForm({ ...form, titre: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Métier associé</label>
              <select
                value={form.metier}
                onChange={(e) => setForm({ ...form, metier: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">Sélectionner un métier</option>
                {METIER_LIST.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={3}
                placeholder="Décrivez la prestation en détail…"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prix indicatif (€)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ex : 80"
                  value={form.prix}
                  onChange={(e) => setForm({ ...form, prix: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Durée (minutes)</label>
                <input
                  type="number"
                  min="0"
                  step="15"
                  placeholder="Ex : 60"
                  value={form.duree_minutes}
                  onChange={(e) => setForm({ ...form, duree_minutes: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>
            )}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-sm font-semibold text-white transition-colors"
              >
                {isSubmitting ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des services */}
      {services.length === 0 && !showForm ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">Aucun service pour l'instant.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            Ajouter votre premier service →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((service) => (
            <div key={service.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4">
              {editingId === service.id ? (
                <div className="space-y-3">
                  <input value={editForm.titre} onChange={e => setEditForm(f => ({...f, titre: e.target.value}))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Titre" />
                  <input value={editForm.description} onChange={e => setEditForm(f => ({...f, description: e.target.value}))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Description" />
                  <div className="flex gap-2">
                    <input value={editForm.prix} onChange={e => setEditForm(f => ({...f, prix: e.target.value}))}
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Prix (€)" type="number" />
                    <input value={editForm.duree_minutes} onChange={e => setEditForm(f => ({...f, duree_minutes: e.target.value}))}
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Durée (min)" type="number" />
                  </div>
                  <select value={editForm.metier} onChange={e => setEditForm(f => ({...f, metier: e.target.value}))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                    <option value="">Sélectionner un métier</option>
                    {METIER_LIST.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingId(null)}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                      Annuler
                    </button>
                    <button onClick={() => handleEditSubmit(service.id)} disabled={isSubmitting}
                      className="flex-1 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-sm font-semibold text-white disabled:opacity-60">
                      {isSubmitting ? "..." : "Enregistrer"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{service.titre}</p>
                      {service.metier && <span className="text-xs text-brand-600 font-medium">{service.metier}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        service.actif ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {service.actif ? "Actif" : "Inactif"}
                      </span>
                    </div>
                    {service.description && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{service.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      {service.prix && <span className="text-xs text-gray-600 font-medium">{service.prix} €</span>}
                      {service.duree_minutes && <span className="text-xs text-gray-400">{service.duree_minutes} min</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => startEdit(service)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-brand-200 text-brand-600 hover:bg-brand-50 transition-colors">
                      Modifier
                    </button>
                    <button onClick={() => handleToggle(service)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                      {service.actif ? "Désactiver" : "Activer"}
                    </button>
                    <button onClick={() => handleDelete(service.id)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                      Supprimer
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

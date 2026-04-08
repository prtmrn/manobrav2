"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const ONGLETS = ["Revenus", "Artisans", "Clients", "Réservations", "Croissance"];

function fmtEuro(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(n);
}

function KpiCard({ label, value, sub, color = "text-white" }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-sm font-semibold text-white mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AdminKpisPage() {
  const [onglet, setOnglet] = useState("Revenus");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const [
        { data: profiles },
        { data: artisans },
        { data: clients },
        { data: reservations },
        { data: avis },
      ] = await Promise.all([
        supabase.from("profiles").select("id, role, created_at"),
        supabase.from("profiles_artisans").select("id, actif, metier, note_moyenne, nombre_avis, ville, created_at"),
        supabase.from("profiles").select("id, created_at").eq("role", "client"),
        supabase.from("reservations").select("id, statut, montant_total, date, created_at, client_id, artisan_id, heure_debut, heure_fin"),
        supabase.from("avis").select("note, created_at"),
      ]);

      const now = new Date();
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;

      const artisansList = artisans ?? [];
      const clientsList = clients ?? [];
      const reservList = reservations ?? [];
      const avisList = avis ?? [];

      // ── Revenus ──
      const mrr = 0; // Stripe non configuré
      const arr = mrr * 12;
      const caReservations = reservList.filter((r: any) => r.statut === "termine").reduce((s: number, r: any) => s + (r.montant_total ?? 0), 0);
      const arpa = artisansList.filter((a: any) => a.actif).length > 0 ? mrr / artisansList.filter((a: any) => a.actif).length : 0;

      // ── Artisans ──
      const artisansActifs = artisansList.filter((a: any) => a.actif).length;
      const artisansInactifs = artisansList.filter((a: any) => !a.actif).length;
      const tauxActivation = artisansList.length > 0 ? ((artisansActifs / artisansList.length) * 100).toFixed(1) : "0.0";
      const noteMoyenne = artisansList.length > 0
        ? (artisansList.reduce((s: number, a: any) => s + (a.note_moyenne ?? 0), 0) / artisansList.length).toFixed(1)
        : "N/A";

      // Artisans à risque : actifs mais sans réservation depuis 30j
      const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const artisansAvecReservationRecente = new Set(
        reservList.filter((r: any) => new Date(r.created_at) > thirtyDaysAgo).map((r: any) => r.artisan_id)
      );
      const artisansARisque = artisansList.filter((a: any) => a.actif && !artisansAvecReservationRecente.has(a.id)).length;

      // Répartition métiers
      const metierCount: Record<string, number> = {};
      for (const a of artisansList) {
        const m = (a as any).metier;
        if (!m) continue;
        const metiers = Array.isArray(m) ? m : [m];
        for (const met of metiers) metierCount[met] = (metierCount[met] ?? 0) + 1;
      }

      // ── Clients ──
      const clientsAvecReservation = new Set(reservList.filter((r: any) => r.client_id).map((r: any) => r.client_id));
      const clientsActifs = clientsAvecReservation.size;
      const tauxConversion = clientsList.length > 0 ? ((clientsActifs / clientsList.length) * 100).toFixed(1) : "0.0";
      const panierMoyen = clientsActifs > 0 ? caReservations / clientsActifs : 0;

      // Clients récurrents (>1 réservation)
      const reservParClient: Record<string, number> = {};
      for (const r of reservList) {
        if ((r as any).client_id) reservParClient[(r as any).client_id] = (reservParClient[(r as any).client_id] ?? 0) + 1;
      }
      const clientsRecurrents = Object.values(reservParClient).filter(n => n > 1).length;

      // ── Réservations ──
      const totalReserv = reservList.length;
      const reservConfirmees = reservList.filter((r: any) => ["confirme", "en_cours", "termine"].includes(r.statut)).length;
      const reservAnnulees = reservList.filter((r: any) => r.statut === "annule").length;
      const tauxConfirmation = totalReserv > 0 ? ((reservConfirmees / totalReserv) * 100).toFixed(1) : "0.0";
      const tauxAnnulation = totalReserv > 0 ? ((reservAnnulees / totalReserv) * 100).toFixed(1) : "0.0";
      const reservGuests = reservList.filter((r: any) => !r.client_id).length;
      const reservConnectes = reservList.filter((r: any) => r.client_id).length;

      // Par métier
      const reservParMetier: Record<string, number> = {};
      for (const r of reservList) {
        const artisan = artisansList.find((a: any) => a.id === (r as any).artisan_id);
        if (!artisan) continue;
        const m = (artisan as any).metier;
        const metiers = Array.isArray(m) ? m : [m];
        for (const met of metiers) reservParMetier[met] = (reservParMetier[met] ?? 0) + 1;
      }

      // ── Croissance ──
      const newArtisansCeMois = artisansList.filter((a: any) => a.created_at?.startsWith(thisMonth)).length;
      const newArtisansMoisDernier = artisansList.filter((a: any) => a.created_at?.startsWith(lastMonthKey)).length;
      const newClientsCeMois = clientsList.filter((c: any) => c.created_at?.startsWith(thisMonth)).length;
      const newClientsMoisDernier = clientsList.filter((c: any) => c.created_at?.startsWith(lastMonthKey)).length;
      const newReservCeMois = reservList.filter((r: any) => r.created_at?.startsWith(thisMonth)).length;
      const newReservMoisDernier = reservList.filter((r: any) => r.created_at?.startsWith(lastMonthKey)).length;

      const croissance = (current: number, prev: number) => {
        if (prev === 0) return current > 0 ? "+100%" : "N/A";
        const pct = ((current - prev) / prev * 100).toFixed(1);
        return `${Number(pct) > 0 ? "+" : ""}${pct}%`;
      };

      setData({
        mrr, arr, caReservations, arpa,
        artisansActifs, artisansInactifs, tauxActivation, noteMoyenne, artisansARisque, metierCount,
        clientsActifs, tauxConversion, panierMoyen, clientsRecurrents, totalClients: clientsList.length,
        totalReserv, tauxConfirmation, tauxAnnulation, reservGuests, reservConnectes, reservParMetier,
        newArtisansCeMois, newArtisansMoisDernier, newClientsCeMois, newClientsMoisDernier,
        newReservCeMois, newReservMoisDernier, croissance,
        noteMoyenneAvis: avisList.length > 0 ? (avisList.reduce((s: number, a: any) => s + a.note, 0) / avisList.length).toFixed(1) : "N/A",
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-64">
      <p className="text-gray-500">Chargement des KPIs...</p>
    </div>
  );

  const d = data;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">KPIs</h1>
        <p className="text-sm text-gray-400 mt-1">Indicateurs clés de performance — Manobra</p>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {ONGLETS.map(o => (
          <button key={o} onClick={() => setOnglet(o)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              onglet === o ? "bg-brand-600 text-white" : "text-gray-400 hover:text-white"
            }`}>
            {o}
          </button>
        ))}
      </div>

      {/* ── REVENUS ── */}
      {onglet === "Revenus" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard label="MRR" value={fmtEuro(d.mrr)} sub="Revenus mensuels récurrents" color="text-green-400" />
            <KpiCard label="ARR" value={fmtEuro(d.arr)} sub="Revenus annuels projetés" color="text-brand-400" />
            <KpiCard label="CA réservations" value={fmtEuro(d.caReservations)} sub="Prestations terminées" color="text-blue-400" />
            <KpiCard label="ARPA" value={fmtEuro(d.arpa)} sub="Revenu moyen par artisan actif" color="text-purple-400" />
          </div>
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <p className="text-sm text-gray-400">Les données MRR seront disponibles après la configuration de Stripe.</p>
          </div>
        </div>
      )}

      {/* ── ARTISANS ── */}
      {onglet === "Artisans" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard label="Artisans actifs" value={d.artisansActifs} color="text-green-400" />
            <KpiCard label="Artisans inactifs" value={d.artisansInactifs} color="text-red-400" />
            <KpiCard label="Taux d'activation" value={`${d.tauxActivation}%`} sub="Inscrits → actifs" color="text-brand-400" />
            <KpiCard label="Artisans à risque" value={d.artisansARisque} sub="Actifs sans réservation 30j" color={d.artisansARisque > 0 ? "text-amber-400" : "text-green-400"} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
            <KpiCard label="Note moyenne" value={`${d.noteMoyenne} ★`} sub="Moyenne des profils artisans" color="text-yellow-400" />
            <KpiCard label="Note avis clients" value={`${d.noteMoyenneAvis} ★`} sub="Moyenne des avis déposés" color="text-yellow-400" />
          </div>
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Répartition par métier</h3>
            <div className="space-y-2">
              {Object.entries(d.metierCount).sort((a: any, b: any) => b[1] - a[1]).map(([metier, count]: any) => (
                <div key={metier} className="flex items-center gap-3">
                  <span className="text-sm text-gray-300 w-32 truncate">{metier}</span>
                  <div className="flex-1 bg-gray-800 rounded-full h-2">
                    <div className="bg-brand-600 h-2 rounded-full" style={{ width: `${(count / d.artisansActifs) * 100}%` }} />
                  </div>
                  <span className="text-sm text-gray-400 w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CLIENTS ── */}
      {onglet === "Clients" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard label="Clients inscrits" value={d.totalClients} color="text-white" />
            <KpiCard label="Clients actifs" value={d.clientsActifs} sub="Avec au moins 1 réservation" color="text-brand-400" />
            <KpiCard label="Taux de conversion" value={`${d.tauxConversion}%`} sub="Inscrits → actifs" color="text-green-400" />
            <KpiCard label="Clients récurrents" value={d.clientsRecurrents} sub="Plus d'1 réservation" color="text-purple-400" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <KpiCard label="Panier moyen" value={fmtEuro(d.panierMoyen)} sub="CA / clients actifs" color="text-blue-400" />
            <KpiCard label="One-shot" value={d.clientsActifs - d.clientsRecurrents} sub="1 seule réservation" color="text-gray-400" />
          </div>
        </div>
      )}

      {/* ── RÉSERVATIONS ── */}
      {onglet === "Réservations" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard label="Total réservations" value={d.totalReserv} color="text-white" />
            <KpiCard label="Taux de confirmation" value={`${d.tauxConfirmation}%`} color="text-green-400" />
            <KpiCard label="Taux d'annulation" value={`${d.tauxAnnulation}%`} color={Number(d.tauxAnnulation) > 20 ? "text-red-400" : "text-amber-400"} />
            <KpiCard label="Guests" value={d.reservGuests} sub={`${d.reservConnectes} connectés`} color="text-blue-400" />
          </div>
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Réservations par métier</h3>
            <div className="space-y-2">
              {Object.entries(d.reservParMetier).sort((a: any, b: any) => b[1] - a[1]).map(([metier, count]: any) => (
                <div key={metier} className="flex items-center gap-3">
                  <span className="text-sm text-gray-300 w-32 truncate">{metier}</span>
                  <div className="flex-1 bg-gray-800 rounded-full h-2">
                    <div className="bg-brand-600 h-2 rounded-full" style={{ width: `${(count / d.totalReserv) * 100}%` }} />
                  </div>
                  <span className="text-sm text-gray-400 w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CROISSANCE ── */}
      {onglet === "Croissance" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Nouveaux artisans", ceMois: d.newArtisansCeMois, moisDernier: d.newArtisansMoisDernier },
              { label: "Nouveaux clients", ceMois: d.newClientsCeMois, moisDernier: d.newClientsMoisDernier },
              { label: "Nouvelles réservations", ceMois: d.newReservCeMois, moisDernier: d.newReservMoisDernier },
            ].map(({ label, ceMois, moisDernier }) => {
              const crois = d.croissance(ceMois, moisDernier);
              const isPositive = crois.startsWith("+");
              return (
                <div key={label} className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
                  <p className="text-sm font-semibold text-white mb-3">{label}</p>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold text-white">{ceMois}</p>
                      <p className="text-xs text-gray-500 mt-1">Ce mois-ci</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${isPositive ? "text-green-400" : crois === "N/A" ? "text-gray-500" : "text-red-400"}`}>
                        {crois}
                      </p>
                      <p className="text-xs text-gray-500">{moisDernier} mois dernier</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

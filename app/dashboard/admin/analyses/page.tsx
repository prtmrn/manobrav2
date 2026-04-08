"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

const ONGLETS = ["Funnel", "Personas", "Artisans", "Géographie", "Temporalité"];

function KpiCard({ label, value, sub, color = "text-white" }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-sm font-semibold text-white mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function BarRow({ label, value, max, color = "bg-brand-600" }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-300 w-36 truncate flex-shrink-0">{label}</span>
      <div className="flex-1 bg-gray-800 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm text-gray-400 w-8 text-right flex-shrink-0">{value}</span>
    </div>
  );
}

function FunnelStep({ label, value, total, prev }: { label: string; value: number; total: number; prev?: number }) {
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
  const conv = prev !== undefined && prev > 0 ? ((value / prev) * 100).toFixed(1) : null;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-full bg-gray-800 rounded-xl p-4 text-center border border-gray-700">
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-gray-400 mt-1">{label}</p>
        <p className="text-xs text-brand-400 mt-1">{pct}% du total</p>
      </div>
      {conv !== null && (
        <p className="text-xs text-gray-500">↓ {conv}% conversion</p>
      )}
    </div>
  );
}

export default function AdminAnalysesPage() {
  const [onglet, setOnglet] = useState("Funnel");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const [
        { data: profiles },
        { data: artisans },
        { data: reservations },
        { data: artisansProfiles },
      ] = await Promise.all([
        supabase.from("profiles").select("id, role, created_at"),
        supabase.from("profiles_artisans").select("id, actif, metier, ville, note_moyenne, nombre_avis, created_at"),
        supabase.from("reservations").select("id, statut, date, heure_debut, created_at, client_id, artisan_id, adresse_intervention"),
        supabase.from("profiles_artisans").select("id, ville"),
      ]);

      const allProfiles = profiles ?? [];
      const artisansList = artisans ?? [];
      const reservList = reservations ?? [];

      const clients = allProfiles.filter((p: any) => p.role === "client");
      const totalInscrits = clients.length;
      const clientsAvecReservation = new Set(reservList.filter((r: any) => r.client_id).map((r: any) => r.client_id));
      const totalAvecReserv = clientsAvecReservation.size;
      const totalConfirmes = reservList.filter((r: any) => ["confirme", "en_cours", "termine"].includes(r.statut)).length;
      const totalTermines = reservList.filter((r: any) => r.statut === "termine").length;
      const totalReserv = reservList.length;
      const totalGuests = reservList.filter((r: any) => !r.client_id).length;
      const totalConnectes = reservList.filter((r: any) => r.client_id).length;

      // ── Personas ──
      // Réservations le jour même vs à l'avance
      const reservJourMeme = reservList.filter((r: any) => {
        const created = r.created_at?.split("T")[0];
        return created === r.date;
      }).length;
      const reservAvance = reservList.length - reservJourMeme;

      // Heure de réservation
      const heureCount: Record<number, number> = {};
      for (const r of reservList) {
        if (r.heure_debut) {
          const h = parseInt(r.heure_debut.split(":")[0]);
          heureCount[h] = (heureCount[h] ?? 0) + 1;
        }
      }
      const heurePic = Object.entries(heureCount).sort((a, b) => Number(b[1]) - Number(a[1]))[0];

      // Métiers les plus demandés
      const metierDemande: Record<string, number> = {};
      for (const r of reservList) {
        const artisan = artisansList.find((a: any) => a.id === r.artisan_id);
        if (!artisan) continue;
        const m = (artisan as any).metier;
        const metiers = Array.isArray(m) ? m : [m];
        for (const met of metiers) if (met) metierDemande[met] = (metierDemande[met] ?? 0) + 1;
      }

      // ── Comportement artisans ──
      // Corrélation note / réservations
      const artisansAvecNote = artisansList.filter((a: any) => a.note_moyenne > 0);
      const noteMoyGlobal = artisansAvecNote.length > 0
        ? (artisansAvecNote.reduce((s: number, a: any) => s + a.note_moyenne, 0) / artisansAvecNote.length).toFixed(1)
        : "N/A";

      // Temps entre inscription et première réservation
      const tempsInscrPremReserv: number[] = [];
      for (const a of artisansList) {
        const firstReserv = reservList
          .filter((r: any) => r.artisan_id === (a as any).id)
          .sort((x: any, y: any) => new Date(x.created_at).getTime() - new Date(y.created_at).getTime())[0];
        if (firstReserv) {
          const diff = (new Date(firstReserv.created_at).getTime() - new Date((a as any).created_at).getTime()) / (1000 * 60 * 60 * 24);
          tempsInscrPremReserv.push(diff);
        }
      }
      const tempsMovenJours = tempsInscrPremReserv.length > 0
        ? Math.round(tempsInscrPremReserv.reduce((s, n) => s + n, 0) / tempsInscrPremReserv.length)
        : null;

      // ── Géographie ──
      const villeCount: Record<string, number> = {};
      for (const r of reservList) {
        const artisan = (artisansProfiles ?? []).find((a: any) => a.id === r.artisan_id);
        const ville = artisan?.ville;
        if (ville) villeCount[ville] = (villeCount[ville] ?? 0) + 1;
      }

      const artisanParVille: Record<string, number> = {};
      for (const a of artisansProfiles ?? []) {
        if ((a as any).ville) artisanParVille[(a as any).ville] = (artisanParVille[(a as any).ville] ?? 0) + 1;
      }

      // ── Temporalité ──
      const jourSemaine = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
      const jourCount: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      for (const r of reservList) {
        if (r.date) {
          const d = new Date(`${r.date}T12:00:00`);
          const jour = (d.getDay() + 6) % 7; // 0=Lun
          jourCount[jour] = (jourCount[jour] ?? 0) + 1;
        }
      }

      const moisCount: Record<string, number> = {};
      for (const r of reservList) {
        if (r.date) {
          const mois = r.date.slice(0, 7);
          moisCount[mois] = (moisCount[mois] ?? 0) + 1;
        }
      }

      setData({
        totalInscrits, totalAvecReserv, totalConfirmes, totalTermines, totalReserv,
        totalGuests, totalConnectes,
        reservJourMeme, reservAvance, heurePic,
        metierDemande, noteMoyGlobal, tempsMovenJours,
        artisansAvecNote: artisansAvecNote.length,
        villeCount, artisanParVille,
        jourCount, jourSemaine, moisCount, heureCount,
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return (
    <div className="p-6 flex items-center justify-center min-h-64">
      <p className="text-gray-500">Chargement des analyses...</p>
    </div>
  );

  const d = data;
  const maxJour = Math.max(...Object.values(d.jourCount) as number[]);
  const maxVille = Math.max(...Object.values(d.villeCount) as number[], 1);
  const maxMetier = Math.max(...Object.values(d.metierDemande) as number[], 1);
  const maxHeure = Math.max(...Object.values(d.heureCount) as number[], 1);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analyses</h1>
        <p className="text-sm text-gray-400 mt-1">Personas, funnel, comportements et géographie</p>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit flex-wrap">
        {ONGLETS.map(o => (
          <button key={o} onClick={() => setOnglet(o)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              onglet === o ? "bg-brand-600 text-white" : "text-gray-400 hover:text-white"
            }`}>
            {o}
          </button>
        ))}
      </div>

      {/* ── FUNNEL ── */}
      {onglet === "Funnel" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <FunnelStep label="Clients inscrits" value={d.totalInscrits} total={d.totalInscrits} />
            <FunnelStep label="Avec réservation" value={d.totalAvecReserv} total={d.totalInscrits} prev={d.totalInscrits} />
            <FunnelStep label="Confirmées" value={d.totalConfirmes} total={d.totalInscrits} prev={d.totalAvecReserv} />
            <FunnelStep label="Terminées" value={d.totalTermines} total={d.totalInscrits} prev={d.totalConfirmes} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard label="Total réservations" value={d.totalReserv} sub="Toutes origines confondues" color="text-white" />
            <KpiCard label="Réservations guests" value={d.totalGuests} sub="Sans compte créé" color="text-amber-400" />
            <KpiCard label="Réservations connectés" value={d.totalConnectes} sub="Avec compte client" color="text-brand-400" />
          </div>
        </div>
      )}

      {/* ── PERSONAS ── */}
      {onglet === "Personas" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard label="Réservations urgentes" value={d.reservJourMeme} sub="Réservées le jour même" color="text-red-400" />
            <KpiCard label="Réservations planifiées" value={d.reservAvance} sub="Réservées à l'avance" color="text-blue-400" />
            <KpiCard label="Heure de pointe" value={d.heurePic ? `${d.heurePic[0]}h` : "N/A"} sub={d.heurePic ? `${d.heurePic[1]} réservations` : ""} color="text-yellow-400" />
          </div>
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Métiers les plus demandés</h3>
            <div className="space-y-3">
              {Object.entries(d.metierDemande).sort((a: any, b: any) => b[1] - a[1]).map(([m, v]: any) => (
                <BarRow key={m} label={m} value={v} max={maxMetier} />
              ))}
              {Object.keys(d.metierDemande).length === 0 && <p className="text-gray-500 text-sm">Aucune donnée</p>}
            </div>
          </div>
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Réservations par heure</h3>
            <div className="space-y-2">
              {Object.entries(d.heureCount).sort((a, b) => Number(a[0]) - Number(b[0])).map(([h, v]: any) => (
                <BarRow key={h} label={`${h}h00`} value={v} max={maxHeure} color="bg-purple-600" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ARTISANS ── */}
      {onglet === "Artisans" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              label="Délai moyen avant 1ère réservation"
              value={d.tempsMovenJours !== null ? `${d.tempsMovenJours}j` : "N/A"}
              sub="Entre inscription et 1ère demande reçue"
              color="text-brand-400"
            />
            <KpiCard label="Note moyenne globale" value={`${d.noteMoyGlobal} ★`} sub={`Sur ${d.artisansAvecNote} artisans notés`} color="text-yellow-400" />
            <KpiCard label="Artisans sans avis" value={(data?.artisansList?.length ?? 0) - d.artisansAvecNote} sub="Aucun avis reçu" color="text-gray-400" />
          </div>
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <p className="text-sm text-gray-400">Les analyses de comportement artisan (taux de réponse, remplissage planning) seront disponibles avec plus de données.</p>
          </div>
        </div>
      )}

      {/* ── GÉOGRAPHIE ── */}
      {onglet === "Géographie" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Réservations par ville</h3>
              <div className="space-y-3">
                {Object.entries(d.villeCount).sort((a: any, b: any) => b[1] - a[1]).map(([ville, count]: any) => (
                  <BarRow key={ville} label={ville} value={count} max={maxVille} />
                ))}
                {Object.keys(d.villeCount).length === 0 && <p className="text-gray-500 text-sm">Aucune donnée</p>}
              </div>
            </div>
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Artisans par ville</h3>
              <div className="space-y-3">
                {Object.entries(d.artisanParVille).sort((a: any, b: any) => b[1] - a[1]).map(([ville, count]: any) => (
                  <BarRow key={ville} label={ville} value={count} max={Math.max(...Object.values(d.artisanParVille) as number[])} color="bg-green-600" />
                ))}
                {Object.keys(d.artisanParVille).length === 0 && <p className="text-gray-500 text-sm">Aucune donnée</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TEMPORALITÉ ── */}
      {onglet === "Temporalité" && (
        <div className="space-y-6">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Réservations par jour de la semaine</h3>
            <div className="grid grid-cols-7 gap-2">
              {d.jourSemaine.map((jour: string, i: number) => {
                const count = d.jourCount[i] ?? 0;
                const pct = maxJour > 0 ? (count / maxJour) * 100 : 0;
                return (
                  <div key={jour} className="flex flex-col items-center gap-2">
                    <div className="w-full bg-gray-800 rounded-lg relative" style={{ height: "80px" }}>
                      <div
                        className="absolute bottom-0 w-full bg-brand-600 rounded-lg transition-all"
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{jour}</span>
                    <span className="text-xs font-semibold text-white">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Réservations par mois</h3>
            <div className="space-y-2">
              {Object.entries(d.moisCount).sort().map(([mois, count]: any) => {
                const maxMois = Math.max(...Object.values(d.moisCount) as number[]);
                const label = new Date(`${mois}-01`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
                return <BarRow key={mois} label={label} value={count} max={maxMois} color="bg-blue-600" />;
              })}
              {Object.keys(d.moisCount).length === 0 && <p className="text-gray-500 text-sm">Aucune donnée</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

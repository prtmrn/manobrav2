"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function HeroCTA() {
  const [role, setRole] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setRole(null); return; }
      supabase.from("profiles").select("role").eq("id", user.id).single()
        .then(({ data }) => setRole((data as any)?.role ?? null));
    });
  }, []);

  if (role === undefined) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <span className="font-bold text-gray-900 text-3xl tracking-tight">
          Man<span className="text-green-600">obra</span>
        </span>
      </div>
    );
  }

  if (role === "client") {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
        <Link
          href="/recherche"
          className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold px-8 py-4 rounded-2xl text-base transition-all duration-200 shadow-lg shadow-brand-200 hover:shadow-brand-300 hover:-translate-y-0.5"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Trouver un artisan
        </Link>
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
      <Link
        href="/recherche"
        className="group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold px-8 py-4 rounded-2xl text-base transition-all duration-200 shadow-lg shadow-brand-200 hover:shadow-brand-300 hover:-translate-y-0.5"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        Trouver un artisan
      </Link>
    </div>
    <div className="mt-5 flex items-center justify-center gap-3">
      <span className="text-sm text-gray-400">Vous êtes artisan ?</span>
      <a href="https://artisan.manobra.fr/auth/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 border border-brand-200 hover:border-brand-400 hover:bg-brand-50 px-4 py-2 rounded-xl transition-colors">
        Rejoindre Manobra
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
      </a>
    </div>
  </>);
}

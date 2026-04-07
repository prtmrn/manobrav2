"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function NavbarLanding() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle() as { data: { role: string } | null };

      setRole(profile?.role ?? null);
      setLoading(false);
    };
    check();
  }, []);

  return (
    <div className="flex items-center gap-3">
      {loading ? (
        <div className="w-24 h-8 bg-gray-100 rounded-xl animate-pulse" />
      ) : role ? (
        <Link
          href={role === "artisan" ? "/dashboard/artisan" : "/dashboard/client"}
          className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm"
        >
          Mon espace
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      ) : (
        <>
          <Link
            href="/auth/login"
            className="hidden sm:inline text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Connexion
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm"
          >
            Commencer
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </>
      )}
    </div>
  );
}

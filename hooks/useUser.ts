"use client";

import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types";

interface UseUserReturn {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
}

/**
 * Hook client-side pour accéder à l'utilisateur connecté et son rôle.
 *
 * @example
 * const { user, role, loading } = useUser();
 * if (!loading && user) {
 *   console.log(user.email, role); // "exemple@mail.com", "client"
 * }
 */
export function useUser(): UseUserReturn {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function fetchProfile(userId: string) {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
      setRole(((data as any)?.role as UserRole) ?? null);
    }

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
      if (user) await fetchProfile(user.id);
      setLoading(false);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchProfile(currentUser.id);
      } else {
        setRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, role, loading };
}

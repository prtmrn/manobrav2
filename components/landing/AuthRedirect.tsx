"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthRedirect() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setChecking(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle() as { data: { role: string } | null };

      if (profile?.role === "artisan") {
        router.replace("/dashboard/artisan");
      } else if (profile?.role === "client") {
        router.replace("/dashboard/client");
      } else {
        setChecking(false);
      }
    };
    check();
  }, [router]);

  if (checking) {
    return (
      <div className="fixed inset-0 bg-white z-50" />
    );
  }

  return null;
}

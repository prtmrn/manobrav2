import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Route handler pour le callback OAuth / magic link / reset-password de Supabase.
 * Supabase redirige ici après authentification avec un code d'échange.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Pour la récupération de mot de passe, next = /auth/reset-password
      // L'événement PASSWORD_RECOVERY sera déclenché côté client
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // En cas d'erreur → page d'erreur auth
  return NextResponse.redirect(`${origin}/auth/error`);
}

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const artisanId = searchParams.get("state");

  if (!code || !artisanId) {
    return NextResponse.redirect("https://artisan.manobra.fr/dashboard/planning?error=oauth");
  }

  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET!;
  const redirectUri = "https://artisan.manobra.fr/api/auth/google-calendar/callback";

  // Échanger le code contre des tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenRes.json();

  if (!tokens.access_token) {
    return NextResponse.redirect("https://artisan.manobra.fr/dashboard/planning?error=token");
  }

  const admin = createAdminClient();
  await (admin.from("profiles_artisans") as any).update({
    google_calendar_token: tokens,
    google_calendar_connected: true,
  }).eq("id", artisanId);

  return NextResponse.redirect("https://artisan.manobra.fr/dashboard/planning?google=connected");
}

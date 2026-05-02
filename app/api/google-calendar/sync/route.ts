import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const { artisanId, reservation } = await request.json();
  const admin = createAdminClient();

  const { data: artisan } = await (admin.from("profiles_artisans") as any)
    .select("google_calendar_token, google_calendar_connected")
    .eq("id", artisanId)
    .single();

  if (!artisan?.google_calendar_connected || !artisan?.google_calendar_token) {
    return NextResponse.json({ ok: false, reason: "not_connected" });
  }

  let accessToken = artisan.google_calendar_token.access_token;

  // Refresh token si nécessaire
  if (artisan.google_calendar_token.refresh_token) {
    const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
        refresh_token: artisan.google_calendar_token.refresh_token,
        grant_type: "refresh_token",
      }),
    });
    const refreshed = await refreshRes.json();
    if (refreshed.access_token) {
      accessToken = refreshed.access_token;
      await (admin.from("profiles_artisans") as any).update({
        google_calendar_token: { ...artisan.google_calendar_token, access_token: refreshed.access_token },
      }).eq("id", artisanId);
    }
  }

  const startDateTime = `${reservation.date}T${reservation.heure_debut}`;
  const endDateTime = `${reservation.date}T${reservation.heure_fin}`;

  const event = {
    summary: `Manobra — ${reservation.service_titre ?? "Intervention"}`,
    description: `Client : ${reservation.client_nom ?? ""}\nAdresse : ${reservation.adresse_intervention ?? ""}`,
    start: { dateTime: startDateTime, timeZone: "Europe/Paris" },
    end: { dateTime: endDateTime, timeZone: "Europe/Paris" },
  };

  await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });

  return NextResponse.json({ ok: true });
}

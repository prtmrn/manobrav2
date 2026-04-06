import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendEmailConfirmationClient,
  sendEmailNotifartisan,
} from "@/lib/brevo";

const heureRegex = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const ConfirmSchema = z.object({
  artisanId: z.string().uuid({ message: "artisanId doit être un UUID valide." }),
  serviceId: z.string().uuid({ message: "serviceId doit être un UUID valide." }),
  date: z.string().regex(dateRegex, { message: "date doit être au format YYYY-MM-DD." }),
  heureDebut: z.string().regex(heureRegex, { message: "heureDebut doit être au format HH:MM." }),
  heureFin: z.string().regex(heureRegex, { message: "heureFin doit être au format HH:MM." }),
  adresse: z.string().min(1, "L'adresse est obligatoire.").max(500, "Adresse trop longue.").trim(),
  montantTotal: z.number().finite().nonnegative().max(100_000).nullable().optional(),
  paymentIntentId: z.string().startsWith("pi_").optional(),
  // Champs guest
  guestNom: z.string().max(100).optional(),
  guestTelephone: z.string().max(20).optional(),
  guestEmail: z.string().email("Email invalide.").optional().or(z.literal("")),
});

export async function POST(request: Request) {
  const supabase = await createClient();

  // Authentification optionnelle
  const { data: { user } } = await supabase.auth.getUser();

  // Si connecté, vérifier le rôle client
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const typedProfile = profile as { role: string } | null;
    if (!typedProfile || typedProfile.role !== "client") {
      return NextResponse.json(
        { error: "Seuls les clients peuvent créer une réservation." },
        { status: 403 }
      );
    }
  }

  // Validation du body
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide." }, { status: 400 });
  }

  const parsed = ConfirmSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides." },
      { status: 422 }
    );
  }

  const {
    artisanId, serviceId, date, heureDebut, heureFin, adresse,
    montantTotal, paymentIntentId,
    guestNom, guestTelephone, guestEmail,
  } = parsed.data;

  // Si guest : au moins téléphone ou email requis
  if (!user) {
    const hasContact = (guestTelephone && guestTelephone.trim().length > 0) ||
                       (guestEmail && guestEmail.trim().length > 0);
    if (!hasContact) {
      return NextResponse.json(
        { error: "Veuillez fournir au moins un téléphone ou un email pour être contacté." },
        { status: 422 }
      );
    }
  }

  if (heureDebut >= heureFin) {
    return NextResponse.json(
      { error: "heureFin doit être postérieure à heureDebut." },
      { status: 422 }
    );
  }

  // Vérifier que l'artisan est actif
  const { data: prestaCheck } = await supabase
    .from("profiles_artisans")
    .select("actif")
    .eq("id", artisanId)
    .maybeSingle();

  const prestaRow = prestaCheck as { actif: boolean } | null;
  if (!prestaRow || !prestaRow.actif) {
    return NextResponse.json(
      { error: "Artisan introuvable ou inactif." },
      { status: 404 }
    );
  }

  const mt = montantTotal ?? null;
  const commissionPlateforme = mt != null ? Math.round(mt * 0.1 * 100) / 100 : null;
  const montantArtisan = mt != null ? Math.round(mt * 0.9 * 100) / 100 : null;

  const admin = createAdminClient();

  // @ts-ignore Supabase generated types
  const { data: reservation, error: insertError } = await admin
    .from("reservations")
    .insert({
      client_id: user?.id ?? null,
      artisan_id: artisanId,
      service_id: serviceId,
      date,
      heure_debut: heureDebut,
      heure_fin: heureFin,
      statut: "en_attente",
      adresse_intervention: adresse,
      montant_total: mt,
      commission_plateforme: commissionPlateforme,
      montant_artisan: montantArtisan,
      stripe_payment_intent_id: paymentIntentId ?? null,
      guest_nom: user ? null : (guestNom?.trim() || null),
      guest_telephone: user ? null : (guestTelephone?.trim() || null),
      guest_email: user ? null : (guestEmail?.trim() || null),
    })
    .select("id")
    .single();

  if (insertError) {
    const code = insertError.code;
    const message =
      code === "23514" ? "Créneau invalide (contrainte horaire)." :
      code === "23503" ? "Artisan ou service introuvable." :
      insertError.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const reservationId = (reservation as { id: string }).id;

  // Emails
  const artisanProfileRes = await admin
    .from("profiles_artisans")
    .select("nom, prenom, metier")
    .eq("id", artisanId)
    .maybeSingle();

  const serviceRes = await admin
    .from("services")
    .select("titre")
    .eq("id", serviceId)
    .maybeSingle();

  const artisanAuthRes = await admin.auth.admin.getUserById(artisanId);
  const artisanProfile = artisanProfileRes.data as { nom: string | null; prenom: string | null; metier: string | null } | null;
  const service = serviceRes.data as { titre: string } | null;
  const artisanEmail = artisanAuthRes.data.user?.email ?? "";
  const artisanPrenom = artisanProfile?.prenom ?? artisanEmail.split("@")[0] ?? "Artisan";
  const artisanNomComplet = `${artisanProfile?.prenom ?? ""} ${artisanProfile?.nom ?? ""}`.trim() || artisanEmail;

  // Infos client (connecté ou guest)
  let clientEmail = "";
  let clientPrenom = "Client";
  let clientNomComplet = "Client";

  if (user) {
    const clientAuthRes = await admin.auth.admin.getUserById(user.id);
    const clientProfileRes = await admin.from("profiles_clients").select("nom, prenom").eq("id", user.id).maybeSingle();
    const clientProfile = clientProfileRes.data as { nom: string | null; prenom: string | null } | null;
    clientEmail = clientAuthRes.data.user?.email ?? "";
    clientPrenom = clientProfile?.prenom ?? clientEmail.split("@")[0] ?? "Client";
    clientNomComplet = `${clientProfile?.prenom ?? ""} ${clientProfile?.nom ?? ""}`.trim() || clientEmail;
  } else {
    clientEmail = guestEmail?.trim() ?? "";
    clientPrenom = guestNom?.trim().split(" ")[0] ?? "Client";
    clientNomComplet = guestNom?.trim() ?? "Client";
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const emailData = {
    reservationId,
    serviceTitre: service?.titre ?? "Prestation",
    date, heureDebut, heureFin,
    adresse: adresse || null,
    montantTotal: mt,
    siteUrl,
  };

  Promise.allSettled([
    clientEmail ? sendEmailConfirmationClient({
      ...emailData,
      clientEmail,
      clientPrenom,
      artisanNomComplet,
      artisanMetier: artisanProfile?.metier ?? "artisan",
    }) : Promise.resolve(),
    artisanEmail ? sendEmailNotifartisan({
      ...emailData,
      artisanEmail,
      artisanPrenom,
      clientNomComplet,
    }) : Promise.resolve(),
  ]).then((results) => {
    results.forEach((r) => {
      if (r.status === "rejected") console.error("[Email] Erreur envoi :", r.reason);
    });
  });

  return NextResponse.json({ reservationId }, { status: 201 });
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { geocodeAddress } from "@/lib/geocoding";
import { uploadPrestairePhoto } from "@/lib/storage";
import PhotoUpload from "./PhotoUpload";
import type { Metier } from "@/types";

// ─── Constantes ───────────────────────────────────────────────────────────────

const METIERS: Metier[] = [
  "Serrurier",
  "Plombier",
  "Chauffagiste",
  "Électricien",
  "Vitrier",
  "Ramoneur",
  "Frigoriste",
  "Dépanneur",
  "Autre",
];

const STEPS = ["Identité", "Métier", "Localisation"] as const;

// ─── Schéma Zod ───────────────────────────────────────────────────────────────

const schema = z.object({
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères").max(50),
  prenom: z.string().min(2, "Le prénom doit contenir au moins 2 caractères").max(50),
  metier: z.enum(
    ["Serrurier", "Plombier", "Chauffagiste", "Électricien", "Vitrier", "Ramoneur", "Frigoriste", "Dépanneur", "Autre"],
    { error: "Veuillez sélectionner un métier" }
  ),
  bio: z.string().max(500, "500 caractères maximum").optional().or(z.literal("")),
  adresse: z.string().min(5, "L'adresse est requise"),
  ville: z.string().min(2, "La ville est requise"),
  code_postal: z
    .string()
    .regex(/^\d{5}$/, "Code postal à 5 chiffres (ex : 75001)"),
});

type FormData = z.infer<typeof schema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface PrestaireOnboardingFormProps {
  userId: string;
}

// ─── Composant helpers ────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10A8 8 0 112 10a8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {message}
    </p>
  );
}

function Label({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-colors";

const inputErrorClass =
  "w-full rounded-lg border border-red-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-colors";

// ─── Composant principal ──────────────────────────────────────────────────────

export default function PrestaireOnboardingForm({ userId }: PrestaireOnboardingFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [geocodeStatus, setGeocodeStatus] = useState<"idle" | "loading" | "ok" | "warn">("idle");
  const [geocodedAddress, setGeocodedAddress] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    trigger,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: "",
      prenom: "",
      metier: undefined,
      bio: "",
      adresse: "",
      ville: "",
      code_postal: "",
    },
  });

  const bioValue = watch("bio") ?? "";
  const adresse = watch("adresse");
  const ville = watch("ville");
  const code_postal = watch("code_postal");

  // ── Navigation entre étapes ─────────────────────────────────────────────────

  const STEP_FIELDS: (keyof FormData)[][] = [
    ["nom", "prenom"],
    ["metier", "bio"],
    ["adresse", "ville", "code_postal"],
  ];

  async function handleNext() {
    const valid = await trigger(STEP_FIELDS[step]);
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  // ── Géocodage à la demande ──────────────────────────────────────────────────

  async function handleGeocode() {
    if (!adresse || !ville || !code_postal || code_postal.length !== 5) return;
    setGeocodeStatus("loading");
    const result = await geocodeAddress(adresse, ville, code_postal);
    if (result) {
      setGeocodeStatus("ok");
      setGeocodedAddress(result.formatted_address);
    } else {
      setGeocodeStatus("warn");
      setGeocodedAddress(null);
    }
  }

  // ── Soumission finale ───────────────────────────────────────────────────────

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    setGlobalError(null);

    try {
      // 1. Upload photo (optionnel)
      let photo_url: string | null = null;
      if (photoFile) {
        const result = await uploadPrestairePhoto(photoFile, userId);
        photo_url = result.publicUrl;
      }

      // 2. Géocodage de l'adresse
      let latitude: number | null = null;
      let longitude: number | null = null;

      const coords = await geocodeAddress(data.adresse, data.ville, data.code_postal);
      if (coords) {
        latitude = coords.latitude;
        longitude = coords.longitude;
      }

      // 3. Mise à jour du profil artisan dans Supabase
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("profiles_artisans")
        // @ts-ignore Supabase generated types outdated
        .upsert({
          id: userId,
          nom: data.nom,
          prenom: data.prenom,
          metier: data.metier,
          bio: data.bio ?? null,
          adresse: data.adresse,
          ville: data.ville,
          code_postal: data.code_postal,
          latitude,
          longitude,
          photo_url,
          // actif reste false — modération avant publication
        }, { onConflict: "id" });

      if (updateError) throw new Error(updateError.message);

      // 4. Redirection vers le dashboard artisan
      router.push("/dashboard/artisan");
      router.refresh();
    } catch (err) {
      setGlobalError(
        err instanceof Error ? err.message : "Une erreur inattendue s'est produite."
      );
      setIsSubmitting(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                    i < step
                      ? "bg-brand-600 border-brand-600 text-white"
                      : i === step
                      ? "bg-white border-brand-500 text-brand-600"
                      : "bg-white border-gray-200 text-gray-400"
                  }`}
                >
                  {i < step ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`text-xs font-medium ${
                    i <= step ? "text-brand-600" : "text-gray-400"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 mt-[-18px] transition-colors ${
                    i < step ? "bg-brand-500" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="bg-white border border-gray-200 rounded-2xl p-7 shadow-sm space-y-5">

          {/* ── Étape 0 : Identité ─────────────────────────────────────── */}
          {step === 0 && (
            <>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Vos informations personnelles</h2>
                <p className="text-sm text-gray-500 mt-0.5">Présentez-vous aux clients.</p>
              </div>

              {/* Photo */}
              <Controller
                name="nom"
                control={control}
                render={() => (
                  <PhotoUpload
                    value={photoFile}
                    onChange={setPhotoFile}
                  />
                )}
              />

              {/* Prénom */}
              <div>
                <Label htmlFor="prenom" required>Prénom</Label>
                <input
                  id="prenom"
                  type="text"
                  autoComplete="given-name"
                  placeholder="Jean"
                  {...register("prenom")}
                  className={errors.prenom ? inputErrorClass : inputClass}
                />
                <FieldError message={errors.prenom?.message} />
              </div>

              {/* Nom */}
              <div>
                <Label htmlFor="nom" required>Nom</Label>
                <input
                  id="nom"
                  type="text"
                  autoComplete="family-name"
                  placeholder="Dupont"
                  {...register("nom")}
                  className={errors.nom ? inputErrorClass : inputClass}
                />
                <FieldError message={errors.nom?.message} />
              </div>
            </>
          )}

          {/* ── Étape 1 : Métier ───────────────────────────────────────── */}
          {step === 1 && (
            <>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Votre activité</h2>
                <p className="text-sm text-gray-500 mt-0.5">Décrivez votre expertise.</p>
              </div>

              {/* Métier */}
              <div>
                <Label htmlFor="metier" required>Métier / Spécialité</Label>
                <select
                  id="metier"
                  {...register("metier")}
                  className={`${errors.metier ? inputErrorClass : inputClass} bg-white`}
                  defaultValue=""
                >
                  <option value="" disabled>Sélectionnez votre métier…</option>
                  {METIERS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <FieldError message={errors.metier?.message} />
              </div>

              {/* Bio */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="bio">Biographie</Label>
                  <span className={`text-xs tabular-nums ${bioValue.length > 480 ? "text-orange-500" : "text-gray-400"}`}>
                    {bioValue.length} / 500
                  </span>
                </div>
                <textarea
                  id="bio"
                  rows={4}
                  placeholder="Décrivez votre expérience, vos compétences, ce qui vous distingue…"
                  {...register("bio")}
                  className={`${errors.bio ? inputErrorClass : inputClass} resize-none`}
                  maxLength={500}
                />
                <FieldError message={errors.bio?.message} />
              </div>
            </>
          )}

          {/* ── Étape 2 : Localisation ─────────────────────────────────── */}
          {step === 2 && (
            <>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Votre zone d&apos;intervention</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Les clients proches pourront vous trouver facilement.
                </p>
              </div>

              {/* Adresse */}
              <div>
                <Label htmlFor="adresse" required>Adresse</Label>
                <input
                  id="adresse"
                  type="text"
                  autoComplete="street-address"
                  placeholder="12 rue de la Paix"
                  {...register("adresse")}
                  className={errors.adresse ? inputErrorClass : inputClass}
                />
                <FieldError message={errors.adresse?.message} />
              </div>

              {/* Ville + Code postal */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code_postal" required>Code postal</Label>
                  <input
                    id="code_postal"
                    type="text"
                    autoComplete="postal-code"
                    placeholder="75001"
                    maxLength={5}
                    {...register("code_postal")}
                    className={errors.code_postal ? inputErrorClass : inputClass}
                  />
                  <FieldError message={errors.code_postal?.message} />
                </div>
                <div>
                  <Label htmlFor="ville" required>Ville</Label>
                  <input
                    id="ville"
                    type="text"
                    autoComplete="address-level2"
                    placeholder="Paris"
                    {...register("ville")}
                    className={errors.ville ? inputErrorClass : inputClass}
                  />
                  <FieldError message={errors.ville?.message} />
                </div>
              </div>

              {/* Bouton géocodage */}
              <div>
                <button
                  type="button"
                  onClick={handleGeocode}
                  disabled={geocodeStatus === "loading" || !adresse || !ville || code_postal?.length !== 5}
                  className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {geocodeStatus === "loading" ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                  Vérifier et géolocaliser l&apos;adresse
                </button>

                {geocodeStatus === "ok" && geocodedAddress && (
                  <div className="mt-2 flex items-start gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Adresse trouvée : <strong>{geocodedAddress}</strong></span>
                  </div>
                )}

                {geocodeStatus === "warn" && (
                  <div className="mt-2 flex items-start gap-2 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>Adresse introuvable. Vérifiez les informations ou continuez sans géolocalisation.</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Erreur globale ─────────────────────────────────────────── */}
          {globalError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {globalError}
            </div>
          )}
        </div>

        {/* ── Boutons de navigation ──────────────────────────────────────── */}
        <div className="mt-5 flex justify-between gap-3">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Précédent
            </button>
          ) : (
            <div />
          )}

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-sm font-semibold text-white transition-colors"
            >
              Suivant
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-sm font-semibold text-white transition-colors"
            >
              {isSubmitting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Enregistrement…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Terminer le profil
                </>
              )}
            </button>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Votre profil sera visible après validation par notre équipe.
        </p>
      </form>
    </div>
  );
}

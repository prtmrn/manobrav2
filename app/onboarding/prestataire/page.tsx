import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import PrestaireOnboardingForm from "@/components/onboarding/PrestaireOnboardingForm";

export const metadata: Metadata = {
  title: "Complétez votre profil artisan",
};

export default async function OnboardingartisanPage() {
  const supabase = await createClient();

  // 1. Vérification de l'authentification
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/onboarding/artisan");
  }

  // 2. Vérification du rôle : doit être artisan
  // @ts-ignore Supabase generated types
  // @ts-ignore
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile as any).role !== "artisan") {
    redirect("/dashboard");
  }

  // 3. Vérification : profil déjà complété → rediriger vers dashboard
  // @ts-ignore Supabase generated types
  // @ts-ignore
  const { data: artisan } = await supabase
    .from("profiles_artisans")
    .select("nom, prenom")
    .eq("id", user.id)
    .single();

  if ((artisan as any)?.nom && (artisan as any)?.prenom) {
    redirect("/dashboard/artisan");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* En-tête */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">S</span>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              Inscription artisan
            </p>
            <p className="text-sm font-semibold text-gray-900">
              Bienvenue,{" "}
              <span className="text-brand-600">{user.email}</span>
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        {/* Titre */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Créez votre profil professionnel
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Ces informations seront visibles par les clients. Prenez le temps
            de bien les renseigner pour maximiser vos chances d&apos;être contacté.
          </p>
        </div>

        <PrestaireOnboardingForm userId={user.id} />
      </main>
    </div>
  );
}

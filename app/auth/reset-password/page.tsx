import type { Metadata } from "next";
import Link from "next/link";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = { title: "Réinitialisation du mot de passe" };

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <div className="mx-auto w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg font-bold">S</span>
            </div>
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Mot de passe oublié ?
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Entrez votre email pour recevoir un lien de réinitialisation.
          </p>
        </div>

        <ResetPasswordForm />

        <p className="text-center text-sm text-gray-600">
          <Link
            href="/auth/login"
            className="text-brand-600 hover:text-brand-700 font-medium"
          >
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}

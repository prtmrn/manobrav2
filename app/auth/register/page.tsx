import type { Metadata } from "next";
import Link from "next/link";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: "Créer un compte" };

export default function RegisterPage() {
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
            Créer un compte
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Déjà un compte ?{" "}
            <Link
              href="/auth/login"
              className="text-brand-600 hover:text-brand-700 font-medium"
            >
              Se connecter
            </Link>
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}

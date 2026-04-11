import { headers } from "next/headers";
import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";

export default async function LoginPage() {
  const headersList = await headers();
  const hostname = headersList.get("host") ?? "";
  const isArtisan = hostname.startsWith("artisan.");
  const isAdmin = hostname.startsWith("admin.");
  const label = isAdmin ? "Espace admin" : isArtisan ? "Espace artisan" : "Espace client";
  const mode = isAdmin ? "admin" : isArtisan ? "artisan" : "client";
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-7">
        <div className="text-center">
          <Link href="/" className="inline-block font-bold text-gray-900 text-4xl tracking-tight">
            Man<span className="text-brand-600">obra</span>
          </Link>
          <h1 className="mt-3 text-xl font-bold text-gray-900">Connexion</h1>
          <p className="mt-1 text-sm text-gray-400">{label}</p>
        </div>
        <LoginForm mode={mode} />
        <div className="flex items-center justify-between text-sm">
          <Link href="/auth/register" className="text-brand-600 hover:text-brand-700 font-medium">
            Créer un compte
          </Link>
          <Link href="/auth/reset-password" className="text-gray-400 hover:text-gray-600">
            Mot de passe oublié ?
          </Link>
        </div>
      </div>
    </div>
  );
}

import { headers } from "next/headers";
import type { Metadata } from "next";
import Link from "next/link";
import RegisterForm from "@/components/auth/RegisterForm";
export const metadata: Metadata = { title: "Créer un compte" };
export default async function RegisterPage() {
  const headersList = await headers();
  const hostname = headersList.get("host") ?? "";
  const defaultRole = hostname.startsWith("artisan.") ? "artisan" : "client";
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <div className="mx-auto w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg font-bold">S</span>
            </div>
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Créer un compte</h1>
          <p className="mt-1 text-sm text-gray-600">
            {defaultRole === "artisan" ? "Espace artisan" : "Espace client"}
          </p>
        </div>
        <RegisterForm defaultRole={defaultRole} />
      </div>
    </div>
  );
}

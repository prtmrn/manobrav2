"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types";

export default function RegisterForm({ defaultRole }: { defaultRole?: "client" | "artisan" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(defaultRole ?? "client");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { role },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Mise à jour du rôle si artisan (le trigger crée toujours 'client' par défaut)
    if (role === "artisan") {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          // @ts-ignore Supabase generated types
          .update({ role: "artisan" })
          .eq("id", user.id);
      }
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    const loginUrl = role === "artisan"
      ? "https://artisan.manobra.fr/auth/login"
      : "/auth/login";
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center space-y-2">
        <p className="font-semibold text-green-800">Vérifiez vos emails !</p>
        <p className="text-sm text-green-700">
          Un lien de confirmation a été envoyé à{" "}
          <span className="font-medium">{email}</span>.
        </p>
        <p className="text-sm text-green-600 mt-2">
          Vous vous êtes inscrit en tant que{" "}
          <span className="font-semibold capitalize">{role === "artisan" ? "Artisan" : "Client"}</span>.
        </p>
        
          href={loginUrl}
          className="inline-block mt-4 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg text-sm transition-colors"
        >
          Accéder à mon espace
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-8 space-y-5 shadow-sm">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          placeholder="vous@exemple.com"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          placeholder="Minimum 8 caractères"
        />
      </div>

      {/* Sélection du rôle */}
      <div className="space-y-2">
        <p className="block text-sm font-medium text-gray-700">
          Type de compte
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label
            htmlFor="role-client"
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
              role === "client"
                ? "border-brand-500 bg-brand-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <input
              id="role-client"
              type="radio"
              name="role"
              value="client"
              checked={role === "client"}
              onChange={() => setRole("client")}
              className="sr-only"
            />
            
            <span className="text-sm font-semibold text-gray-800">Client</span>
            <span className="text-xs text-gray-500 text-center">
              Je recherche des services
            </span>
          </label>

          <label
            htmlFor="role-artisan"
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
              role === "artisan"
                ? "border-brand-500 bg-brand-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <input
              id="role-artisan"
              type="radio"
              name="role"
              value="artisan"
              checked={role === "artisan"}
              onChange={() => setRole("artisan")}
              className="sr-only"
            />
            
            <span className="text-sm font-semibold text-gray-800">Artisan</span>
            <span className="text-xs text-gray-500 text-center">
              Je propose des services
            </span>
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors"
      >
        {loading ? "Création…" : "Créer un compte"}
      </button>
    </form>
  );
}

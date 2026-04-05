"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  // true = l'utilisateur a cliqué sur le lien email et peut définir un nouveau MDP
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    // Écoute l'événement PASSWORD_RECOVERY déclenché après le callback
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Étape 1 : demander l'envoi de l'email de réinitialisation ──────────────
  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  // ── Étape 2 : définir le nouveau mot de passe ──────────────────────────────
  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Déconnecter et rediriger vers la page de connexion
    await supabase.auth.signOut();
    router.push("/auth/login?reset=success");
  }

  // ── Mode récupération : formulaire nouveau MDP ─────────────────────────────
  if (isRecoveryMode) {
    return (
      <form
        onSubmit={handleUpdatePassword}
        className="bg-white border border-gray-200 rounded-2xl p-8 space-y-5 shadow-sm"
      >
        <div className="text-center space-y-1">
          <p className="text-lg font-semibold text-gray-900">Nouveau mot de passe</p>
          <p className="text-sm text-gray-500">
            Choisissez un mot de passe sécurisé d&apos;au moins 8 caractères.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
            Nouveau mot de passe
          </label>
          <input
            id="new-password"
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

        <div className="space-y-1">
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
            Confirmer le mot de passe
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            placeholder="Répétez le mot de passe"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          {loading ? "Enregistrement…" : "Enregistrer le nouveau mot de passe"}
        </button>
      </form>
    );
  }

  // ── Email envoyé avec succès ───────────────────────────────────────────────
  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center space-y-2">
        <p className="text-2xl">📧</p>
        <p className="font-semibold text-green-800">Email envoyé !</p>
        <p className="text-sm text-green-700">
          Un lien de réinitialisation a été envoyé à{" "}
          <span className="font-medium">{email}</span>.
        </p>
        <p className="text-xs text-green-600 mt-2">
          Vérifiez vos spams si vous ne le recevez pas sous quelques minutes.
        </p>
      </div>
    );
  }

  // ── Étape 1 : saisie de l'email ────────────────────────────────────────────
  return (
    <form
      onSubmit={handleRequestReset}
      className="bg-white border border-gray-200 rounded-2xl p-8 space-y-5 shadow-sm"
    >
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Adresse email
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

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors"
      >
        {loading ? "Envoi…" : "Envoyer le lien de réinitialisation"}
      </button>
    </form>
  );
}

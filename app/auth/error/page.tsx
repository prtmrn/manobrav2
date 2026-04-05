import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Lien expiré
        </h1>
        <p className="text-gray-500 mb-8">
          Ce lien de confirmation a expiré ou est invalide. Essaie de te reconnecter.
        </p>
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}
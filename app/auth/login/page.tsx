"use client";

import { useState } from "react";
import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  const [mode, setMode] = useState<"client" | "artisan">("client");

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-7">

        {/* Logo */}
        <div className="text-center">
          <Link href="/" className="inline-block font-bold text-gray-900 text-4xl tracking-tight">
            Man<span className="text-brand-600">obra</span>
          </Link>
          <h1 className="mt-3 text-xl font-bold text-gray-900">Connexion</h1>
          <p className="mt-1 text-sm text-gray-400">
            {mode === "client" ? "Je cherche un artisan" : "Je suis artisan"}
          </p>
        </div>

        {/* Toggle interrupteur */}
        <div className="flex justify-center">
          <button
            onClick={() => setMode(mode === "client" ? "artisan" : "client")}
            className="relative flex items-center gap-3 bg-white border border-gray-200 rounded-full px-3 py-2 shadow-sm hover:shadow transition-shadow"
            aria-label="Changer de mode"
          >
            <span className={`text-xs font-semibold transition-colors ${
              mode === "client" ? "text-brand-600" : "text-gray-400"
            }`}>
              Client
            </span>

            {/* Interrupteur : fond blanc, pastille verte */}
            <div className="relative w-14 h-7 bg-white border-2 border-gray-200 rounded-full">
              <div
                style={{
                  position: "absolute",
                  top: "3px",
                  width: "17px",
                  height: "17px",
                  backgroundColor: "#16a34a",
                  borderRadius: "50%",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                  transition: "left 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  left: mode === "client" ? "3px" : "28px",
                }}
              />
            </div>

            <span className={`text-xs font-semibold transition-colors ${
              mode === "artisan" ? "text-brand-600" : "text-gray-400"
            }`}>
              Artisan
            </span>
          </button>
        </div>

        {/* Formulaire */}
        <LoginForm />

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

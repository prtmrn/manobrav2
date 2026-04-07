"use client";

import { useState } from "react";
import Link from "next/link";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  const [mode, setMode] = useState<"client" | "artisan">("client");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── DESKTOP : split gauche/droite ── */}
      <div className="hidden sm:flex flex-1">

        {/* Gauche — client */}
        <button
          onClick={() => setMode("client")}
          className={`flex-1 flex flex-col items-center justify-center gap-4 transition-all duration-300 cursor-pointer border-none outline-none ${
            mode === "client"
              ? "bg-brand-600"
              : "bg-white hover:bg-brand-50"
          }`}
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
            mode === "client" ? "bg-white/20" : "bg-brand-50"
          }`}>
            <svg className={`w-7 h-7 ${mode === "client" ? "text-white" : "text-brand-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="text-center">
            <p className={`text-lg font-bold ${mode === "client" ? "text-white" : "text-gray-800"}`}>
              Je cherche un artisan
            </p>
            <p className={`text-sm mt-1 ${mode === "client" ? "text-brand-100" : "text-gray-400"}`}>
              Espace client
            </p>
          </div>
          {mode === "client" && (
            <div className="w-8 h-1 rounded-full bg-white/60" />
          )}
        </button>

        {/* Séparateur vertical */}
        <div className="w-px bg-gray-200 self-stretch" />

        {/* Droite — artisan */}
        <button
          onClick={() => setMode("artisan")}
          className={`flex-1 flex flex-col items-center justify-center gap-4 transition-all duration-300 cursor-pointer border-none outline-none ${
            mode === "artisan"
              ? "bg-brand-600"
              : "bg-white hover:bg-brand-50"
          }`}
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
            mode === "artisan" ? "bg-white/20" : "bg-brand-50"
          }`}>
            <svg className={`w-7 h-7 ${mode === "artisan" ? "text-white" : "text-brand-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-center">
            <p className={`text-lg font-bold ${mode === "artisan" ? "text-white" : "text-gray-800"}`}>
              Je suis artisan
            </p>
            <p className={`text-sm mt-1 ${mode === "artisan" ? "text-brand-100" : "text-gray-400"}`}>
              Espace professionnel
            </p>
          </div>
          {mode === "artisan" && (
            <div className="w-8 h-1 rounded-full bg-white/60" />
          )}
        </button>
      </div>

      {/* ── FORMULAIRE ── */}
      <div className="flex-1 sm:flex-none flex items-center justify-center px-4 py-10 sm:py-12 sm:border-t sm:border-gray-200">
        <div className="w-full max-w-md space-y-6">

          {/* Logo */}
          <div className="text-center">
            <Link href="/" className="inline-block font-bold text-gray-900 text-2xl tracking-tight">
              Man<span className="text-brand-600">obra</span>
            </Link>
            <h1 className="mt-3 text-xl font-bold text-gray-900">Connexion</h1>
            <p className="mt-1 text-sm text-gray-500">
              {mode === "client" ? "Espace client" : "Espace artisan"}
            </p>
          </div>

          {/* Switch mobile */}
          <div className="sm:hidden flex rounded-xl border border-gray-200 overflow-hidden bg-white">
            <button
              onClick={() => setMode("client")}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                mode === "client"
                  ? "bg-brand-600 text-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Je cherche un artisan
            </button>
            <button
              onClick={() => setMode("artisan")}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                mode === "artisan"
                  ? "bg-brand-600 text-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Je suis artisan
            </button>
          </div>

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
    </div>
  );
}

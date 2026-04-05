"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StatusOption {
  label: string;
  statut: string;
  variant: "primary" | "success" | "danger";
  /** Message de confirmation avant l'action (ex: pour les annulations). */
  confirm?: string;
}

interface Props {
  reservationId: string;
  options: StatusOption[];
  size?: "sm" | "md";
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function ReservationStatusButtons({
  reservationId,
  options,
  size = "sm",
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);

  async function handleAction(opt: StatusOption) {
    if (opt.confirm && !window.confirm(opt.confirm)) return;

    setError(null);
    setLoading(opt.statut);

    try {
      const res = await fetch(`/api/reservations/${reservationId}/status`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ statut: opt.statut }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? "Une erreur est survenue.");
        return;
      }

      router.refresh();
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setLoading(null);
    }
  }

  const pad  = size === "md" ? "px-4 py-2 text-sm"  : "px-3 py-1.5 text-xs";
  const base = `inline-flex items-center gap-1.5 rounded-lg font-semibold
                transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${pad}`;

  const styles: Record<StatusOption["variant"], string> = {
    primary: "bg-brand-600 hover:bg-brand-700 text-white shadow-sm",
    success: "bg-green-600 hover:bg-green-700 text-white shadow-sm",
    danger:  "bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300",
  };

  const Spinner = () => (
    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.statut}
            onClick={() => handleAction(opt)}
            disabled={!!loading}
            className={`${base} ${styles[opt.variant]}`}
          >
            {loading === opt.statut ? (
              <>
                <Spinner />
                <span>En cours…</span>
              </>
            ) : (
              opt.label
            )}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

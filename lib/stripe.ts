import Stripe from "stripe";

/**
 * Client Stripe serveur — utilisé UNIQUEMENT dans les API routes (Node.js).
 * Ne jamais importer dans des composants client ("use client").
 * Lazy-initialized to avoid errors during build-time static analysis.
 */
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
    _stripe = new Stripe(key, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    });
  }
  return _stripe;
}

/** @deprecated Use getStripe() instead. Kept for backward compat. */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as any)[prop];
  },
});

import { loadStripe } from "@stripe/stripe-js";

/**
 * Singleton Stripe.js — ne jamais importer dans les composants serveur.
 * loadStripe est appelé une seule fois (évite les rechargements entre navigations).
 */
export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
);

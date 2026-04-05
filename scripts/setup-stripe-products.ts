/**
 * Script à exécuter UNE SEULE FOIS pour créer les produits Stripe.
 * 
 * Usage :
 *   npx tsx scripts/setup-stripe-products.ts
 *
 * Prérequis : STRIPE_SECRET_KEY dans .env.local
 */

import Stripe from "stripe";
import * as fs from "fs";
import * as path from "path";

// Charger .env.local manuellement
function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnv();

const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.error("❌ STRIPE_SECRET_KEY absent de .env.local");
  process.exit(1);
}

const stripe = new Stripe(stripeKey, {
  apiVersion: "2026-02-25.clover",
});

async function main() {
  console.log("🔧 Création des produits Stripe en cours...\n");

  // ── Plan Essentiel ────────────────────────────────────────────────────────
  const essentielProduct = await stripe.products.create({
    name: "Plan Essentiel",
    description: "Visible sur la carte, jusqu'à 5 services, support email",
    metadata: { plan: "essentiel" },
  });

  const essentielPrice = await stripe.prices.create({
    product: essentielProduct.id,
    unit_amount: 2900, // 29,00 €
    currency: "eur",
    recurring: { interval: "month" },
    nickname: "Essentiel Mensuel",
    metadata: { plan: "essentiel" },
  });

  console.log(`✅ Plan Essentiel créé`);
  console.log(`   Produit : ${essentielProduct.id}`);
  console.log(`   Prix    : ${essentielPrice.id}`);

  // ── Plan Pro ──────────────────────────────────────────────────────────────
  const proProduct = await stripe.products.create({
    name: "Plan Pro",
    description:
      "Mis en avant sur la carte, services illimités, badge Vérifié, statistiques avancées",
    metadata: { plan: "pro" },
  });

  const proPrice = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 5900, // 59,00 €
    currency: "eur",
    recurring: { interval: "month" },
    nickname: "Pro Mensuel",
    metadata: { plan: "pro" },
  });

  console.log(`\n✅ Plan Pro créé`);
  console.log(`   Produit : ${proProduct.id}`);
  console.log(`   Prix    : ${proPrice.id}`);

  // ── Résumé ────────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(60));
  console.log("📋 Ajoutez ces lignes dans votre .env.local :\n");
  console.log(`STRIPE_PRICE_ESSENTIEL=${essentielPrice.id}`);
  console.log(`STRIPE_PRICE_PRO=${proPrice.id}`);
  console.log("\n" + "─".repeat(60));
  console.log(
    "\n💡 Configurez ensuite votre Customer Portal sur :\n" +
    "   https://dashboard.stripe.com/settings/billing/portal\n"
  );

  // Écrire dans .env.local automatiquement si le fichier existe
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf-8");

    const addOrReplace = (content: string, key: string, value: string) => {
      const regex = new RegExp(`^${key}=.*$`, "m");
      if (regex.test(content)) {
        return content.replace(regex, `${key}=${value}`);
      }
      return content + `\n${key}=${value}`;
    };

    envContent = addOrReplace(envContent, "STRIPE_PRICE_ESSENTIEL", essentielPrice.id);
    envContent = addOrReplace(envContent, "STRIPE_PRICE_PRO", proPrice.id);

    fs.writeFileSync(envPath, envContent, "utf-8");
    console.log("✅ Variables ajoutées automatiquement dans .env.local\n");
  }
}

main().catch((err) => {
  console.error("❌ Erreur :", err.message);
  process.exit(1);
});

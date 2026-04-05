# Next.js 14 + Supabase Starter

Starter kit production-ready avec **Next.js 14 App Router**, **Supabase**, **TypeScript** et **Tailwind CSS**.

## 🚀 Démarrage rapide

### 1. Installer les dépendances

```bash
npm install
```

### 2. Configurer Supabase

Copiez `.env.example` vers `.env.local` et renseignez vos clés :

```bash
cp .env.example .env.local
```

Retrouvez vos clés dans [Supabase Dashboard](https://supabase.com/dashboard) → Settings → API.

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-anon-key
```

### 3. Lancer en développement

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

---

## 📁 Structure du projet

```
├── app/                          # Pages (App Router)
│   ├── layout.tsx                # Layout racine
│   ├── page.tsx                  # Page d'accueil
│   ├── auth/
│   │   ├── login/page.tsx        # Connexion
│   │   ├── register/page.tsx     # Inscription
│   │   └── callback/route.ts     # Callback OAuth
│   ├── dashboard/page.tsx        # Dashboard (protégé)
│   └── api/auth/signout/route.ts # Déconnexion
│
├── components/                   # Composants réutilisables
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── SignOutButton.tsx
│   ├── layout/
│   │   └── Navbar.tsx
│   └── ui/
│       └── Button.tsx
│
├── lib/                          # Utilitaires
│   ├── supabase/
│   │   ├── client.ts             # Client navigateur (CSR)
│   │   ├── server.ts             # Client serveur (SSR)
│   │   └── middleware.ts         # Client middleware
│   ├── utils.ts                  # Helpers généraux
│   └── validations.ts            # Validations formulaires
│
├── types/                        # Interfaces TypeScript
│   ├── database.ts               # Types générés Supabase
│   └── index.ts                  # Exports centralisés
│
├── middleware.ts                 # Protection des routes
├── .env.local                    # Variables d'environnement
└── .env.example                  # Template des variables
```

---

## 🔐 Authentification

L'auth est gérée via `@supabase/ssr` avec cookies HTTP-only.

| Route | Protection |
|-------|------------|
| `/dashboard` | ✅ Requiert connexion |
| `/auth/login` | ⏩ Redirige si connecté |
| `/auth/register` | ⏩ Redirige si connecté |

### Callback OAuth / Magic Link

Configurez l'URL de redirection dans Supabase :
```
https://votre-domaine.com/auth/callback
```

---

## 🛠 Commandes

```bash
npm run dev      # Développement (localhost:3000)
npm run build    # Build production
npm run start    # Démarrer en production
npm run lint     # Lint ESLint

# Générer les types Supabase
npx supabase gen types typescript \
  --project-id <project-id> \
  > types/database.ts
```

---

## 📦 Stack technique

- **Framework** : Next.js 14 (App Router)
- **Auth & BDD** : Supabase (`@supabase/ssr`)
- **Styling** : Tailwind CSS
- **Langage** : TypeScript strict

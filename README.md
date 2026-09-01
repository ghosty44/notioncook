# Repas

Application web du foyer : la mémoire des repas qu'on a aimés et la table de
correspondance entre un ingrédient et la référence exacte du drive.

Le cœur de valeur n'est pas la collection de recettes, c'est cette table de
correspondance : c'est elle qui fait passer le drive de 40 minutes à moins de 10. L'app ne navigue jamais sur le site du drive, ce travail est fait par Claude
Cowork ; l'app est la mémoire persistante dont Cowork manque.

## État d'avancement

| Phase | Contenu                                                               | État       |
| ----- | --------------------------------------------------------------------- | ---------- |
| 1     | Auth, foyer, modèle de données, capture rapide, bibliothèque, journal | **livrée** |
| 2     | Serveur MCP (`search_meals`, `add_meal`, `log_meal`, `suggest_meals`) | à venir    |
| 3     | Ingrédients, produits, récurrents, planning, liste triée par rayon    | à venir    |
| 4     | Mapping produits et boucle Cowork                                     | à venir    |

Le schéma de base couvre déjà les quatre phases : les tables des phases 2 à 4
existent, elles ne sont simplement pas encore exposées.

## Stack

Next.js 16 (App Router, TypeScript strict), Vercel Postgres (Neon), Drizzle ORM
avec migrations versionnées, Tailwind CSS v4, Zod partagé entre les routes REST
et les futurs outils MCP, Vitest.

## Installation locale

```bash
npm install
cp .env.example .env.local     # renseigne DATABASE_URL et AUTH_SECRET
npm run db:migrate             # applique les migrations du dossier drizzle/
npm run dev                    # http://localhost:3000
```

`AUTH_SECRET` se génère avec `openssl rand -base64 32`.

Sans base de données configurée, `npm run build` et `npm test` fonctionnent :
le client Drizzle n'est résolu qu'à la première requête, et les tests tournent
sur un Postgres embarqué. Seul `npm run dev` a réellement besoin d'une base.

## Provisioning Vercel

1. Sur [vercel.com](https://vercel.com), importer ce dépôt GitHub. Next.js est
   détecté seul, aucune configuration de build à saisir.
2. Onglet **Storage** du projet, créer un store **Postgres** (Neon) et le
   rattacher au projet. Les variables `DATABASE_URL` et `POSTGRES_URL` sont
   injectées automatiquement dans les trois environnements.
3. Onglet **Settings > Environment Variables**, ajouter `AUTH_SECRET`
   (`openssl rand -base64 32`), sur Production, Preview et Development.
4. Appliquer les migrations une fois, depuis ta machine, avec l'URL de
   production dans `.env.local` : `npm run db:migrate`.

Le déploiement se déclenche ensuite à chaque push sur `main`, et chaque PR
obtient un déploiement de prévisualisation.

## Commandes

| Commande              | Effet                                                        |
| --------------------- | ------------------------------------------------------------ |
| `npm run dev`         | Serveur de développement                                     |
| `npm test`            | Tests unitaires et d'intégration (Vitest + PGlite)           |
| `npm run typecheck`   | `tsc --noEmit`                                               |
| `npm run lint`        | ESLint                                                       |
| `npm run format`      | Prettier                                                     |
| `npm run db:generate` | Génère une migration après modification du schéma            |
| `npm run db:migrate`  | Applique les migrations à la base pointée par `DATABASE_URL` |

## Modèle mental

- **`meal.kind`** distingue `recipe`, `combo` et `leftover_base`. Sans ce champ,
  personne n'ose enregistrer « œufs au plat, courgettes, riz », et la base se
  limite aux vraies recettes donc ne sert jamais en semaine.
- **`meal_log`** est le journal de ce qui a réellement été mangé. C'est lui, et
  jamais le planning théorique, qui alimentera les suggestions.
- **`baby_note`** est ce qu'on prélève ou adapte pour la petite. Champ remonté
  dans l'UI, pas une note perdue en bas de fiche.
- **L'ordre de l'enum `aisle`** est l'ordre de parcours du drive. La liste de
  courses est triée dessus, ne pas le réordonner sans y penser.

## Authentification

Pas de mot de passe et pas de magic link : le foyer possède un code
d'invitation, et le partager suffit à rejoindre la même base. Le spec laissait
ce choix ouvert ; l'option retenue évite un service d'envoi d'email, donc une
dépendance tierce. Le code est visible dans l'onglet Journal.

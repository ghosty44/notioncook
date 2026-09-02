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

Next.js 16 (App Router, TypeScript strict), Postgres (Neon, via le Marketplace
Vercel), Drizzle ORM
avec migrations versionnées, Tailwind CSS v4, Zod partagé entre les routes REST
et les outils MCP, `@modelcontextprotocol/server` pour le serveur MCP, Vitest.

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

1. Sur [vercel.com](https://vercel.com), importer ce dépôt GitHub. Le framework
   est déclaré dans `vercel.json`, il n'y a aucune configuration de build à
   saisir.
2. Onglet **Storage** du projet, **Create Database**, choisir **Neon** dans le
   Marketplace et le rattacher au projet. Les variables `DATABASE_URL` et
   `POSTGRES_URL` sont alors injectées dans les trois environnements. Il n'y a
   plus de produit « Vercel Postgres » : Postgres passe par le Marketplace.
3. Onglet **Settings > Environment Variables**, ajouter `AUTH_SECRET`
   (`openssl rand -base64 32`), coché sur Production, Preview et Development.
   Sans elle, aucune session ne peut être signée.
4. Appliquer les migrations une fois, depuis ta machine, avec l'URL de la base
   dans `.env.local` : `npm run db:migrate`.
5. Redéployer (ou pousser un commit) pour que les variables soient prises en
   compte : elles ne sont lues qu'au démarrage d'un nouveau déploiement.

Tant que les étapes 2 et 3 ne sont pas faites, l'app se déploie correctement
mais répond « L'app n'est pas encore reliée à sa base de données » à la
première action.

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

## Serveur MCP

Le serveur vit à `/api/mcp`, en transport HTTP streamable. Il n'accepte aucune
requête non authentifiée.

1. Ouvre l'onglet Journal de l'app, section **Connexion à Claude**, et génère un
   jeton. Il n'est affiché qu'une fois ; en générer un nouveau révoque l'ancien.
2. Dans Claude, ajoute un connecteur MCP vers `https://<ton-app>/api/mcp` avec
   l'en-tête `Authorization: Bearer <jeton>`.

Le jeton porte le foyer : tous les outils sont scopés dessus, et le serveur est
instancié par requête avec ce foyer figé. Seule l'empreinte HMAC du jeton est
stockée, jamais le jeton lui-même.

| Outil           | Ce qu'il fait                                                     |
| --------------- | ----------------------------------------------------------------- |
| `search_meals`  | Cherche par nom, tag ou note, trié « pas fait depuis longtemps »  |
| `get_meal`      | Fiche complète : ingrédients, étapes, note bébé, historique       |
| `add_meal`      | Crée un repas, le nom suffit                                      |
| `update_meal`   | Met à jour les champs fournis                                     |
| `log_meal`      | Enregistre le réellement mangé, crée le repas en combo si inconnu |
| `suggest_meals` | Classe par score déterministe, avec le détail du score            |

Les réponses sont du texte structuré, pas du JSON brut, et incluent toujours les
identifiants pour permettre les appels chaînés.

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

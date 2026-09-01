# Contexte pour les sessions Claude Code

Reprise des sections 1, 3 et 5 du spec. En cas de doute, `SPEC.md` fait foi.

## 1. Intention

Foyer de deux adultes et un enfant de 18 mois. Deux douleurs :

1. **L'amnésie culinaire.** On ne se rappelle pas des plats qu'on a aimés, ni
   des combos simples qui ne sont pas des « recettes » mais qui dépannent un
   soir de semaine.
2. **Le drive interminable.** 40 minutes par semaine, non pas parce que cliquer
   est lent, mais parce qu'à chaque ligne il faut chercher, comparer, hésiter
   sur la marque et le format.

**Le cœur de valeur n'est pas la collection de recettes.** C'est la table de
correspondance entre un ingrédient et une référence produit précise du drive
(enseigne, marque, format, identifiant).

**Contrainte de conception numéro un : la friction de saisie.** Si enregistrer
un repas prend plus de 20 secondes, la base meurt en trois semaines. Toute
décision de design s'arbitre à cette aune. C'est aussi la raison d'être du
serveur MCP : la saisie principale se fait à la voix via Claude, pas via des
formulaires.

**Ce que l'app ne fait pas :** elle ne navigue pas sur le site du drive. Le
remplissage du panier est déjà assuré par Claude Cowork. L'app est la mémoire
persistante dont Cowork manque. Ne pas écrire de Playwright, pas d'extension
navigateur, pas de scraping.

## 3. Modèle de données

Le schéma complet vit dans `lib/db/schema.ts`, les migrations dans `drizzle/`.
Points structurants :

- `household` porte tout : **toutes les données sont scopées par foyer**, jamais
  par utilisateur, pour que les deux adultes partagent la même base.
- `meal.kind` : `recipe` | `combo` | `leftover_base`. Central : sans lui la base
  se limite aux vraies recettes.
- `meal.effort` : `express` (< 10 min) | `standard` (10 à 30) | `projet` (> 30).
- `meal.baby_note` : ce qu'on prélève ou adapte pour l'enfant. À faire remonter
  dans l'UI et dans les suggestions.
- `meal_ingredient.is_pantry_staple` : les ingrédients qu'on a toujours, exclus
  de la liste de courses.
- `product` : **table la plus importante du système**, ingrédient canonique vers
  référence réelle chez une enseigne, avec `is_preferred`.
- `meal_log` : journal du réellement mangé. **Seule source des suggestions**, un
  plan non suivi ne doit pas influencer les recommandations.
- `recurring_item` : le socle du panier qui ne bouge pas, environ 70 % du réel.
- Enum `aisle` : son **ordre est l'ordre de parcours du drive**, la liste de
  courses est triée dessus.

## 5. Serveur MCP (phase 2, pas encore livré)

Route handler Next à `/api/mcp`, transport HTTP streamable, SDK
`@modelcontextprotocol/sdk`. Auth par jeton de foyer en header
`Authorization: Bearer`, jamais de requête non authentifiée. Tous les outils
scopés au foyer déduit du jeton, toutes les entrées validées par les **mêmes
schémas Zod que les routes REST** (`lib/schemas/`).

Outils prévus : `search_meals`, `get_meal`, `add_meal`, `update_meal`,
`log_meal`, `suggest_meals`, `get_week_plan`, `set_plan_entry`,
`generate_shopping_list`, `add_to_shopping_list`, `get_shopping_list`,
`get_recurring_items`, `set_product_preference`, puis pour la boucle Cowork
`get_store_rules`, `mark_list_ordered`, `reject_product`, `report_unavailable`.

Réponses en **texte structuré lisible, pas en JSON brut**, identifiants
systématiquement inclus pour permettre les appels chaînés.

## Règles de travail sur ce repo

- La logique métier vit dans `lib/domain/`, appelée à la fois par les routes
  REST et par les outils MCP. **Aucune duplication entre les deux surfaces.**
- Toute entrée passe par un schéma Zod de `lib/schemas/`, partagé.
- Le client Drizzle est résolu à la première requête (`db()`), jamais à
  l'import : le build doit passer sans base configurée.
- Après modification du schéma : `npm run db:generate`, la migration est
  versionnée dans le repo.
- Avant de pousser : `npm run typecheck && npm run lint && npm test`.
- Une PR par phase, commits atomiques.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

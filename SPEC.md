# Spec technique : app repas + courses + serveur MCP

Document destiné à Claude Code. Objectif : construire une application web déployée sur Vercel, versionnée sur GitHub, exposant un serveur MCP distant connectable à Claude.

---

## 1. Contexte et intention

Foyer de deux adultes et un enfant de 18 mois. La charge mentale des repas et des courses repose aujourd'hui sur une seule personne. Deux douleurs concrètes :

1. **L'amnésie culinaire.** On ne se rappelle pas des plats qu'on a aimés, ni des combos simples et rapides (oeufs au plat avec tel légume) qui ne sont pas des "recettes" mais qui dépannent très bien un soir de semaine.
2. **Le drive interminable.** Refaire le panier chaque semaine prend 40 minutes, non pas parce que cliquer est lent, mais parce qu'à chaque ligne il faut chercher, comparer, hésiter sur la marque et le format.

**Le coeur de valeur de l'app n'est pas la collection de recettes.** C'est la table de correspondance entre un ingrédient et une référence produit précise du drive (enseigne, marque préférée, format, identifiant). C'est elle qui transforme "on mange quoi cette semaine" en liste de courses actionnable en quelques minutes.

**Contrainte de conception numéro un : la friction de saisie.** Si enregistrer un repas prend plus de 20 secondes, la base meurt en trois semaines. Toute décision de design doit être arbitrée à l'aune de ce critère. C'est aussi la raison d'être du serveur MCP : la saisie principale se fait à la voix, via Claude, pas via des formulaires.

**Ce que l'app ne fait PAS :** elle ne navigue pas sur le site du drive. Le remplissage du panier est déjà assuré par Claude Cowork, qui fonctionne. L'app est la **mémoire persistante** dont Cowork manque : elle lui dit quoi acheter, avec quelles règles, et quel produit exact avait été retenu la dernière fois. Voir la section 9, qui est le coeur du système.

---

## 2. Stack imposée

- **Next.js 15+**, App Router, TypeScript strict
- **Vercel** pour l'hébergement et le déploiement continu depuis GitHub
- **Vercel Postgres** (Neon) comme base de données
- **Drizzle ORM** avec migrations versionnées dans le repo
- **Tailwind CSS**, pas de librairie de composants lourde
- **Auth.js (NextAuth)** en mode magic link email, ou un simple partage de foyer par code d'invitation si plus rapide à livrer
- **Zod** pour toute validation d'entrée, réutilisée entre les routes API et les outils MCP
- **Vitest** pour les tests de la logique métier

Contraintes : mobile first, l'usage principal se fait sur téléphone dans la cuisine ou en faisant le drive. Aucune dépendance à un service tiers payant.

---

## 3. Modèle de données

Quatre entités principales. Les noms de tables sont indicatifs mais la structure doit être respectée.

### `household`
Le foyer. Toutes les données sont scopées par foyer, pas par utilisateur, pour que les deux adultes partagent tout.
- `id`, `name`, `created_at`

### `user`
- `id`, `household_id`, `email`, `name`

### `meal`
Un repas. Le champ `kind` est central : sans lui, personne n'ose enregistrer un plat trop simple, et la base se limite aux "vraies recettes" donc ne sert jamais en semaine.
- `id`, `household_id`
- `name`
- `kind` : enum `recipe` | `combo` | `leftover_base`
  - `recipe` : préparation structurée avec étapes
  - `combo` : assemblage simple sans étapes réelles, par exemple "oeufs au plat + courgettes rôties + riz"
  - `leftover_base` : préparation en grande quantité qui sert plusieurs repas
- `effort` : enum `express` (moins de 10 min) | `standard` (10 à 30 min) | `projet` (plus de 30 min)
- `steps` : texte markdown, optionnel et souvent vide pour les combos
- `notes` : texte libre
- `baby_note` : texte. Ce qu'on prélève ou adapte pour l'enfant, typiquement la portion mise de côté avant de saler ou d'épicer, la texture, ce qui passe ou ne passe pas. Champ très concret à cet âge, à faire remonter dans l'UI et dans les suggestions.
- `tags` : tableau de texte, libre (`végé`, `four`, `une seule casserole`, `batch cooking`, `hiver`)
- `season` : tableau d'enum mois ou saison, optionnel
- `source_url` : optionnel
- `rating` : entier 1 à 5, optionnel
- `is_archived` : booléen
- `created_at`, `updated_at`

### `meal_ingredient`
Ligne d'ingrédient d'un repas. Le lien vers `ingredient` est ce qui rend la génération de liste possible.
- `id`, `meal_id`, `ingredient_id`
- `quantity` : numérique, optionnel
- `unit` : texte, optionnel
- `is_pantry_staple` : booléen. Marque les ingrédients qu'on a toujours (sel, huile, farine) et qu'il ne faut pas remettre systématiquement dans la liste de courses.
- `free_text` : texte, pour les cas non normalisables

### `ingredient`
Ingrédient canonique, scopé au foyer.
- `id`, `household_id`, `name`, `aisle` (enum rayon, voir plus bas), `default_unit`

### `store`
Une enseigne de drive.
- `id`, `household_id`, `name`, `base_url`

### `product`
**Table la plus importante du système.** La correspondance entre un ingrédient canonique et une référence réelle chez une enseigne.
- `id`, `household_id`, `ingredient_id`, `store_id`
- `label` : le nom exact tel qu'affiché sur le drive
- `brand`
- `format` : texte, par exemple "30 cl", "lot de 6", "1 kg"
- `external_id` : identifiant produit du drive si repérable dans l'URL
- `product_url`
- `last_price` : numérique, optionnel
- `last_seen_at`
- `is_preferred` : booléen. Plusieurs produits peuvent exister pour un même ingrédient, un seul est le choix par défaut.
- `note` : texte, par exemple "prendre le format familial, l'autre est plus cher au kilo"

### `meal_log`
Journal de ce qui a réellement été mangé. **C'est cette table qui alimente les suggestions, pas le planning théorique.** Un plan non suivi ne doit pas influencer les recommandations.
- `id`, `household_id`, `meal_id`, `date`, `slot` (enum `midi` | `soir`), `liked_by_baby` (booléen nullable), `comment`

### `plan_entry`
Planning de la semaine.
- `id`, `household_id`, `date`, `slot`, `meal_id` (nullable), `free_text` (nullable, pour "resto" ou "restes")

### `shopping_list` et `shopping_list_item`
- `shopping_list` : `id`, `household_id`, `store_id`, `status` (`draft` | `ordered`), `created_at`, `ordered_at`
- `shopping_list_item` : `id`, `list_id`, `ingredient_id` (nullable), `product_id` (nullable), `label`, `quantity`, `unit`, `aisle`, `is_checked`, `source` (enum `plan` | `manual` | `recurring`)

### `recurring_item`
Le socle du panier qui ne bouge pas d'une semaine à l'autre (couches, lait, café, papier toilette). Environ 70 % du panier réel.
- `id`, `household_id`, `product_id`, `default_quantity`, `frequency_weeks` (1 = chaque semaine, 2 = une semaine sur deux), `last_added_at`

### Enum `aisle` (rayons)
`fruits_legumes`, `boucherie`, `poissonnerie`, `cremerie`, `charcuterie_traiteur`, `epicerie_salee`, `epicerie_sucree`, `boulangerie`, `surgeles`, `boissons`, `bebe`, `entretien`, `hygiene`, `autre`

L'ordre de cet enum doit correspondre à l'ordre de parcours du drive, la liste est triée par rayon.

---

## 4. Fonctionnalités par écran

### 4.1 Capture rapide (écran d'accueil)
L'écran par défaut sur mobile. Un seul champ texte et un bouton. On tape "curry lentilles coco" et ça enregistre le repas du jour. Si le repas existe déjà en base, autocomplétion et log en un tap. S'il n'existe pas, création avec le nom seul, tout le reste reste vide et pourra être complété plus tard ou jamais.

Critère d'acceptation : logger un repas déjà connu prend 2 taps et moins de 5 secondes.

### 4.2 Bibliothèque de repas
Liste filtrable par `kind`, `effort`, tags, saison. Tri par défaut : "pas fait depuis longtemps". Affiche pour chaque repas la date du dernier log et le nombre total de fois fait. Recherche plein texte sur nom, tags et notes.

### 4.3 Fiche repas
Nom, effort, tags, ingrédients, étapes si présentes, note bébé bien visible, historique des logs, note. Édition inline, pas de formulaire modal lourd.

### 4.4 Suggestions
Pas d'IA côté serveur. Un score déterministe, simple et explicable :

```
score = jours_depuis_dernier_log (plafonné à 90)
      + 20 si effort correspond au temps disponible demandé
      + 15 si la saison courante est dans meal.season
      + 10 si rating >= 4
      + 10 si liked_by_baby vrai sur le dernier log
      - 30 si fait il y a moins de 7 jours
      - 50 si un ingrédient est marqué exclu dans la requête
```

L'endpoint renvoie les repas triés avec le détail du score. **La couche langage naturel est faite par Claude via MCP, pas par l'app.**

### 4.5 Planning de la semaine
Grille 7 jours x 2 créneaux. Glisser-déposer ou sélection depuis la bibliothèque. Chaque case peut aussi contenir du texte libre. Bouton "générer la liste de courses" en bas.

### 4.6 Liste de courses
Générée depuis le planning. Logique d'agrégation :

1. Collecter tous les `meal_ingredient` des repas planifiés sur la période
2. Exclure ceux marqués `is_pantry_staple`
3. Agréger par `ingredient_id` en sommant les quantités quand les unités sont compatibles
4. Ajouter les `recurring_item` dont la fréquence est échue
5. Pour chaque ingrédient, résoudre le `product` marqué `is_preferred` pour l'enseigne choisie
6. Trier par `aisle` dans l'ordre de parcours du magasin

Rendu de chaque ligne : **le libellé produit exact, la marque, le format, le rayon, et le lien direct vers la fiche produit si `product_url` est renseigné.** C'est ce niveau de précision qui fait passer le drive de 40 minutes à moins de 10, parce qu'il n'y a plus aucune décision à prendre pendant la saisie.

Les lignes sans produit mappé sont regroupées en haut dans une section "à mapper". Quand on saisit le produit choisi pendant le drive, il est mémorisé et n'apparaîtra plus jamais dans cette section. Au bout de deux ou trois courses, plus de 90 % des lignes sont mappées.

Mode course : cases à cocher, gros boutons, la ligne cochée passe en gris et descend. État persisté en temps réel pour que les deux adultes puissent faire la liste en parallèle.

### 4.7 Produits
Écran de gestion des correspondances ingrédient vers produit. Peu utilisé au quotidien mais indispensable pour corriger. Permet de coller une URL produit du drive, l'app extrait ce qu'elle peut de l'URL et pré-remplit.

---

## 5. Serveur MCP

Implémenté comme un route handler Next.js à `/api/mcp`, transport HTTP streamable, conforme à la spec MCP. Utiliser le SDK TypeScript officiel `@modelcontextprotocol/sdk`.

**Auth :** OAuth 2.1 si le SDK le permet proprement, sinon token statique par foyer passé en header `Authorization: Bearer`, généré depuis l'app et régénérable. Ne jamais accepter une requête MCP non authentifiée, la base contient des données personnelles.

Tous les outils sont scopés au foyer déduit du token. Toutes les entrées validées par les mêmes schémas Zod que les routes REST.

### Outils à exposer

| Outil | Entrée | Sortie |
|---|---|---|
| `search_meals` | `query`, `kind?`, `effort?`, `tags?`, `limit?` | liste de repas avec id, nom, effort, tags, dernier log |
| `get_meal` | `meal_id` | fiche complète avec ingrédients et note bébé |
| `add_meal` | `name`, `kind`, `effort`, `ingredients?`, `steps?`, `baby_note?`, `tags?` | repas créé |
| `update_meal` | `meal_id` + champs partiels | repas mis à jour |
| `log_meal` | `meal_name_or_id`, `date?`, `slot?`, `liked_by_baby?`, `comment?` | log créé. Si le nom ne correspond à rien, créer le repas à la volée en `kind: combo` et le signaler dans la réponse. |
| `suggest_meals` | `time_available?`, `exclude_ingredients?`, `tags?`, `count?` | repas scorés avec justification du score |
| `get_week_plan` | `week_start?` | planning |
| `set_plan_entry` | `date`, `slot`, `meal_id` ou `free_text` | entrée mise à jour |
| `generate_shopping_list` | `store_id?`, `from_date`, `to_date` | liste générée, groupée par rayon, avec les produits résolus et les lignes non mappées signalées |
| `add_to_shopping_list` | `items[]` (texte libre) | items ajoutés, avec résolution automatique vers un produit quand l'ingrédient est connu |
| `get_shopping_list` | `list_id?` | liste courante formatée pour lecture à voix haute ou copie |
| `get_recurring_items` | aucune | socle récurrent |
| `set_product_preference` | `ingredient_name`, `store_id`, `label`, `brand?`, `format?`, `product_url?` | correspondance enregistrée |

### Format des réponses
Renvoyer du texte structuré lisible, pas du JSON brut, dans le `content` de type `text`. Claude le restitue mieux à l'oral. Inclure systématiquement les identifiants pour permettre les appels chaînés.

### Cas d'usage cibles à valider
- "Note qu'hier soir on a fait le curry de lentilles, la petite a bien mangé" appelle `log_meal`
- "J'ai 15 minutes ce soir, propose-moi trois trucs" appelle `suggest_meals`
- "Génère la liste de courses pour la semaine" appelle `generate_shopping_list`
- Une tâche récurrente Claude chaque matin qui appelle `suggest_meals` et envoie l'inspiration du jour

---

## 6. API REST interne

Les mêmes opérations exposées en REST sous `/api/`, consommées par le front. La logique métier vit dans `lib/` et est appelée à la fois par les routes REST et par les outils MCP. **Aucune duplication de logique entre les deux surfaces.**

---

## 7. Structure du repo

```
/app
  /(app)               écrans authentifiés
    /page.tsx          capture rapide
    /meals
    /plan
    /shopping
    /products
  /api
    /mcp/route.ts      serveur MCP
    /...               routes REST
/lib
  /db                  schéma Drizzle, migrations, client
  /domain              logique métier pure, testée
    meals.ts
    suggestions.ts
    shopping-list.ts
  /mcp
    tools.ts           définition des outils, appelle /lib/domain
  /schemas             Zod partagé
/drizzle               migrations générées
```

---

## 8. Livraison par phases

Livrer et déployer à la fin de chaque phase, ne pas tout construire avant de montrer.

**Phase 1 : socle.** Auth, foyer, modèle de données, capture rapide, bibliothèque, journal. Objectif : deux semaines d'usage réel à logger les repas. Sans ces données, tout le reste est théorique.

**Phase 2 : MCP.** Serveur MCP avec `search_meals`, `add_meal`, `log_meal`, `suggest_meals`. À ce stade la moitié de la valeur est là, accessible à la voix.

**Phase 3 : courses.** Ingrédients, produits, récurrents, planning, génération de liste triée par rayon, mode course.

**Phase 4 : mapping produits et boucle Cowork.** Écran de correspondance, règles de magasin en base, outils MCP en écriture (`set_product_preference`, `reject_product`, `mark_list_ordered`). C'est la phase qui rend le drive quasi automatique, parce que Cowork enrichit lui-même la base à chaque commande.

---

## 9. Le remplissage du drive : Claude Cowork

**Rien à construire ici. Le remplissage du panier est déjà résolu et fonctionne en production.** Claude Cowork reçoit une liste de courses, navigue sur le drive E.Leclerc et remplit le panier de façon autonome. Ne pas développer d'extension navigateur, ne pas tenter de scraping serveur, ne pas écrire de code Playwright.

Conséquence sur l'architecture : **l'app n'est pas un outil de saisie, elle est la mémoire persistante de Cowork.** Cowork sait exécuter mais ne se souvient de rien d'une session à l'autre. L'app fournit les deux choses qui lui manquent : quoi acheter, et quel produit exact avait été retenu la dernière fois.

### Boucle complète

1. L'app génère la liste depuis le planning de la semaine
2. Cowork, connecté au serveur MCP, appelle `get_shopping_list`
3. Pour chaque ligne déjà mappée, il a le libellé exact, la marque, le format et l'URL produit : aucune décision à prendre, il ajoute au panier
4. Pour chaque ligne non mappée, il cherche selon les règles de choix produit, retient une référence, et **appelle `set_product_preference` pour l'enregistrer**
5. Il appelle `mark_list_ordered` quand le panier est complet
6. La commande suivante, l'étape 4 ne concerne plus que les nouveautés

L'intérêt du point 4 est décisif : la table de correspondance s'auto-alimente à l'usage au lieu d'être maintenue à la main dans un fichier markdown. Au bout de trois ou quatre commandes, elle couvre l'essentiel du panier.

### Règles de choix produit

Elles ne doivent pas rester dans un document externe, elles vivent en base et sont exposées par le MCP via un outil `get_store_rules`. Cowork les lit au début de chaque session.

Ajouter au modèle de données :

- table `store_rule` : `id`, `store_id`, `priority` (entier, ordre d'application), `rule` (texte). Exemples : privilégier un produit déjà présent dans les produits habituels du drive, respecter une marque explicitement demandée, choisir la marque distributeur à défaut, départager sur le meilleur prix au kilo ou au litre.
- champ `store.house_brands` : tableau de texte, les marques distributeur de l'enseigne
- table `rejected_product` : `id`, `household_id`, `ingredient_id`, `store_id`, `label`, `reason`. **Les substitutions refusées.** Exposée par `get_shopping_list` pour que Cowork ne repropose jamais un produit écarté.
- champs `store.pickup_hours`, `store.address` pour le contexte de session

### Outils MCP supplémentaires

| Outil | Entrée | Sortie |
|---|---|---|
| `get_store_rules` | `store_id?` | règles de choix triées par priorité, marques distributeur, URLs utiles du magasin |
| `mark_list_ordered` | `list_id`, `notes?` | liste passée en statut `ordered` |
| `reject_product` | `ingredient_name`, `store_id`, `label`, `reason` | refus enregistré, ne sera plus proposé |
| `report_unavailable` | `product_id`, `note?` | produit marqué indisponible, `is_preferred` retiré pour forcer un nouveau choix |

### Limites à respecter

Le panier rempli est le livrable final. Jamais de réservation de créneau, jamais de paiement, jamais de saisie d'identifiants. L'humain termine la commande lui-même. Ces limites sont à rappeler dans la sortie de `get_store_rules`.

---

## 10. Préférences et amorçage de la base

### 10.1 Écran Préférences

Un écran de paramétrage, distinct de l'écran Produits (4.7) qui gère les correspondances ligne à ligne. Il contient :

- **Marques préférées par rayon.** Table `brand_preference` : `id`, `household_id`, `store_id`, `aisle` (nullable), `ingredient_id` (nullable), `brand`, `priority`. Une préférence peut être large (tout le rayon crémerie en Marque Repère) ou ciblée (le beurre en telle marque précise). La règle la plus spécifique gagne.
- **Marques et produits à éviter.** Table `avoidance` : `id`, `household_id`, `scope` (enum `brand` | `ingredient` | `product`), `value`, `reason` (enum `allergie` | `goût` | `prix` | `composition` | `autre`), `is_hard`. Un `is_hard` à vrai est bloquant et ne doit jamais être contourné par Cowork, typiquement une allergie.
- **Règles de magasin** (`store_rule`, section 9), éditables ici avec leur ordre de priorité.
- **Socle récurrent** (`recurring_item`) avec sa fréquence.
- **Contraintes du foyer** : texte libre exposé au MCP, par exemple les textures qui passent ou non pour la petite, le budget cible, les formats à privilégier.

### 10.2 Import en masse par Claude

Objectif : déverser des listes de courses, des tickets et des historiques de drive pour amorcer la base sans repartir de zéro.

**Ne jamais écrire directement en base depuis un import.** Passer par une table de staging.

Table `product_candidate` : `id`, `household_id`, `store_id`, `raw_label`, `guessed_ingredient_name`, `guessed_ingredient_id` (nullable), `brand`, `format`, `external_id`, `price`, `occurrences`, `first_seen_at`, `last_seen_at`, `confidence` (`high` | `medium` | `low`), `source` (texte, par exemple "historique drive janvier"), `status` (`pending` | `accepted` | `rejected`), `batch_id`.

### Outils MCP d'import

| Outil | Entrée | Sortie |
|---|---|---|
| `import_products` | `store_id`, `source`, `dry_run` (booléen), `items[]` avec `raw_label`, `ingredient_name?`, `brand?`, `format?`, `external_id?`, `price?`, `date?` | rapport d'import : nombre de nouveaux candidats, doublons fusionnés, correspondances déjà connues, conflits |
| `get_import_batch` | `batch_id` | candidats du lot avec leur statut |
| `resolve_candidates` | `candidate_ids[]`, `action` (`accept` | `reject`), `ingredient_name?` | candidats promus en `product` ou rejetés |
| `set_brand_preference` | `brand`, `aisle?`, `ingredient_name?`, `store_id`, `priority?` | préférence enregistrée |
| `set_avoidance` | `scope`, `value`, `reason`, `is_hard` | évitement enregistré |
| `suggest_recurring_items` | `store_id`, `min_occurrences?` | produits apparaissant régulièrement dans l'historique, avec la fréquence déduite en semaines |

### Règles de traitement

**Déduplication.** Clé de rapprochement, dans cet ordre : `external_id` s'il existe, sinon `raw_label` normalisé (minuscules, accents retirés, ponctuation et espaces multiples supprimés) associé au `store_id`. Un doublon incrémente `occurrences` et met à jour `last_seen_at` au lieu de créer une ligne.

**Confiance.** `high` si `external_id` présent ou si l'ingrédient canonique existe déjà avec un libellé très proche. `medium` si le rapprochement d'ingrédient est plausible. `low` sinon. Les candidats en `high` avec au moins trois occurrences peuvent être promus automatiquement en `product`, tous les autres attendent validation.

**Promotion en produit préféré.** Quand plusieurs candidats pointent le même ingrédient, celui qui a le plus d'occurrences devient `is_preferred`. Les autres restent en base comme alternatives, ce qui sert quand une rupture est signalée par `report_unavailable`.

**`dry_run`.** Obligatoirement supporté. Claude lance d'abord un import à blanc, présente le rapport, et n'écrit qu'après ton accord. C'est le garde-fou principal contre un historique mal parsé.

**Déduction du socle récurrent.** L'historique de drive contient l'information la plus utile de tout l'import : ce que vous rachetez systématiquement. `suggest_recurring_items` calcule l'écart médian entre deux achats d'un même produit et propose une fréquence. C'est ce qui reconstitue les 70 % du panier qui ne bougent jamais.

### 10.3 Écran de validation

Une file d'attente listant les `product_candidate` en `pending`, triés par occurrences décroissantes. Pour chaque ligne : le libellé brut, l'ingrédient deviné, et trois actions rapides (accepter, rattacher à un autre ingrédient, rejeter). Traitement en masse par sélection multiple. C'est un écran qu'on utilise intensément une fois, à l'amorçage, puis presque jamais.

## 11. Instructions de mise en place

1. Créer le repo GitHub, branche `main`
2. `npx create-next-app@latest` en TypeScript, App Router, Tailwind
3. Provisionner Vercel Postgres depuis le dashboard Vercel, récupérer les variables d'environnement
4. Configurer Drizzle, écrire le schéma, générer et appliquer la première migration
5. Connecter le repo à Vercel, vérifier que le déploiement automatique sur push fonctionne
6. Fournir un `.env.example` complet et un README avec les étapes d'installation locale
7. Commits atomiques et messages explicites, une PR par phase

Ajouter un `CLAUDE.md` à la racine du repo reprenant les sections 1, 3 et 5 de ce document, pour que les sessions Claude Code suivantes gardent le contexte.

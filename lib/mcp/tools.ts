import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { createMeal, getMeal, listMeals, logMeal, updateMeal } from '@/lib/domain/meals';
import {
  getImportBatch,
  importProducts,
  resolveCandidates,
  suggestRecurringItems,
} from '@/lib/domain/import';
import { getWeekPlan, setPlanEntry } from '@/lib/domain/plan';
import {
  listStores,
  rejectProduct,
  reportUnavailable,
  setProductPreference,
} from '@/lib/domain/products';
import {
  addToShoppingList,
  generateShoppingList,
  getRecurringItems,
  getShoppingList,
  markListOrdered,
} from '@/lib/domain/shopping';
import { getStoreContext, setAvoidance, setBrandPreference } from '@/lib/domain/store-rules';
import { suggestMeals } from '@/lib/domain/suggestions';
import {
  createMealInput,
  logMealInput,
  searchMealsInput,
  updateMealInput,
} from '@/lib/schemas/meals';
import {
  getStoreRulesInput,
  markListOrderedInput,
  rejectProductInput,
  reportUnavailableInput,
  setAvoidanceInput,
  setBrandPreferenceInput,
} from '@/lib/schemas/cowork';
import {
  getImportBatchInput,
  importProductsInput,
  resolveCandidatesInput,
  suggestRecurringItemsInput,
} from '@/lib/schemas/import';
import { getWeekPlanInput, setPlanEntryInput } from '@/lib/schemas/plan';
import {
  addToShoppingListInput,
  generateShoppingListInput,
  getShoppingListInput,
  setProductPreferenceInput,
} from '@/lib/schemas/shopping';
import { suggestMealsInput } from '@/lib/schemas/suggestions';
import {
  formatMealDetail,
  formatMealLine,
  formatRecurringItems,
  formatShoppingList,
  formatImportReport,
  formatStoreContext,
  formatSuggestion,
  formatWeekPlan,
  text,
} from './format';

const mealId = z.string().min(1).describe('Identifiant du repas, renvoyé par search_meals');

/**
 * Les outils n'ont aucune logique propre : ils appellent lib/domain, comme les
 * routes REST, avec les mêmes schémas Zod de lib/schemas, et se contentent de
 * mettre en forme la réponse.
 *
 * Le foyer est fourni par l'appelant, jamais par les arguments de l'outil : un
 * client MCP ne peut donc pas viser un autre foyer que celui de son jeton.
 */
export function registerTools(server: McpServer, householdId: string): void {
  server.registerTool(
    'search_meals',
    {
      title: 'Chercher un repas',
      description:
        'Cherche dans la bibliothèque du foyer par nom, tag ou note. Trie par « pas fait ' +
        'depuis longtemps ». Renvoie les identifiants, réutilisables par get_meal ou log_meal.',
      inputSchema: searchMealsInput,
    },
    async (input) => {
      const meals = await listMeals(householdId, input);
      if (meals.length === 0) return text('Aucun repas ne correspond.');
      return text(`${meals.length} repas :\n` + meals.slice(0, 40).map(formatMealLine).join('\n'));
    },
  );

  server.registerTool(
    'get_meal',
    {
      title: 'Fiche complète d’un repas',
      description: 'Renvoie la fiche complète : ingrédients, étapes, note bébé et historique.',
      inputSchema: z.object({ meal_id: mealId }),
    },
    async ({ meal_id }) => text(formatMealDetail(await getMeal(householdId, meal_id))),
  );

  server.registerTool(
    'add_meal',
    {
      title: 'Ajouter un repas',
      description:
        'Crée un repas. Le nom suffit : kind vaut combo par défaut, ce qui est le bon choix ' +
        'pour un assemblage simple sans étapes, comme « œufs au plat, courgettes, riz ».',
      inputSchema: createMealInput,
    },
    async (input) => {
      const meal = await createMeal(householdId, input);
      return text(`Repas créé : ${meal.name} [${meal.id}], ${meal.kind}, effort ${meal.effort}.`);
    },
  );

  server.registerTool(
    'update_meal',
    {
      title: 'Modifier un repas',
      description: 'Met à jour les champs fournis. Les champs omis restent inchangés.',
      inputSchema: updateMealInput.extend({ meal_id: mealId }),
    },
    async ({ meal_id, ...patch }) => {
      const meal = await updateMeal(householdId, meal_id, patch);
      return text(`Repas mis à jour : ${meal.name} [${meal.id}].`);
    },
  );

  server.registerTool(
    'log_meal',
    {
      title: 'Enregistrer un repas mangé',
      description:
        'Enregistre ce qui a réellement été mangé. Si le nom ne correspond à aucun repas ' +
        'connu, il est créé à la volée en combo et la réponse le signale. Date par défaut : ' +
        "aujourd'hui, créneau par défaut : soir.",
      inputSchema: logMealInput,
    },
    async (input) => {
      const { log, meal, mealCreated } = await logMeal(householdId, input);
      const baby =
        log.likedByBaby === true
          ? ' La petite a aimé.'
          : log.likedByBaby === false
            ? " La petite n'a pas aimé."
            : '';
      return text(
        `${meal.name} [${meal.id}] enregistré le ${log.date} (${log.slot}).${baby}` +
          (mealCreated ? ' Nouveau repas créé en combo.' : '') +
          `\nIdentifiant du log : ${log.id}`,
      );
    },
  );

  server.registerTool(
    'suggest_meals',
    {
      title: 'Proposer des repas',
      description:
        'Classe les repas du foyer par un score déterministe : ancienneté, temps disponible, ' +
        'saison, note, avis de la petite. Le détail du score est renvoyé pour pouvoir ' +
        "l'expliquer. Se fonde sur le journal, jamais sur un planning non suivi.",
      inputSchema: suggestMealsInput,
    },
    async (input) => {
      const suggestions = await suggestMeals(householdId, { count: 5, ...input });
      if (suggestions.length === 0) {
        return text(
          'Aucun repas en base ne correspond. Utilise add_meal ou log_meal pour amorcer.',
        );
      }
      return text(
        'Suggestions :\n' + suggestions.map((meal, i) => formatSuggestion(meal, i + 1)).join('\n'),
      );
    },
  );

  server.registerTool(
    'get_week_plan',
    {
      title: 'Planning de la semaine',
      description:
        'Renvoie la grille de 7 jours et 2 créneaux, cases vides comprises. La semaine part du ' +
        'lundi. Sans argument, la semaine en cours.',
      inputSchema: getWeekPlanInput,
    },
    async ({ weekStart }) => text(formatWeekPlan(await getWeekPlan(householdId, weekStart))),
  );

  server.registerTool(
    'set_plan_entry',
    {
      title: 'Planifier un repas',
      description:
        'Remplit une case du planning avec un repas connu (mealId ou mealName), ou du texte ' +
        "libre comme « resto » ou « restes ». clear: true vide la case. Planifier n'est pas " +
        'manger : ça ne crée aucune entrée de journal et ça ne pèse pas sur les suggestions.',
      inputSchema: setPlanEntryInput,
    },
    async (input) => {
      const entry = await setPlanEntry(householdId, input);
      return text(
        'cleared' in entry
          ? `Case vidée : ${input.date} ${input.slot}.`
          : `Planifié : ${input.date} ${input.slot} · ${input.mealName ?? input.mealId ?? input.freeText}.`,
      );
    },
  );

  server.registerTool(
    'generate_shopping_list',
    {
      title: 'Générer la liste de courses',
      description:
        'Construit la liste depuis les repas planifiés sur la période : ingrédients agrégés, ' +
        'placard exclu, socle récurrent échu ajouté, produits préférés résolus, tri dans ' +
        "l'ordre de parcours du magasin. Les lignes sans produit connu sont signalées à mapper.",
      inputSchema: generateShoppingListInput,
    },
    async (input) => text(formatShoppingList(await generateShoppingList(householdId, input))),
  );

  server.registerTool(
    'get_shopping_list',
    {
      title: 'Lire la liste de courses',
      description:
        'Renvoie la liste demandée, ou la dernière liste en cours. Format lisible à voix haute, ' +
        'groupé par rayon, avec les identifiants de ligne.',
      inputSchema: getShoppingListInput,
    },
    async ({ listId }) => text(formatShoppingList(await getShoppingList(householdId, listId))),
  );

  server.registerTool(
    'add_to_shopping_list',
    {
      title: 'Ajouter à la liste',
      description:
        'Ajoute des lignes en texte libre. Chaque ligne est résolue vers le produit préféré dès ' +
        "que l'ingrédient est connu du foyer.",
      inputSchema: addToShoppingListInput,
    },
    async (input) => text(formatShoppingList(await addToShoppingList(householdId, input))),
  );

  server.registerTool(
    'get_recurring_items',
    {
      title: 'Socle récurrent',
      description:
        "Le panier qui ne bouge pas d'une semaine à l'autre, avec sa fréquence et ce qui est " +
        'échu. Environ 70 % du panier réel.',
      inputSchema: z.object({}),
    },
    async () => text(formatRecurringItems(await getRecurringItems(householdId))),
  );

  server.registerTool(
    'set_product_preference',
    {
      title: 'Mémoriser un produit du drive',
      description:
        "Associe un ingrédient à une référence précise de l'enseigne et en fait le choix par " +
        "défaut. C'est l'écriture qui fait disparaître la ligne de la section « à mapper » : " +
        'appelle-la dès que tu as arbitré un produit, la table se nourrit ainsi à chaque course.',
      inputSchema: setProductPreferenceInput,
    },
    async (input) => {
      const { product, ingredient } = await setProductPreference(householdId, input);
      return text(
        `${ingredient.name} pointe maintenant sur ${product.label} [${product.id}]` +
          `${product.brand ? ` · ${product.brand}` : ''}${product.format ? ` · ${product.format}` : ''}.`,
      );
    },
  );

  server.registerTool(
    'list_stores',
    {
      title: 'Enseignes du foyer',
      description:
        'Les enseignes de drive enregistrées, avec leur identifiant, à passer aux outils de ' +
        'courses.',
      inputSchema: z.object({}),
    },
    async () => {
      const stores = await listStores(householdId);
      if (stores.length === 0) {
        return text("Aucune enseigne enregistrée. Ajoute-en une depuis l'écran Produits.");
      }
      return text(
        stores
          .map(
            (store) => `- ${store.name} [${store.id}]${store.baseUrl ? ` ${store.baseUrl}` : ''}`,
          )
          .join('\n'),
      );
    },
  );

  server.registerTool(
    'get_store_rules',
    {
      title: "Règles de choix produit de l'enseigne",
      description:
        'À lire au début de chaque session de remplissage de panier. Renvoie les règles de choix ' +
        'ordonnées, les marques distributeur, les marques préférées, les évitements (dont les ' +
        'bloquants, jamais contournables), les informations du magasin et les limites du run.',
      inputSchema: getStoreRulesInput,
    },
    async ({ storeId }) => text(formatStoreContext(await getStoreContext(householdId, storeId))),
  );

  server.registerTool(
    'mark_list_ordered',
    {
      title: 'Marquer la liste comme commandée',
      description:
        'À appeler quand le panier est rempli. La liste passe en commandée. Le créneau de ' +
        "retrait et le paiement restent manuels : ce n'est pas une limite technique mais une " +
        'décision produit, ne cherche pas à les automatiser.',
      inputSchema: markListOrderedInput,
    },
    async (input) => {
      const list = await markListOrdered(householdId, input);
      return text(
        `Liste ${list.id} marquée commandée (${list.items.length} lignes). ` +
          'Le créneau et le paiement restent à faire par un humain.',
      );
    },
  );

  server.registerTool(
    'reject_product',
    {
      title: 'Écarter un produit',
      description:
        'Enregistre un produit écarté pour un ingrédient. Il ne sera plus jamais reproposé et ' +
        "apparaît dans get_shopping_list. S'il était le choix par défaut, il cesse de l'être.",
      inputSchema: rejectProductInput,
    },
    async (input) => {
      const { rejected, ingredient } = await rejectProduct(householdId, input);
      return text(
        `${rejected.label} écarté pour ${ingredient.name} : ${rejected.reason}. ` +
          'Il ne sera plus proposé.',
      );
    },
  );

  server.registerTool(
    'report_unavailable',
    {
      title: 'Signaler une rupture',
      description:
        'Marque un produit indisponible et lui retire son statut de choix par défaut, ce qui ' +
        'force un nouvel arbitrage. Ne jamais substituer en silence : signaler est la bonne ' +
        'réponse à une rupture.',
      inputSchema: reportUnavailableInput,
    },
    async (input) => {
      const product = await reportUnavailable(householdId, input);
      return text(
        `${product.label} [${product.id}] marqué indisponible. ` +
          "Il n'est plus le choix par défaut : un nouveau produit devra être retenu.",
      );
    },
  );

  server.registerTool(
    'set_brand_preference',
    {
      title: 'Enregistrer une marque préférée',
      description:
        'Préférence large (tout un rayon) ou ciblée (un ingrédient précis). La plus spécifique ' +
        "l'emporte. Sert à arbitrer entre deux produits équivalents.",
      inputSchema: setBrandPreferenceInput,
    },
    async (input) => {
      const { preference, ingredient } = await setBrandPreference(householdId, input);
      const portee = ingredient ? `pour ${ingredient.name}` : `pour le rayon ${input.aisle}`;
      return text(`Marque préférée enregistrée : ${preference.brand} ${portee}.`);
    },
  );

  server.registerTool(
    'set_avoidance',
    {
      title: 'Enregistrer un évitement',
      description:
        "Marque, ingrédient ou produit à éviter. isHard à vrai rend l'évitement bloquant : il ne " +
        'doit jamais être contourné, typiquement une allergie. Une raison « allergie » le rend ' +
        "bloquant d'office.",
      inputSchema: setAvoidanceInput,
    },
    async (input) => {
      const avoidance = await setAvoidance(householdId, input);
      return text(
        `${avoidance.value} à éviter (${avoidance.scope}, ${avoidance.reason})` +
          `${avoidance.isHard ? ', bloquant : ne jamais acheter' : ''}.`,
      );
    },
  );

  server.registerTool(
    'import_products',
    {
      title: 'Importer un historique de drive',
      description:
        "Déverse des lignes d'historique, de ticket ou de liste pour amorcer la base. Rien n'est " +
        'écrit dans les produits : tout passe par une table de candidats. Lance TOUJOURS un ' +
        'premier appel avec dryRun à vrai, présente le rapport, et n’écris qu’après accord ' +
        "explicite. Les candidats sûrs vus au moins trois fois sont promus d'office, les autres " +
        "attendent l'écran de validation.",
      inputSchema: importProductsInput,
    },
    async (input) => text(formatImportReport(await importProducts(householdId, input))),
  );

  server.registerTool(
    'get_import_batch',
    {
      title: "Candidats d'un lot d'import",
      description: 'Les candidats du lot avec leur statut, triés par nombre d’occurrences.',
      inputSchema: getImportBatchInput,
    },
    async ({ batchId }) => {
      const rows = await getImportBatch(householdId, batchId);
      return text(
        `${rows.length} candidats :\n` +
          rows
            .map(
              (row) =>
                `- ${row.rawLabel} [${row.id}] · ${row.occurrences}× · ${row.confidence} · ${row.status}` +
                `${row.guessedIngredientName ? ` · deviné : ${row.guessedIngredientName}` : ''}`,
            )
            .join('\n'),
      );
    },
  );

  server.registerTool(
    'resolve_candidates',
    {
      title: 'Valider ou rejeter des candidats',
      description:
        'Promeut les candidats en produits, ou les écarte. ingredientName permet de les ' +
        'rattacher à un autre ingrédient que celui deviné. Le plus fréquent devient le choix par ' +
        'défaut, les autres restent comme alternatives en cas de rupture.',
      inputSchema: resolveCandidatesInput,
    },
    async (input) => {
      const { accepted, rejected } = await resolveCandidates(householdId, input);
      return text(
        accepted > 0
          ? `${accepted} candidats promus en produits.`
          : `${rejected} candidats écartés.`,
      );
    },
  );

  server.registerTool(
    'suggest_recurring_items',
    {
      title: 'Déduire le socle récurrent',
      description:
        "Repère ce qui revient régulièrement dans l'historique importé et propose une fréquence " +
        "en semaines. C'est ce qui reconstitue les 70 % du panier qui ne bougent jamais.",
      inputSchema: suggestRecurringItemsInput,
    },
    async (input) => {
      const rows = await suggestRecurringItems(householdId, input);
      if (rows.length === 0) {
        return text('Rien de suffisamment régulier dans ce qui a été importé.');
      }
      return text(
        `${rows.length} candidats au socle récurrent :\n` +
          rows
            .map(
              (row) =>
                `- ${row.label} [${row.candidateId}] · ${row.occurrences} achats · environ toutes les ${row.frequencyWeeks} semaine(s)`,
            )
            .join('\n'),
      );
    },
  );
}

import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { createMeal, getMeal, listMeals, logMeal, updateMeal } from '@/lib/domain/meals';
import { getWeekPlan, setPlanEntry } from '@/lib/domain/plan';
import { listStores, setProductPreference } from '@/lib/domain/products';
import {
  addToShoppingList,
  generateShoppingList,
  getRecurringItems,
  getShoppingList,
} from '@/lib/domain/shopping';
import { suggestMeals } from '@/lib/domain/suggestions';
import {
  createMealInput,
  logMealInput,
  searchMealsInput,
  updateMealInput,
} from '@/lib/schemas/meals';
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
}

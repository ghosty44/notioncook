import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { createMeal, getMeal, listMeals, logMeal, updateMeal } from '@/lib/domain/meals';
import { suggestMeals } from '@/lib/domain/suggestions';
import {
  createMealInput,
  logMealInput,
  searchMealsInput,
  updateMealInput,
} from '@/lib/schemas/meals';
import { suggestMealsInput } from '@/lib/schemas/suggestions';
import { formatMealDetail, formatMealLine, formatSuggestion, text } from './format';

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
}

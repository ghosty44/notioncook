import { z } from 'zod';

export const mealKind = z.enum(['recipe', 'combo', 'leftover_base']);
export const mealEffort = z.enum(['express', 'standard', 'projet']);
export const mealSlot = z.enum(['midi', 'soir']);

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue au format YYYY-MM-DD');

export const mealIngredientInput = z.object({
  name: z.string().trim().min(1).max(120),
  quantity: z.number().positive().optional(),
  unit: z.string().trim().max(30).optional(),
  isPantryStaple: z.boolean().optional(),
  freeText: z.string().trim().max(200).optional(),
});

export const createMealInput = z.object({
  name: z.string().trim().min(1, 'Le nom du repas est requis').max(160),
  kind: mealKind.optional(),
  effort: mealEffort.optional(),
  steps: z.string().max(20_000).optional(),
  notes: z.string().max(4_000).optional(),
  babyNote: z.string().max(2_000).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  season: z.array(z.string().trim().min(1).max(20)).max(12).optional(),
  sourceUrl: z.url().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  ingredients: z.array(mealIngredientInput).max(60).optional(),
});

export const updateMealInput = createMealInput.partial().extend({
  isArchived: z.boolean().optional(),
});

export const searchMealsInput = z.object({
  query: z.string().trim().max(120).optional(),
  kind: mealKind.optional(),
  effort: mealEffort.optional(),
  tags: z.array(z.string().trim().min(1)).max(10).optional(),
  limit: z.number().int().min(1).max(200).optional(),
  includeArchived: z.boolean().optional(),
});

export const logMealInput = z.object({
  mealNameOrId: z.string().trim().min(1, 'Indique un repas'),
  date: isoDate.optional(),
  slot: mealSlot.optional(),
  likedByBaby: z.boolean().nullish(),
  comment: z.string().max(2_000).optional(),
});

export type CreateMealInput = z.infer<typeof createMealInput>;
export type UpdateMealInput = z.infer<typeof updateMealInput>;
export type SearchMealsInput = z.infer<typeof searchMealsInput>;
export type LogMealInput = z.infer<typeof logMealInput>;

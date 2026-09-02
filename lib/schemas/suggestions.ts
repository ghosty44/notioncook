import { z } from 'zod';

export const suggestMealsInput = z.object({
  /** Minutes disponibles pour cuisiner. */
  timeAvailable: z.number().int().min(1).max(600).optional(),
  excludeIngredients: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  count: z.number().int().min(1).max(20).optional(),
});

export type SuggestMealsInput = z.infer<typeof suggestMealsInput>;

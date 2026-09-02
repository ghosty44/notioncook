import { z } from 'zod';
import { isoDate, mealSlot } from './meals';

export const getWeekPlanInput = z.object({
  weekStart: isoDate.optional().describe('Lundi de la semaine voulue, aujourd’hui par défaut'),
});

export const setPlanEntryInput = z
  .object({
    date: isoDate,
    slot: mealSlot,
    mealId: z.string().min(1).optional(),
    mealName: z.string().trim().min(1).max(160).optional(),
    freeText: z.string().trim().max(200).optional().describe('« resto », « restes »'),
    clear: z.boolean().optional().describe('Vide la case'),
  })
  .refine(
    (input) => input.clear || input.mealId || input.mealName || input.freeText,
    'Indique un repas, un texte libre, ou clear pour vider la case',
  );

export type GetWeekPlanInput = z.infer<typeof getWeekPlanInput>;
export type SetPlanEntryInput = z.infer<typeof setPlanEntryInput>;

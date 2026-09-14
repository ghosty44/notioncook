import { z } from 'zod';
import { aisleEnum } from './shopping';

export const getStoreRulesInput = z.object({
  storeId: z.string().min(1).optional().describe('Enseigne par défaut du foyer si omis'),
});

export const markListOrderedInput = z.object({
  listId: z.string().min(1),
  notes: z.string().trim().max(1000).optional(),
});

export const rejectProductInput = z.object({
  ingredientName: z.string().trim().min(1).max(120),
  storeId: z.string().min(1),
  label: z.string().trim().min(1).max(200).describe('Libellé exact du produit écarté'),
  reason: z.string().trim().min(1).max(300),
});

export const reportUnavailableInput = z.object({
  productId: z.string().min(1),
  note: z.string().trim().max(300).optional(),
});

export const setStoreRuleInput = z.object({
  storeId: z.string().min(1),
  rule: z.string().trim().min(1).max(500),
  priority: z.number().int().min(0).max(100).optional(),
});

export const setBrandPreferenceInput = z
  .object({
    brand: z.string().trim().min(1).max(80),
    storeId: z.string().min(1).optional(),
    aisle: aisleEnum.optional().describe('Préférence large : tout un rayon'),
    ingredientName: z.string().trim().min(1).max(120).optional().describe('Préférence ciblée'),
    priority: z.number().int().min(0).max(100).optional(),
  })
  .refine(
    (input) => input.aisle || input.ingredientName,
    'Indique un rayon ou un ingrédient : une préférence sans portée ne sert à rien',
  );

export const setAvoidanceInput = z.object({
  scope: z.enum(['brand', 'ingredient', 'product']),
  value: z.string().trim().min(1).max(200),
  reason: z.enum(['allergie', 'gout', 'prix', 'composition', 'autre']),
  isHard: z.boolean().optional().describe('Bloquant, jamais contourné. Vrai pour une allergie.'),
});

export type GetStoreRulesInput = z.infer<typeof getStoreRulesInput>;
export type MarkListOrderedInput = z.infer<typeof markListOrderedInput>;
export type RejectProductInput = z.infer<typeof rejectProductInput>;
export type ReportUnavailableInput = z.infer<typeof reportUnavailableInput>;
export type SetStoreRuleInput = z.infer<typeof setStoreRuleInput>;
export type SetBrandPreferenceInput = z.infer<typeof setBrandPreferenceInput>;
export type SetAvoidanceInput = z.infer<typeof setAvoidanceInput>;

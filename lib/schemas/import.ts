import { z } from 'zod';
import { isoDate } from './meals';

export const importItem = z.object({
  rawLabel: z.string().trim().min(1).max(200),
  ingredientName: z.string().trim().min(1).max(120).optional(),
  brand: z.string().trim().max(80).optional(),
  format: z.string().trim().max(60).optional(),
  externalId: z.string().trim().max(80).optional(),
  price: z.number().nonnegative().optional(),
  date: isoDate.optional().describe('Date de l’achat, pour déduire les fréquences'),
});

export const importProductsInput = z.object({
  storeId: z.string().min(1),
  source: z.string().trim().min(1).max(120).describe('« historique drive janvier »'),
  dryRun: z
    .boolean()
    .describe("Obligatoire. À vrai, rien n'est écrit : le rapport sert à valider l'analyse."),
  items: z.array(importItem).min(1).max(500),
});

export const getImportBatchInput = z.object({ batchId: z.string().min(1) });

export const resolveCandidatesInput = z.object({
  candidateIds: z.array(z.string().min(1)).min(1).max(200),
  action: z.enum(['accept', 'reject']),
  ingredientName: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .optional()
    .describe('Rattache les candidats à cet ingrédient plutôt qu’à celui deviné'),
});

export const suggestRecurringItemsInput = z.object({
  storeId: z.string().min(1).optional(),
  minOccurrences: z.number().int().min(2).max(50).optional(),
});

export type ImportProductsInput = z.infer<typeof importProductsInput>;
export type ResolveCandidatesInput = z.infer<typeof resolveCandidatesInput>;
export type SuggestRecurringItemsInput = z.infer<typeof suggestRecurringItemsInput>;

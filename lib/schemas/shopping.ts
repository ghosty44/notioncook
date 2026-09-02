import { z } from 'zod';
import { isoDate } from './meals';

export const generateShoppingListInput = z.object({
  storeId: z.string().min(1).optional(),
  fromDate: isoDate,
  toDate: isoDate,
  includeRecurring: z.boolean().optional().describe('Socle récurrent échu, activé par défaut'),
});

export const addToShoppingListInput = z.object({
  listId: z.string().min(1).optional().describe('Liste courante par défaut'),
  items: z.array(z.string().trim().min(1).max(160)).min(1).max(50),
});

export const getShoppingListInput = z.object({
  listId: z.string().min(1).optional(),
});

export const setProductPreferenceInput = z.object({
  ingredientName: z.string().trim().min(1).max(120),
  storeId: z.string().min(1),
  label: z.string().trim().min(1).max(200).describe('Libellé exact affiché sur le drive'),
  brand: z.string().trim().max(80).optional(),
  format: z.string().trim().max(60).optional().describe('« 30 cl », « lot de 6 », « 1 kg »'),
  externalId: z.string().trim().max(80).optional(),
  productUrl: z.url().optional(),
  price: z.number().nonnegative().optional(),
  aisle: z
    .enum([
      'fruits_legumes',
      'boucherie',
      'poissonnerie',
      'cremerie',
      'charcuterie_traiteur',
      'epicerie_salee',
      'epicerie_sucree',
      'boulangerie',
      'surgeles',
      'boissons',
      'bebe',
      'entretien',
      'hygiene',
      'autre',
    ])
    .optional(),
  note: z.string().trim().max(300).optional(),
});

export const toggleListItemInput = z.object({ isChecked: z.boolean() });

export type GenerateShoppingListInput = z.infer<typeof generateShoppingListInput>;
export type AddToShoppingListInput = z.infer<typeof addToShoppingListInput>;
export type SetProductPreferenceInput = z.infer<typeof setProductPreferenceInput>;

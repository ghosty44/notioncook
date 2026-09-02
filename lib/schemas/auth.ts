import { z } from 'zod';

const person = {
  name: z.string().trim().min(1, 'Ton prénom est requis').max(80),
  email: z.email('Email invalide'),
};

export const createHouseholdInput = z.object({
  householdName: z.string().trim().min(1, 'Le nom du foyer est requis').max(80),
  ...person,
});

export const joinHouseholdInput = z.object({
  code: z.string().trim().min(4, "Le code d'invitation est requis").max(16),
  ...person,
});

export type CreateHouseholdInput = z.infer<typeof createHouseholdInput>;
export type JoinHouseholdInput = z.infer<typeof joinHouseholdInput>;

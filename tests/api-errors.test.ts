import { describe, expect, it, vi } from 'vitest';
import { ZodError, z } from 'zod';
import { toErrorResponse } from '@/lib/api';
import { ConfigurationError, DomainError } from '@/lib/errors';

describe('toErrorResponse', () => {
  it('laisse passer un message métier destiné à l’utilisateur', async () => {
    const response = toErrorResponse(new DomainError('Repas introuvable', 404));
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Repas introuvable' });
  });

  it('renvoie le premier message de validation Zod', async () => {
    const error = z.object({ name: z.string() }).safeParse({}).error as ZodError;
    const response = toErrorResponse(error);
    expect(response.status).toBe(422);
  });

  it("ne divulgue jamais le détail d'une erreur de configuration", async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = toErrorResponse(
      new ConfigurationError('DATABASE_URL manquante. Provisionne Vercel Postgres.'),
    );

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).not.toContain('DATABASE_URL');
    expect(body.error).not.toContain('Vercel');
    // Le détail reste disponible côté serveur, dans les logs.
    expect(spy.mock.calls.flat().join(' ')).toContain('DATABASE_URL');
    spy.mockRestore();
  });

  it('ne divulgue pas non plus le message d’une erreur inattendue', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = toErrorResponse(new Error('connect ECONNREFUSED 10.0.0.4:5432'));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).not.toContain('ECONNREFUSED');
    expect(body.error).toContain('Réessaie');
    spy.mockRestore();
  });
});

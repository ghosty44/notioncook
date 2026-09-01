import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { DomainError } from '@/lib/domain/households';
import { readSession, type Session } from '@/lib/auth/session';

/**
 * Toutes les routes REST passent par ici : session obligatoire, erreurs
 * traduites une seule fois. Les outils MCP réutiliseront la même couche métier
 * avec leur propre résolution de foyer.
 */
export async function withSession<T>(
  handler: (session: Session) => Promise<T>,
): Promise<NextResponse> {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Session expirée, reconnecte-toi' }, { status: 401 });
  }

  try {
    return NextResponse.json(await handler(session));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: error.issues[0]?.message ?? 'Requête invalide', issues: error.issues },
      { status: 422 },
    );
  }

  if (error instanceof DomainError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error('[api]', error);
  const message = error instanceof Error ? error.message : 'Erreur inattendue';
  return NextResponse.json({ error: message }, { status: 500 });
}

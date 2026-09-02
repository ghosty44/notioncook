import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { ConfigurationError } from '@/lib/errors';
import { households } from '@/lib/db/schema';

const PREFIX = 'repas_';

function secret(): Uint8Array<ArrayBuffer> {
  const value = process.env.MCP_TOKEN_SECRET ?? process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new ConfigurationError(
      'MCP_TOKEN_SECRET manquante ou trop courte (32 caractères minimum). ' +
        'Génère-la avec `openssl rand -base64 32`.',
    );
  }
  return new Uint8Array(new TextEncoder().encode(value));
}

/**
 * Le jeton clair n'est jamais stocké : seule son empreinte HMAC l'est, ce qui
 * rend une fuite de la base inexploitable pour se connecter au MCP.
 */
async function fingerprint(token: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    secret(),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new Uint8Array(new TextEncoder().encode(token)),
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Génère un jeton de foyer et remplace le précédent. Le jeton clair n'est
 * renvoyé qu'ici, une seule fois.
 */
export async function issueMcpToken(householdId: string): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = PREFIX + Buffer.from(bytes).toString('base64url');

  await db()
    .update(households)
    .set({ mcpTokenHash: await fingerprint(token), mcpTokenCreatedAt: new Date() })
    .where(eq(households.id, householdId));

  return token;
}

export async function revokeMcpToken(householdId: string): Promise<void> {
  await db()
    .update(households)
    .set({ mcpTokenHash: null, mcpTokenCreatedAt: null })
    .where(eq(households.id, householdId));
}

/** Renvoie le foyer porteur du jeton, ou null. Jamais d'accès sans jeton valide. */
export async function householdFromMcpToken(token: string | undefined): Promise<string | null> {
  if (!token || !token.startsWith(PREFIX)) return null;

  const [household] = await db()
    .select({ id: households.id })
    .from(households)
    .where(eq(households.mcpTokenHash, await fingerprint(token)))
    .limit(1);

  return household?.id ?? null;
}

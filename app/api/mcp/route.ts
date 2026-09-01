import { createMcpHandler, McpServer, type AuthInfo } from '@modelcontextprotocol/server';
import { householdFromMcpToken } from '@/lib/auth/mcp-token';
import { registerTools } from '@/lib/mcp/tools';

/**
 * Serveur MCP du foyer, transport HTTP streamable web-standard.
 *
 * La fabrique est appelée une fois par requête HTTP : le foyer déduit du jeton
 * est figé dans l'instance servant cette requête, donc deux requêtes de foyers
 * différents ne peuvent pas se mélanger, même sur la même instance de fonction.
 */
const handler = createMcpHandler((context) => {
  const householdId = context.authInfo?.extra?.householdId;
  if (typeof householdId !== 'string') {
    throw new Error('Foyer non résolu : requête MCP servie sans jeton validé.');
  }

  const server = new McpServer({ name: 'repas', version: '0.2.0' });
  registerTools(server, householdId);
  return server;
});

function bearerFrom(request: Request): string | undefined {
  const header = request.headers.get('authorization');
  if (!header) return undefined;
  const [scheme, ...rest] = header.split(' ');
  return scheme.toLowerCase() === 'bearer' ? rest.join(' ').trim() : undefined;
}

function unauthorized(detail: string): Response {
  return Response.json(
    { error: 'unauthorized', detail },
    {
      status: 401,
      headers: { 'WWW-Authenticate': 'Bearer realm="repas", error="invalid_token"' },
    },
  );
}

/**
 * Aucune requête MCP non authentifiée : la base contient des données
 * personnelles. Le jeton est celui du foyer, généré depuis l'app.
 */
async function serve(request: Request): Promise<Response> {
  const token = bearerFrom(request);
  if (!token) return unauthorized('En-tête Authorization: Bearer <jeton de foyer> attendu.');

  const householdId = await householdFromMcpToken(token);
  if (!householdId) return unauthorized('Jeton inconnu ou révoqué.');

  const authInfo: AuthInfo = {
    token,
    clientId: householdId,
    scopes: ['household'],
    extra: { householdId },
  };

  return handler.fetch(request, { authInfo });
}

export const POST = serve;
export const GET = serve;
export const DELETE = serve;

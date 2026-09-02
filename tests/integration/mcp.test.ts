import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDatabase } from './harness';
import { createHousehold } from '@/lib/domain/households';
import { createMeal, logMeal } from '@/lib/domain/meals';
import { householdFromMcpToken, issueMcpToken, revokeMcpToken } from '@/lib/auth/mcp-token';
import type { Session } from '@/lib/auth/session';

let teardown: () => Promise<void>;
let session: Session;
let token: string;
let POST: (request: Request) => Promise<Response>;

const ENDPOINT = 'https://repas.test/api/mcp';

/** Un appel MCP complet : initialize, puis la requête voulue. */
async function rpc(method: string, params: unknown, bearer = token) {
  const call = async (body: unknown) =>
    POST(
      new Request(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        },
        body: JSON.stringify(body),
      }),
    );

  await call({
    jsonrpc: '2.0',
    id: 0,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'test', version: '0' },
    },
  });

  const response = await call({ jsonrpc: '2.0', id: 1, method, params });
  const raw = await response.text();

  // Le transport streamable répond soit en JSON, soit en SSE selon la négociation.
  const payload = raw.startsWith('event:')
    ? JSON.parse(
        raw
          .split('\n')
          .find((l) => l.startsWith('data:'))!
          .slice(5),
      )
    : JSON.parse(raw);

  return { status: response.status, payload };
}

function toolText(payload: { result?: { content?: { text: string }[] } }): string {
  return (payload.result?.content ?? []).map((c) => c.text).join('\n');
}

beforeAll(async () => {
  process.env.MCP_TOKEN_SECRET = 'secret-de-test-suffisamment-long-pour-hmac';
  teardown = await createTestDatabase();
  ({ POST } = await import('@/app/api/mcp/route'));

  session = await createHousehold({
    householdName: 'Maison',
    name: 'Camille',
    email: 'camille@exemple.fr',
  });
  token = await issueMcpToken(session.householdId);

  await createMeal(session.householdId, {
    name: 'Curry de lentilles coco',
    kind: 'recipe',
    effort: 'standard',
    babyNote: 'Portion prélevée avant de saler',
    ingredients: [{ name: 'Lait de coco' }, { name: 'Lentilles corail' }],
  });
  await createMeal(session.householdId, { name: 'Omelette aux herbes', effort: 'express' });
  await logMeal(session.householdId, {
    mealNameOrId: 'Curry de lentilles coco',
    date: '2026-06-01',
    likedByBaby: true,
  });
});

afterAll(async () => {
  await teardown();
});

describe('jeton de foyer', () => {
  it('retrouve le foyer depuis le jeton', async () => {
    expect(await householdFromMcpToken(token)).toBe(session.householdId);
  });

  it('ne stocke pas le jeton en clair', async () => {
    const { getHousehold } = await import('@/lib/domain/households');
    const household = await getHousehold(session.householdId);
    expect(household!.mcpTokenHash).toBeTruthy();
    expect(household!.mcpTokenHash).not.toBe(token);
    expect(household!.mcpTokenHash).not.toContain(token.slice(6));
  });

  it('rejette un jeton inventé, et le jeton révoqué', async () => {
    expect(await householdFromMcpToken('repas_inconnu')).toBeNull();
    expect(await householdFromMcpToken(undefined)).toBeNull();

    const jetable = await createHousehold({
      householdName: 'Jetable',
      name: 'X',
      email: 'x@exemple.fr',
    });
    const other = await issueMcpToken(jetable.householdId);
    await revokeMcpToken(jetable.householdId);
    expect(await householdFromMcpToken(other)).toBeNull();
  });
});

describe('serveur MCP', () => {
  it('refuse une requête sans jeton', async () => {
    const { status } = await rpc('tools/list', {}, '');
    expect(status).toBe(401);
  });

  it('refuse un jeton invalide', async () => {
    const { status } = await rpc('tools/list', {}, 'repas_faux');
    expect(status).toBe(401);
  });

  it('expose les outils des phases 2 et 3', async () => {
    const { payload } = await rpc('tools/list', {});
    const names = payload.result.tools.map((t: { name: string }) => t.name).sort();
    expect(names).toEqual([
      'add_meal',
      'add_to_shopping_list',
      'generate_shopping_list',
      'get_meal',
      'get_recurring_items',
      'get_shopping_list',
      'get_week_plan',
      'list_stores',
      'log_meal',
      'search_meals',
      'set_plan_entry',
      'set_product_preference',
      'suggest_meals',
      'update_meal',
    ]);
  });

  it('cherche un repas et renvoie son identifiant', async () => {
    const { payload } = await rpc('tools/call', {
      name: 'search_meals',
      arguments: { query: 'lentilles' },
    });
    const out = toolText(payload);
    expect(out).toContain('Curry de lentilles coco');
    expect(out).toContain('1 fois au total');
    expect(out).toMatch(/\[[0-9a-f-]{36}\]/);
  });

  it('logge un repas inconnu en le créant à la volée', async () => {
    const { payload } = await rpc('tools/call', {
      name: 'log_meal',
      arguments: { mealNameOrId: 'Pâtes au pesto', date: '2026-08-31', slot: 'soir' },
    });
    const out = toolText(payload);
    expect(out).toContain('Pâtes au pesto');
    expect(out).toContain('Nouveau repas créé en combo');
  });

  it('propose des repas avec le détail du score', async () => {
    const { payload } = await rpc('tools/call', {
      name: 'suggest_meals',
      arguments: { timeAvailable: 15, count: 3 },
    });
    const out = toolText(payload);
    expect(out).toContain('Suggestions :');
    expect(out).toContain('score');
    expect(out).toContain('Omelette aux herbes');
    expect(out).toMatch(/\+20 tient dans 15 min/);
  });

  it('écarte un repas dont un ingrédient est exclu', async () => {
    const { payload } = await rpc('tools/call', {
      name: 'suggest_meals',
      arguments: { excludeIngredients: ['coco'], count: 5 },
    });
    expect(toolText(payload)).toContain('-50 contient lait de coco');
  });

  it('remonte la note bébé dans la fiche', async () => {
    const search = await rpc('tools/call', {
      name: 'search_meals',
      arguments: { query: 'curry' },
    });
    const id = toolText(search.payload).match(/\[([0-9a-f-]{36})\]/)![1];

    const { payload } = await rpc('tools/call', { name: 'get_meal', arguments: { meal_id: id } });
    const out = toolText(payload);
    expect(out).toContain('Pour la petite : Portion prélevée avant de saler');
    expect(out).toContain('Lentilles corail');
  });

  it('refuse de servir le repas d’un autre foyer', async () => {
    const voisins = await createHousehold({
      householdName: 'Voisins',
      name: 'Dominique',
      email: 'd@exemple.fr',
    });
    const voisinToken = await issueMcpToken(voisins.householdId);

    const search = await rpc('tools/call', { name: 'search_meals', arguments: { query: 'curry' } });
    const id = toolText(search.payload).match(/\[([0-9a-f-]{36})\]/)![1];

    const { payload } = await rpc(
      'tools/call',
      { name: 'get_meal', arguments: { meal_id: id } },
      voisinToken,
    );
    expect(JSON.stringify(payload)).toContain('introuvable');
  });
});

describe('courses par le MCP', () => {
  let storeId: string;

  it('crée une enseigne et la retrouve par list_stores', async () => {
    const { createStore } = await import('@/lib/domain/products');
    storeId = (await createStore(session.householdId, { name: 'E.Leclerc Drive' })).id;

    const { payload } = await rpc('tools/call', { name: 'list_stores', arguments: {} });
    expect(toolText(payload)).toContain('E.Leclerc Drive');
  });

  it('planifie un repas puis relit la grille', async () => {
    await rpc('tools/call', {
      name: 'set_plan_entry',
      arguments: { date: '2026-09-07', slot: 'soir', mealName: 'Curry de lentilles coco' },
    });

    const { payload } = await rpc('tools/call', {
      name: 'get_week_plan',
      arguments: { weekStart: '2026-09-07' },
    });
    const out = toolText(payload);
    expect(out).toContain('2026-09-07');
    expect(out).toContain('Curry de lentilles coco');
    expect(out).toContain('vide');
  });

  it('génère la liste triée par rayon avec les lignes à mapper', async () => {
    const { payload } = await rpc('tools/call', {
      name: 'generate_shopping_list',
      arguments: { fromDate: '2026-09-07', toDate: '2026-09-13', storeId },
    });
    const out = toolText(payload);
    expect(out).toContain('À mapper');
    expect(out).toContain('Lentilles corail');
  });

  it('mémorise un produit du drive, qui sort alors de la section à mapper', async () => {
    await rpc('tools/call', {
      name: 'set_product_preference',
      arguments: {
        ingredientName: 'Lentilles corail',
        storeId,
        label: 'Lentilles corail bio 500 g',
        brand: 'Marque Repère',
        format: '500 g',
        productUrl: 'https://drive.example/p/1',
        aisle: 'epicerie_salee',
      },
    });

    const { payload } = await rpc('tools/call', {
      name: 'generate_shopping_list',
      arguments: { fromDate: '2026-09-07', toDate: '2026-09-13', storeId },
    });
    const out = toolText(payload);
    expect(out).toContain('Lentilles corail bio 500 g');
    expect(out).toContain('Marque Repère · 500 g');
    expect(out).toContain('https://drive.example/p/1');
    expect(out).toContain('Épicerie salée');
  });

  it('ajoute une ligne libre et la relit dans la liste courante', async () => {
    await rpc('tools/call', {
      name: 'add_to_shopping_list',
      arguments: { items: ['papier toilette'] },
    });

    const { payload } = await rpc('tools/call', { name: 'get_shopping_list', arguments: {} });
    expect(toolText(payload)).toContain('papier toilette');
  });

  it('renvoie un socle récurrent vide tant que rien n’y est déclaré', async () => {
    const { payload } = await rpc('tools/call', { name: 'get_recurring_items', arguments: {} });
    expect(toolText(payload)).toContain('Aucun socle récurrent');
  });
});

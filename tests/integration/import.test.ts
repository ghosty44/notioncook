import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDatabase } from './harness';
import { createHousehold } from '@/lib/domain/households';
import {
  getImportBatch,
  importProducts,
  listPendingCandidates,
  resolveCandidates,
  suggestRecurringItems,
} from '@/lib/domain/import';
import { createStore, ensureIngredient, listProducts } from '@/lib/domain/products';
import { DomainError } from '@/lib/errors';
import type { Session } from '@/lib/auth/session';

let teardown: () => Promise<void>;
let session: Session;
let storeId: string;

beforeAll(async () => {
  teardown = await createTestDatabase();
  session = await createHousehold({
    householdName: 'Maison',
    name: 'Camille',
    email: 'camille@exemple.fr',
  });
  storeId = (await createStore(session.householdId, { name: 'E.Leclerc Drive' })).id;
  await ensureIngredient(session.householdId, 'Lentilles corail', 'epicerie_salee');
});

afterAll(async () => {
  await teardown();
});

describe('import à blanc', () => {
  it('rend un rapport sans rien écrire', async () => {
    const report = await importProducts(session.householdId, {
      storeId,
      source: 'historique drive janvier',
      dryRun: true,
      items: [
        { rawLabel: 'Lentilles corail bio 500 g', brand: 'Marque Repère' },
        { rawLabel: 'Couches taille 4 x58', externalId: 'REF-4471' },
        { rawLabel: 'REF 9912 X2' },
      ],
    });

    expect(report.dryRun).toBe(true);
    expect(report.received).toBe(3);
    expect(report.created).toBe(3);
    expect(report.byConfidence.high).toBe(2);
    expect(report.byConfidence.low).toBe(1);

    // Rien n'a été écrit : c'est tout l'intérêt du garde-fou.
    expect(await listPendingCandidates(session.householdId)).toHaveLength(0);
    expect(await listProducts(session.householdId, storeId)).toHaveLength(0);
  });
});

describe('import réel', () => {
  it('crée les candidats et promeut les plus sûrs', async () => {
    const report = await importProducts(session.householdId, {
      storeId,
      source: 'historique drive janvier',
      dryRun: false,
      items: [
        // Trois achats du même produit : sûr et fréquent, donc promu d'office.
        { rawLabel: 'Lentilles corail bio 500 g', date: '2026-06-01' },
        { rawLabel: 'Lentilles corail bio 500 g', date: '2026-06-15' },
        { rawLabel: 'Lentilles corail bio 500 g', date: '2026-06-29' },
        // Vu une seule fois : attend la validation humaine.
        { rawLabel: 'Chips paprika 150 g' },
      ],
    });

    expect(report.dryRun).toBe(false);
    expect(report.autoPromoted).toBe(1);

    const produits = await listProducts(session.householdId, storeId);
    expect(produits.map((p) => p.label)).toEqual(['Lentilles corail bio 500 g']);
    expect(produits[0].isPreferred).toBe(true);

    const attente = await listPendingCandidates(session.householdId);
    expect(attente.map((c) => c.rawLabel)).toEqual(['Chips paprika 150 g']);
  });

  it('fusionne un doublon au lieu de créer une ligne', async () => {
    const report = await importProducts(session.householdId, {
      storeId,
      source: 'historique drive février',
      dryRun: false,
      items: [{ rawLabel: 'LENTILLES CORAIL BIO, 500 G' }, { rawLabel: 'Chips paprika 150 g' }],
    });

    expect(report.merged).toBe(2);
    expect(report.created).toBe(0);

    const attente = await listPendingCandidates(session.householdId);
    expect(attente.find((c) => c.rawLabel === 'Chips paprika 150 g')?.occurrences).toBe(2);
  });

  it('garde le libellé vu en premier plutôt que la variante du second export', async () => {
    const produits = await listProducts(session.householdId, storeId);
    expect(produits.map((p) => p.label)).toContain('Lentilles corail bio 500 g');
    expect(produits.map((p) => p.label)).not.toContain('LENTILLES CORAIL BIO, 500 G');
  });

  it('signale un lot par son identifiant', async () => {
    const report = await importProducts(session.householdId, {
      storeId,
      source: 'ticket de caisse',
      dryRun: false,
      items: [{ rawLabel: 'Café moulu 250 g' }],
    });

    const lot = await getImportBatch(session.householdId, report.batchId);
    expect(lot.map((row) => row.rawLabel)).toContain('Café moulu 250 g');
    await expect(
      getImportBatch(session.householdId, '00000000-0000-0000-0000-000000000000'),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it('refuse une enseigne qui n’appartient pas au foyer', async () => {
    const voisins = await createHousehold({
      householdName: 'Voisins',
      name: 'D',
      email: 'd@exemple.fr',
    });

    await expect(
      importProducts(voisins.householdId, {
        storeId,
        source: 'x',
        dryRun: true,
        items: [{ rawLabel: 'Test' }],
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });
});

describe('file de validation', () => {
  it('promeut un candidat accepté en produit', async () => {
    const [chips] = (await listPendingCandidates(session.householdId)).filter(
      (c) => c.rawLabel === 'Chips paprika 150 g',
    );

    const result = await resolveCandidates(session.householdId, {
      candidateIds: [chips.id],
      action: 'accept',
      ingredientName: 'Chips',
    });

    expect(result.accepted).toBe(1);

    const produits = await listProducts(session.householdId, storeId);
    const promu = produits.find((p) => p.label === 'Chips paprika 150 g');
    expect(promu?.ingredientName).toBe('Chips');
    expect(promu?.isPreferred).toBe(true);
  });

  it('retire un candidat rejeté de la file', async () => {
    const avant = await listPendingCandidates(session.householdId);
    const cible = avant.find((c) => c.rawLabel === 'Café moulu 250 g')!;

    const result = await resolveCandidates(session.householdId, {
      candidateIds: [cible.id],
      action: 'reject',
    });

    expect(result.rejected).toBe(1);
    const apres = await listPendingCandidates(session.householdId);
    expect(apres.map((c) => c.rawLabel)).not.toContain('Café moulu 250 g');
  });

  it('refuse une liste de candidats inconnus', async () => {
    await expect(
      resolveCandidates(session.householdId, {
        candidateIds: ['00000000-0000-0000-0000-000000000000'],
        action: 'accept',
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });
});

describe('déduction du socle récurrent', () => {
  it('propose une fréquence à partir de l’étalement des achats', async () => {
    const suggestions = await suggestRecurringItems(session.householdId, { storeId });
    const lentilles = suggestions.find((s) => s.label === 'Lentilles corail bio 500 g');

    expect(lentilles).toBeDefined();
    expect(lentilles!.occurrences).toBeGreaterThanOrEqual(3);
    expect(lentilles!.frequencyWeeks).toBeGreaterThanOrEqual(1);
  });

  it('ignore ce qui n’a pas été racheté assez souvent', async () => {
    const suggestions = await suggestRecurringItems(session.householdId, {
      storeId,
      minOccurrences: 10,
    });
    expect(suggestions).toHaveLength(0);
  });
});

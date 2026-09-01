import { describe, expect, it } from 'vitest';
import {
  matchesFilters,
  sortByLeastRecentlyCooked,
  type LibraryMeal,
} from '@/lib/domain/library';

function meal(over: Partial<LibraryMeal> = {}): LibraryMeal {
  return {
    id: crypto.randomUUID(),
    name: 'Curry de lentilles',
    kind: 'recipe',
    effort: 'standard',
    tags: ['végé', 'une seule casserole'],
    notes: null,
    lastLoggedAt: null,
    logCount: 0,
    ...over,
  };
}

describe('matchesFilters', () => {
  it('filtre par kind et effort', () => {
    const m = meal({ kind: 'combo', effort: 'express' });
    expect(matchesFilters(m, { kind: 'combo' })).toBe(true);
    expect(matchesFilters(m, { kind: 'recipe' })).toBe(false);
    expect(matchesFilters(m, { effort: 'express' })).toBe(true);
    expect(matchesFilters(m, { effort: 'projet' })).toBe(false);
  });

  it('exige tous les tags demandés, sans tenir compte des accents', () => {
    const m = meal();
    expect(matchesFilters(m, { tags: ['vege'] })).toBe(true);
    expect(matchesFilters(m, { tags: ['végé', 'une seule casserole'] })).toBe(true);
    expect(matchesFilters(m, { tags: ['végé', 'four'] })).toBe(false);
  });

  it('cherche sur le nom, les tags et les notes', () => {
    const m = meal({ notes: 'meilleur avec du lait de coco entier' });
    expect(matchesFilters(m, { query: 'lentilles' })).toBe(true);
    expect(matchesFilters(m, { query: 'CASSEROLE' })).toBe(true);
    expect(matchesFilters(m, { query: 'coco entier' })).toBe(true);
    expect(matchesFilters(m, { query: 'poisson' })).toBe(false);
  });
});

describe('sortByLeastRecentlyCooked', () => {
  it('met les jamais faits en tête, puis les plus anciens', () => {
    const jamais = meal({ name: 'Jamais fait', lastLoggedAt: null });
    const vieux = meal({ name: 'Vieux', lastLoggedAt: '2026-01-01' });
    const recent = meal({ name: 'Récent', lastLoggedAt: '2026-08-30' });

    const sorted = sortByLeastRecentlyCooked([recent, vieux, jamais], '2026-09-01');
    expect(sorted.map((m) => m.name)).toEqual(['Jamais fait', 'Vieux', 'Récent']);
  });

  it('départage à égalité par ordre alphabétique', () => {
    const b = meal({ name: 'Bœuf', lastLoggedAt: '2026-08-01' });
    const a = meal({ name: 'Aubergines', lastLoggedAt: '2026-08-01' });
    expect(sortByLeastRecentlyCooked([b, a], '2026-09-01').map((m) => m.name)).toEqual([
      'Aubergines',
      'Bœuf',
    ]);
  });

  it('ne modifie pas le tableau source', () => {
    const input = [meal({ name: 'A', lastLoggedAt: '2026-08-30' }), meal({ name: 'B' })];
    const copy = [...input];
    sortByLeastRecentlyCooked(input, '2026-09-01');
    expect(input).toEqual(copy);
  });
});

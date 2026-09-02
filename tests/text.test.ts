import { describe, expect, it } from 'vitest';
import { daysBetween, normalize, slugify, today } from '@/lib/domain/text';

describe('normalize', () => {
  it('retire accents, casse et ponctuation', () => {
    expect(normalize('Curry de Lentilles, coco !')).toBe('curry de lentilles coco');
    expect(normalize('Œufs au plat')).toBe('oeufs au plat');
    expect(normalize('  purée   de   pois  ')).toBe('puree de pois');
  });

  it('rapproche deux écritures du même plat', () => {
    expect(normalize('Curry lentilles-coco')).toBe(normalize('curry Lentilles Coco'));
  });

  it('décompose les ligatures, sinon « œufs » et « oeufs » sont deux plats', () => {
    expect(normalize('Œufs au plat')).toBe(normalize('oeufs au plat'));
    expect(normalize('Nœud de bœuf')).toBe('noeud de boeuf');
  });
});

describe('slugify', () => {
  it('produit une clé stable', () => {
    expect(slugify('Gratin de courgettes')).toBe('gratin-de-courgettes');
  });
});

describe('daysBetween', () => {
  it('compte les jours entiers', () => {
    expect(daysBetween('2026-01-01', '2026-01-08')).toBe(7);
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
  });

  it('renvoie 0 sur une date invalide', () => {
    expect(daysBetween('pas-une-date', '2026-01-01')).toBe(0);
  });
});

describe('today', () => {
  it('formate en YYYY-MM-DD', () => {
    expect(today(new Date(2026, 8, 1))).toBe('2026-09-01');
  });
});

import { describe, expect, it } from 'vitest';
import { canCombine, combine, formatQuantity } from '@/lib/domain/units';

describe('canCombine', () => {
  it('additionne les masses entre elles', () => {
    expect(canCombine({ value: 200, unit: 'g' }, { value: 1, unit: 'kg' })).toBe(true);
  });

  it('additionne les volumes entre eux', () => {
    expect(canCombine({ value: 20, unit: 'cl' }, { value: 1, unit: 'l' })).toBe(true);
  });

  it('refuse de mélanger masse et volume', () => {
    expect(canCombine({ value: 200, unit: 'g' }, { value: 20, unit: 'cl' })).toBe(false);
  });

  it('refuse de mélanger une unité connue et une unité libre', () => {
    expect(canCombine({ value: 1, unit: 'boîte' }, { value: 200, unit: 'g' })).toBe(false);
  });

  it('additionne deux unités libres identiques, accents mis à part', () => {
    expect(canCombine({ value: 1, unit: 'boîte' }, { value: 2, unit: 'BOITE' })).toBe(true);
    expect(canCombine({ value: 1, unit: 'boîte' }, { value: 2, unit: 'sachet' })).toBe(false);
  });

  it('additionne deux quantités sans unité', () => {
    expect(canCombine({ value: 2, unit: null }, { value: 3, unit: null })).toBe(true);
  });
});

describe('combine', () => {
  it('rend le total dans l’unité la plus lisible', () => {
    expect(combine({ value: 800, unit: 'g' }, { value: 700, unit: 'g' })).toEqual({
      value: 1.5,
      unit: 'kg',
    });
    expect(combine({ value: 200, unit: 'g' }, { value: 300, unit: 'g' })).toEqual({
      value: 500,
      unit: 'g',
    });
  });

  it('convertit avant de sommer', () => {
    expect(combine({ value: 1, unit: 'kg' }, { value: 250, unit: 'g' })).toEqual({
      value: 1.25,
      unit: 'kg',
    });
    expect(combine({ value: 50, unit: 'cl' }, { value: 1, unit: 'l' })).toEqual({
      value: 1.5,
      unit: 'l',
    });
  });

  it('garde l’unité partagée tant que le total y reste lisible', () => {
    expect(combine({ value: 40, unit: 'cl' }, { value: 40, unit: 'cl' })).toEqual({
      value: 80,
      unit: 'cl',
    });
    expect(combine({ value: 1, unit: 'kg' }, { value: 2, unit: 'kg' })).toEqual({
      value: 3,
      unit: 'kg',
    });
  });

  it('somme les unités libres sans les convertir', () => {
    expect(combine({ value: 1, unit: 'boîte' }, { value: 2, unit: 'boîte' })).toEqual({
      value: 3,
      unit: 'boîte',
    });
  });
});

describe('formatQuantity', () => {
  it('écrit les décimales à la française et omet l’unité absente', () => {
    expect(formatQuantity({ value: 1.5, unit: 'kg' })).toBe('1,5 kg');
    expect(formatQuantity({ value: 500, unit: 'g' })).toBe('500 g');
    expect(formatQuantity({ value: 3, unit: null })).toBe('3');
  });
});

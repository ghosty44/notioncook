import { describe, expect, it } from 'vitest';
import { canonicalInviteCode, formatInviteCode, generateInviteCode } from '@/lib/auth/codes';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

describe('generateInviteCode', () => {
  it('produit dix caractères de l’alphabet non ambigu par défaut', () => {
    for (let i = 0; i < 50; i += 1) {
      const code = generateInviteCode();
      expect(code).toHaveLength(10);
      expect([...code].every((char) => ALPHABET.includes(char))).toBe(true);
    }
  });

  it('atteint une cinquantaine de bits, hors de portée d’une attaque en ligne', () => {
    const bits = 10 * Math.log2(ALPHABET.length);
    expect(bits).toBeGreaterThan(48);
  });

  it('ne produit pas deux fois le même code', () => {
    const codes = new Set(Array.from({ length: 500 }, () => generateInviteCode()));
    expect(codes.size).toBe(500);
  });

  it('tire uniformément, sans favoriser le début de l’alphabet', () => {
    // Un modulo nu ferait sortir les huit premiers symboles 9 fois sur 256 au
    // lieu de 8 : le tirage par rejet doit effacer cet écart.
    const counts = new Map<string, number>();
    for (const char of generateInviteCode(60_000)) {
      counts.set(char, (counts.get(char) ?? 0) + 1);
    }

    const expected = 60_000 / ALPHABET.length;
    const biased = [...ALPHABET.slice(0, 8)].reduce((sum, c) => sum + (counts.get(c) ?? 0), 0);
    const rest = [...ALPHABET.slice(8)].reduce((sum, c) => sum + (counts.get(c) ?? 0), 0);

    expect(biased / 8).toBeGreaterThan(expected * 0.9);
    expect(biased / 8).toBeLessThan(expected * 1.1);
    expect(rest / (ALPHABET.length - 8)).toBeGreaterThan(expected * 0.9);
  });
});

describe('canonicalInviteCode', () => {
  it('tolère la casse, les espaces et les tirets de la dictée', () => {
    expect(canonicalInviteCode('abc de-2345')).toBe('ABCDE2345');
  });
});

describe('formatInviteCode', () => {
  it('groupe par cinq pour la lecture à voix haute', () => {
    expect(formatInviteCode('ABCDE23456')).toBe('ABCDE 23456');
  });
});

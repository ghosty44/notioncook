import { describe, expect, it } from 'vitest';
import { confidenceFor, dedupeKeyOf, medianWeeksBetween } from '@/lib/domain/import';

describe('dedupeKeyOf', () => {
  it('préfère l’identifiant du drive quand il existe', () => {
    expect(dedupeKeyOf({ rawLabel: 'Peu importe', externalId: '12345' })).toBe('id:12345');
  });

  it('retombe sur le libellé normalisé, accents et ponctuation ôtés', () => {
    expect(dedupeKeyOf({ rawLabel: 'Lentilles CORAIL bio, 500 g' })).toBe(
      dedupeKeyOf({ rawLabel: 'lentilles corail bio 500 g' }),
    );
  });

  it('ne confond pas deux produits différents', () => {
    expect(dedupeKeyOf({ rawLabel: 'Lait demi-écrémé 1 L' })).not.toBe(
      dedupeKeyOf({ rawLabel: 'Lait entier 1 L' }),
    );
  });
});

describe('confidenceFor', () => {
  it('donne high à un identifiant produit', () => {
    expect(confidenceFor({ externalId: '999', rawLabel: 'Truc inconnu' })).toBe('high');
  });

  it('donne high quand le nom canonique figure dans le libellé', () => {
    expect(
      confidenceFor({
        rawLabel: 'Lentilles corail bio 500 g Marque Repère',
        matchedIngredientName: 'Lentilles corail',
      }),
    ).toBe('high');
  });

  it('donne medium quand le rapprochement est plausible sans être prouvé', () => {
    expect(
      confidenceFor({ rawLabel: 'LCR BIO 500G', matchedIngredientName: 'Lentilles corail' }),
    ).toBe('medium');
    expect(confidenceFor({ rawLabel: 'Truc', guessedIngredientName: 'Lentilles corail' })).toBe(
      'medium',
    );
  });

  it('donne low quand rien ne permet de trancher', () => {
    expect(confidenceFor({ rawLabel: 'REF 4471 X2' })).toBe('low');
  });
});

describe('medianWeeksBetween', () => {
  it('déduit une fréquence hebdomadaire', () => {
    expect(medianWeeksBetween(['2026-08-01', '2026-08-08', '2026-08-15', '2026-08-22'])).toBe(1);
  });

  it('déduit une fréquence bimensuelle', () => {
    expect(medianWeeksBetween(['2026-07-01', '2026-07-15', '2026-07-29'])).toBe(2);
  });

  it('résiste à un achat oublié grâce à la médiane', () => {
    // Un trou de deux mois au milieu ne doit pas faire passer un hebdomadaire
    // pour un mensuel.
    expect(
      medianWeeksBetween([
        '2026-06-01',
        '2026-06-08',
        '2026-06-15',
        '2026-08-15',
        '2026-08-22',
        '2026-08-29',
      ]),
    ).toBe(1);
  });

  it('ne conclut rien avec un seul achat', () => {
    expect(medianWeeksBetween(['2026-08-01'])).toBeNull();
    expect(medianWeeksBetween([])).toBeNull();
  });

  it('ignore les doublons de date et les dates invalides', () => {
    expect(medianWeeksBetween(['2026-08-01', '2026-08-01', 'pas-une-date', '2026-08-08'])).toBe(1);
  });
});

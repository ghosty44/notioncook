import { describe, expect, it } from 'vitest';
import {
  daysSinceLastLog,
  effortFits,
  rankMeals,
  scoreMeal,
  type SuggestionCandidate,
} from '@/lib/domain/suggestions';

const TODAY = '2026-09-01';

function meal(over: Partial<SuggestionCandidate> = {}): SuggestionCandidate {
  return {
    id: 'id',
    name: 'Curry de lentilles',
    kind: 'recipe',
    effort: 'standard',
    tags: [],
    season: [],
    rating: null,
    babyNote: null,
    lastLoggedAt: null,
    lastLogLikedByBaby: null,
    ingredientNames: [],
    ...over,
  };
}

describe('daysSinceLastLog', () => {
  it('plafonne à 90 jours', () => {
    expect(daysSinceLastLog('2020-01-01', TODAY)).toBe(90);
  });

  it('traite un repas jamais fait comme le plafond', () => {
    expect(daysSinceLastLog(null, TODAY)).toBe(90);
  });

  it('ne descend jamais sous zéro', () => {
    expect(daysSinceLastLog('2026-09-05', TODAY)).toBe(0);
  });
});

describe('effortFits', () => {
  it("ne retient que l'express quand il reste 15 minutes", () => {
    expect(effortFits('express', 15)).toBe(true);
    expect(effortFits('standard', 15)).toBe(false);
    expect(effortFits('projet', 15)).toBe(false);
  });

  it('laisse tout passer avec une heure devant soi', () => {
    expect(effortFits('express', 60)).toBe(true);
    expect(effortFits('standard', 60)).toBe(true);
    expect(effortFits('projet', 60)).toBe(true);
  });
});

describe('scoreMeal', () => {
  it('applique le barème du spec', () => {
    const scored = scoreMeal(
      meal({
        effort: 'express',
        season: ['septembre'],
        rating: 5,
        lastLoggedAt: '2026-06-03',
        lastLogLikedByBaby: true,
      }),
      { timeAvailable: 15 },
      TODAY,
    );

    // 90 jours plafonnés + 20 effort + 15 saison + 10 note + 10 bébé
    expect(scored.score).toBe(145);
  });

  it('pénalise un repas fait il y a moins de sept jours', () => {
    const scored = scoreMeal(meal({ lastLoggedAt: '2026-08-30' }), {}, TODAY);
    expect(scored.score).toBe(2 - 30);
    expect(scored.reasons).toContain('-30 fait il y a moins de 7 jours');
  });

  it("ne pénalise pas un repas jamais fait au titre des sept jours", () => {
    const scored = scoreMeal(meal({ lastLoggedAt: null }), {}, TODAY);
    expect(scored.score).toBe(90);
    expect(scored.reasons.join(' ')).not.toContain('-30');
  });

  it('écarte un repas contenant un ingrédient exclu', () => {
    const scored = scoreMeal(
      meal({ ingredientNames: ['Lait de coco', 'Lentilles corail'] }),
      { excludeIngredients: ['coco'] },
      TODAY,
    );
    expect(scored.score).toBe(90 - 50);
    expect(scored.reasons.some((r) => r.startsWith('-50'))).toBe(true);
  });

  it("ignore les accents et la casse dans l'exclusion", () => {
    const scored = scoreMeal(
      meal({ ingredientNames: ['Crème fraîche'] }),
      { excludeIngredients: ['CREME FRAICHE'] },
      TODAY,
    );
    expect(scored.score).toBe(40);
  });

  it('reconnaît la saison par le mois ou par le nom de saison', () => {
    expect(scoreMeal(meal({ season: ['automne'] }), {}, TODAY).score).toBe(105);
    expect(scoreMeal(meal({ season: ['Septembre'] }), {}, TODAY).score).toBe(105);
    expect(scoreMeal(meal({ season: ['février'] }), {}, TODAY).score).toBe(90);
  });

  it('explique chaque point marqué', () => {
    const scored = scoreMeal(meal({ rating: 4 }), {}, TODAY);
    expect(scored.reasons).toEqual(['+90 jamais fait', '+10 bien noté']);
  });
});

describe('rankMeals', () => {
  it('trie par score décroissant et coupe au nombre demandé', () => {
    const meals = [
      meal({ id: 'a', name: 'Fait hier', lastLoggedAt: '2026-08-31' }),
      meal({ id: 'b', name: 'Jamais fait' }),
      meal({ id: 'c', name: 'Vieux', lastLoggedAt: '2026-08-01' }),
    ];

    const ranked = rankMeals(meals, { count: 2 }, TODAY);
    expect(ranked.map((m) => m.name)).toEqual(['Jamais fait', 'Vieux']);
  });

  it('filtre sur les tags avant de scorer', () => {
    const meals = [
      meal({ id: 'a', name: 'Végé', tags: ['végé'] }),
      meal({ id: 'b', name: 'Viande', tags: ['boucherie'] }),
    ];

    expect(rankMeals(meals, { tags: ['vege'] }, TODAY).map((m) => m.name)).toEqual(['Végé']);
  });

  it('remonte un express devant un projet quand le temps est court', () => {
    const meals = [
      meal({ id: 'a', name: 'Blanquette', effort: 'projet', lastLoggedAt: '2026-06-01' }),
      meal({ id: 'b', name: 'Omelette', effort: 'express', lastLoggedAt: '2026-06-01' }),
    ];

    expect(rankMeals(meals, { timeAvailable: 15 }, TODAY).map((m) => m.name)).toEqual([
      'Omelette',
      'Blanquette',
    ]);
  });
});

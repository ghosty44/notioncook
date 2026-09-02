import { normalize } from './text';

export type Dimension = 'masse' | 'volume' | 'unite';

type UnitDef = { dimension: Dimension; toBase: number; canonical: string };

/**
 * Table des unités reconnues. Tout ce qui n'y figure pas (« boîte », « botte »,
 * « gousse ») reste une unité de comptage à part entière : deux boîtes
 * s'additionnent entre elles, jamais avec des grammes.
 */
const UNITS: Record<string, UnitDef> = {
  g: { dimension: 'masse', toBase: 1, canonical: 'g' },
  gr: { dimension: 'masse', toBase: 1, canonical: 'g' },
  gramme: { dimension: 'masse', toBase: 1, canonical: 'g' },
  grammes: { dimension: 'masse', toBase: 1, canonical: 'g' },
  kg: { dimension: 'masse', toBase: 1000, canonical: 'kg' },
  kilo: { dimension: 'masse', toBase: 1000, canonical: 'kg' },
  kilos: { dimension: 'masse', toBase: 1000, canonical: 'kg' },
  ml: { dimension: 'volume', toBase: 1, canonical: 'ml' },
  cl: { dimension: 'volume', toBase: 10, canonical: 'cl' },
  dl: { dimension: 'volume', toBase: 100, canonical: 'dl' },
  l: { dimension: 'volume', toBase: 1000, canonical: 'l' },
  litre: { dimension: 'volume', toBase: 1000, canonical: 'l' },
  litres: { dimension: 'volume', toBase: 1000, canonical: 'l' },
};

/** Unités de comptage sans dimension physique, toutes ramenées à « pièce ». */
const COUNT = new Set(['piece', 'pieces', 'unite', 'unites', 'u', 'pc', 'pcs']);

export type Quantity = { value: number; unit: string | null };

export function unitDefinition(unit: string | null): UnitDef | null {
  if (!unit) return null;
  const key = normalize(unit).replace(/ /g, '');
  if (COUNT.has(key)) return { dimension: 'unite', toBase: 1, canonical: 'pièce' };
  return UNITS[key] ?? null;
}

/**
 * Deux quantités se combinent si elles partagent une dimension connue, ou si
 * elles portent la même unité libre écrite de la même façon aux accents près.
 */
export function canCombine(a: Quantity, b: Quantity): boolean {
  const da = unitDefinition(a.unit);
  const db = unitDefinition(b.unit);
  if (da && db) return da.dimension === db.dimension;
  if (da || db) return false;
  return normalize(a.unit ?? '') === normalize(b.unit ?? '');
}

/** Somme deux quantités combinables, dans l'unité la plus lisible du résultat. */
export function combine(a: Quantity, b: Quantity): Quantity {
  const da = unitDefinition(a.unit);
  const db = unitDefinition(b.unit);

  if (!da || !db) return { value: a.value + b.value, unit: a.unit ?? b.unit };

  const total = a.value * da.toBase + b.value * db.toBase;

  // Deux quantités écrites dans la même unité la gardent : 40 cl + 40 cl fait
  // 80 cl, pas 800 ml, parce que c'est en cl que le drive vend la brique.
  if (da.canonical === db.canonical) {
    const inUnit = total / da.toBase;
    if (inUnit < 1000) return { value: round(inUnit), unit: da.canonical };
  }

  return readable(total, da.dimension);
}

/** 1500 g s'affiche « 1,5 kg », 1200 ml « 1,2 l » : c'est ce qu'on lit sur l'étiquette. */
function readable(baseValue: number, dimension: Dimension): Quantity {
  if (dimension === 'masse') {
    return baseValue >= 1000
      ? { value: round(baseValue / 1000), unit: 'kg' }
      : { value: round(baseValue), unit: 'g' };
  }
  if (dimension === 'volume') {
    return baseValue >= 1000
      ? { value: round(baseValue / 1000), unit: 'l' }
      : { value: round(baseValue), unit: 'ml' };
  }
  return { value: round(baseValue), unit: 'pièce' };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatQuantity({ value, unit }: Quantity): string {
  const number = Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '');
  return unit ? `${number.replace('.', ',')} ${unit}` : number.replace('.', ',');
}

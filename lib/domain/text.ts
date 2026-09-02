/**
 * Normalisation utilisée partout comme clé de rapprochement : minuscules,
 * accents retirés, ponctuation et espaces multiples supprimés (section 10.2).
 */
export function normalize(input: string): string {
  return input
    .replace(/\u0152/g, 'OE')
    .replace(/\u0153/g, 'oe')
    .replace(/\u00c6/g, 'AE')
    .replace(/\u00e6/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Même normalisation, en forme de slug stockable et indexable. */
export function slugify(input: string): string {
  return normalize(input).replace(/ /g, '-');
}

/** Nombre de jours entiers entre deux dates ISO (YYYY-MM-DD). */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

/** Date du jour au format YYYY-MM-DD, en heure locale. */
export function today(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

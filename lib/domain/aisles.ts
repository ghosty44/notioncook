/**
 * L'ordre de cette liste est l'ordre de parcours du drive : la liste de courses
 * est triée dessus, et c'est ce qui évite les allers-retours entre rayons. Il
 * reprend exactement l'ordre de l'enum `aisle` du schéma.
 */
export const AISLE_ORDER = [
  'fruits_legumes',
  'boucherie',
  'poissonnerie',
  'cremerie',
  'charcuterie_traiteur',
  'epicerie_salee',
  'epicerie_sucree',
  'boulangerie',
  'surgeles',
  'boissons',
  'bebe',
  'entretien',
  'hygiene',
  'autre',
] as const;

export type Aisle = (typeof AISLE_ORDER)[number];

const LABELS: Record<Aisle, string> = {
  fruits_legumes: 'Fruits et légumes',
  boucherie: 'Boucherie',
  poissonnerie: 'Poissonnerie',
  cremerie: 'Crèmerie',
  charcuterie_traiteur: 'Charcuterie et traiteur',
  epicerie_salee: 'Épicerie salée',
  epicerie_sucree: 'Épicerie sucrée',
  boulangerie: 'Boulangerie',
  surgeles: 'Surgelés',
  boissons: 'Boissons',
  bebe: 'Bébé',
  entretien: 'Entretien',
  hygiene: 'Hygiène',
  autre: 'Autre',
};

export function aisleLabel(aisle: Aisle): string {
  return LABELS[aisle];
}

export function aisleRank(aisle: Aisle): number {
  const index = AISLE_ORDER.indexOf(aisle);
  return index === -1 ? AISLE_ORDER.length : index;
}

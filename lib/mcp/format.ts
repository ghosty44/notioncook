import { aisleLabel, type Aisle } from '@/lib/domain/aisles';
import type { ImportReport } from '@/lib/domain/import';
import type { LibraryMeal } from '@/lib/domain/library';
import type { PlanCell } from '@/lib/domain/plan';
import type { ShoppingListView } from '@/lib/domain/shopping';
import type { StoreContext } from '@/lib/domain/store-rules';
import type { MealDetail } from '@/lib/domain/meals';
import type { ScoredMeal } from '@/lib/domain/suggestions';

const EFFORT = { express: 'express', standard: 'standard', projet: 'projet' } as const;
const KIND = { recipe: 'recette', combo: 'combo', leftover_base: 'base à décliner' } as const;

/**
 * Le spec demande du texte structuré lisible plutôt que du JSON brut : Claude
 * le restitue mieux à l'oral. Les identifiants sont systématiquement présents
 * pour permettre les appels chaînés.
 */
export function formatMealLine(meal: LibraryMeal): string {
  const bits = [
    `${meal.name} [${meal.id}]`,
    `${KIND[meal.kind]}, ${EFFORT[meal.effort]}`,
    meal.lastLoggedAt ? `dernière fois le ${meal.lastLoggedAt}` : 'jamais fait',
    `${meal.logCount} fois au total`,
  ];
  if (meal.tags.length) bits.push(`tags : ${meal.tags.join(', ')}`);
  return `- ${bits.join(' · ')}`;
}

export function formatMealDetail(meal: MealDetail): string {
  const lines = [
    `${meal.name} [${meal.id}]`,
    `Type : ${KIND[meal.kind]} · Effort : ${EFFORT[meal.effort]}`,
  ];

  if (meal.tags.length) lines.push(`Tags : ${meal.tags.join(', ')}`);
  if (meal.season.length) lines.push(`Saison : ${meal.season.join(', ')}`);
  if (meal.rating) lines.push(`Note : ${meal.rating}/5`);
  if (meal.babyNote) lines.push(`Pour la petite : ${meal.babyNote}`);

  if (meal.ingredients.length) {
    lines.push('', 'Ingrédients :');
    for (const line of meal.ingredients) {
      const quantity = [line.quantity, line.unit].filter(Boolean).join(' ');
      const name = line.ingredientName ?? line.freeText ?? 'ingrédient non nommé';
      lines.push(
        `- ${name}${quantity ? ` : ${quantity}` : ''}${line.isPantryStaple ? ' (placard)' : ''}`,
      );
    }
  }

  if (meal.steps) lines.push('', 'Étapes :', meal.steps);
  if (meal.notes) lines.push('', `Notes : ${meal.notes}`);

  if (meal.logs.length) {
    lines.push('', `Historique (${meal.logs.length} entrées) :`);
    for (const log of meal.logs.slice(0, 10)) {
      const baby =
        log.likedByBaby === true
          ? ', la petite a aimé'
          : log.likedByBaby === false
            ? " , la petite n'a pas aimé"
            : '';
      lines.push(`- ${log.date} ${log.slot}${baby}${log.comment ? ` : ${log.comment}` : ''}`);
    }
  } else {
    lines.push('', 'Jamais enregistré au journal.');
  }

  return lines.join('\n');
}

export function formatSuggestion(meal: ScoredMeal, rank: number): string {
  const lines = [
    `${rank}. ${meal.name} [${meal.id}] · ${EFFORT[meal.effort]} · score ${meal.score}`,
    `   ${meal.reasons.join(', ')}`,
  ];
  if (meal.babyNote) lines.push(`   Pour la petite : ${meal.babyNote}`);
  return lines.join('\n');
}

export function text(content: string) {
  return { content: [{ type: 'text' as const, text: content }] };
}

/** Grille du planning rendue jour par jour, cases vides comprises. */
export function formatWeekPlan(cells: PlanCell[]): string {
  const days = [...new Set(cells.map((cell) => cell.date))];
  const lines: string[] = [];

  for (const date of days) {
    const midi = cells.find((c) => c.date === date && c.slot === 'midi');
    const soir = cells.find((c) => c.date === date && c.slot === 'soir');
    lines.push(`${date} · midi : ${cellText(midi)} · soir : ${cellText(soir)}`);
  }

  return lines.join('\n');
}

function cellText(cell: PlanCell | undefined): string {
  if (!cell) return 'vide';
  if (cell.mealName) return `${cell.mealName} [${cell.mealId}]`;
  if (cell.freeText) return cell.freeText;
  return 'vide';
}

/**
 * Liste rendue par rayon, dans l'ordre de parcours du magasin, avec pour chaque
 * ligne mappée le libellé exact, la marque, le format et l'URL : de quoi
 * remplir le panier sans avoir une seule décision à prendre.
 */
export function formatShoppingList(list: ShoppingListView): string {
  const lines = [
    `Liste ${list.id} · ${list.store?.name ?? 'aucune enseigne'} · ${list.status === 'ordered' ? 'commandée' : 'en cours'}`,
  ];

  if (list.unmapped.length > 0) {
    lines.push('', `À mapper (${list.unmapped.length}) :`);
    for (const item of list.unmapped) {
      lines.push(`- ${item.label}${item.unit ? ` : ${item.unit}` : ''} [${item.id}]`);
    }
  }

  if (list.rejected.length > 0) {
    lines.push('', `Produits écartés, à ne jamais reproposer (${list.rejected.length}) :`);
    for (const item of list.rejected) {
      lines.push(
        `- ${item.label}${item.ingredientName ? ` pour ${item.ingredientName}` : ''}` +
          `${item.reason ? ` : ${item.reason}` : ''}`,
      );
    }
  }

  let currentAisle: string | null = null;
  for (const item of list.items) {
    if (item.aisle !== currentAisle) {
      currentAisle = item.aisle;
      lines.push('', `${aisleLabel(item.aisle as Aisle)} :`);
    }

    const details = [item.brand, item.format].filter(Boolean).join(' · ');
    lines.push(
      `- ${item.isChecked ? '[x]' : '[ ]'} ${item.label}` +
        (item.unit ? ` : ${item.unit}` : '') +
        (details ? ` (${details})` : '') +
        (item.productUrl ? ` ${item.productUrl}` : '') +
        ` [${item.id}]`,
    );
  }

  return lines.join('\n');
}

export function formatRecurringItems(
  items: {
    id: string;
    label: string;
    brand: string | null;
    format: string | null;
    frequencyWeeks: number;
    isDue: boolean;
    ingredientName: string;
  }[],
): string {
  if (items.length === 0) return "Aucun socle récurrent enregistré pour l'instant.";

  return (
    `${items.length} récurrents :\n` +
    items
      .map(
        (item) =>
          `- ${item.label} [${item.id}] · ${item.ingredientName} · toutes les ${item.frequencyWeeks} semaine(s)` +
          `${item.isDue ? ' · à racheter' : ''}` +
          `${[item.brand, item.format].filter(Boolean).length ? ` (${[item.brand, item.format].filter(Boolean).join(' · ')})` : ''}`,
      )
      .join('\n')
  );
}

/**
 * Contexte lu par Cowork au début d'une session : règles ordonnées, marques
 * distributeur, préférences, évitements, et les limites à respecter. Les
 * évitements bloquants sont mis en tête parce qu'ils ne se négocient pas.
 */
export function formatStoreContext(context: StoreContext): string {
  const { store, rules, brandPreferences, avoidances, constraints, limits } = context;
  const lines = [`Enseigne : ${store.name} [${store.id}]`];

  if (store.baseUrl) lines.push(`URL : ${store.baseUrl}`);
  if (store.address) lines.push(`Adresse : ${store.address}`);
  if (store.pickupHours) lines.push(`Retrait : ${store.pickupHours}`);
  if (store.houseBrands.length) {
    lines.push(`Marques distributeur : ${store.houseBrands.join(', ')}`);
  }

  const bloquants = avoidances.filter((a) => a.isHard);
  if (bloquants.length) {
    lines.push('', 'À NE JAMAIS ACHETER, sans exception :');
    for (const item of bloquants) {
      lines.push(`- ${item.value} (${item.scope}, ${item.reason})`);
    }
  }

  lines.push('', 'Règles de choix produit, par ordre de priorité :');
  if (rules.length === 0) {
    lines.push('- aucune règle enregistrée, applique le bon sens et signale les cas ambigus');
  } else {
    for (const rule of rules) lines.push(`${rule.priority}. ${rule.rule}`);
  }

  if (brandPreferences.length) {
    lines.push('', 'Marques préférées :');
    for (const preference of brandPreferences) {
      const portee = preference.ingredientName
        ? `pour ${preference.ingredientName}`
        : preference.aisle
          ? `pour tout le rayon ${aisleLabel(preference.aisle as Aisle)}`
          : 'partout';
      lines.push(`- ${preference.brand} ${portee}`);
    }
  }

  const souples = avoidances.filter((a) => !a.isHard);
  if (souples.length) {
    lines.push('', 'À éviter si possible :');
    for (const item of souples) lines.push(`- ${item.value} (${item.reason})`);
  }

  if (constraints) lines.push('', 'Contraintes du foyer :', constraints);

  lines.push('', 'Limites du run :');
  for (const limit of limits) lines.push(`- ${limit}`);

  return lines.join('\n');
}

/**
 * Rapport d'import. En dry run, il dit exactement ce qui serait écrit : c'est
 * sur cette base que l'utilisateur donne, ou non, son accord.
 */
export function formatImportReport(report: ImportReport): string {
  const lines = [
    report.dryRun
      ? `Import à blanc, rien n'a été écrit. Lot ${report.batchId}.`
      : `Import effectué. Lot ${report.batchId}.`,
    '',
    `${report.received} lignes reçues`,
    `${report.created} nouveaux candidats, ${report.merged} fusionnés avec un candidat existant`,
    `${report.alreadyMapped} correspondent à un ingrédient déjà mappé chez cette enseigne`,
    `${report.autoPromoted} promus automatiquement (sûrs et vus au moins trois fois)`,
    `Confiance : ${report.byConfidence.high} haute, ${report.byConfidence.medium} moyenne, ${report.byConfidence.low} faible`,
  ];

  if (report.conflicts.length > 0) {
    lines.push('', `Conflits à trancher (${report.conflicts.length}) :`);
    for (const conflict of report.conflicts.slice(0, 20)) lines.push(`- ${conflict}`);
  }

  if (report.dryRun) {
    lines.push(
      '',
      "Relance avec dryRun à faux pour écrire, une fois ce rapport validé par l'utilisateur.",
    );
  }

  return lines.join('\n');
}

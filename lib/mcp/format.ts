import type { LibraryMeal } from '@/lib/domain/library';
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

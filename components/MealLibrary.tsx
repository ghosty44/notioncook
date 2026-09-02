'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { matchesFilters, type LibraryMeal } from '@/lib/domain/library';
import { daysBetween, today } from '@/lib/domain/text';
import { Badge, effortLabel, inputClass, kindLabel } from './ui';

const KINDS = ['recipe', 'combo', 'leftover_base'] as const;
const EFFORTS = ['express', 'standard', 'projet'] as const;

function lastCookedLabel(lastLoggedAt: string | null): string {
  if (!lastLoggedAt) return 'jamais fait';
  const days = daysBetween(lastLoggedAt, today());
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  if (days < 14) return `il y a ${days} jours`;
  if (days < 60) return `il y a ${Math.round(days / 7)} semaines`;
  return `il y a ${Math.round(days / 30)} mois`;
}

export function MealLibrary({ meals }: { meals: LibraryMeal[] }) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<(typeof KINDS)[number] | null>(null);
  const [effort, setEffort] = useState<(typeof EFFORTS)[number] | null>(null);
  const [tag, setTag] = useState<string | null>(null);

  const allTags = useMemo(
    () => [...new Set(meals.flatMap((meal) => meal.tags))].sort((a, b) => a.localeCompare(b, 'fr')),
    [meals],
  );

  // meals arrive déjà trié « pas fait depuis longtemps » par le serveur.
  const visible = useMemo(
    () =>
      meals.filter((meal) =>
        matchesFilters(meal, {
          query,
          kind: kind ?? undefined,
          effort: effort ?? undefined,
          tags: tag ? [tag] : undefined,
        }),
      ),
    [meals, query, kind, effort, tag],
  );

  function chip(active: boolean) {
    return `min-h-9 rounded-full border px-3 text-sm font-medium ${
      active ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-muted'
    }`;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Repas</h1>
        <span className="text-sm text-muted">
          {visible.length} sur {meals.length}
        </span>
      </div>

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className={inputClass}
        placeholder="Chercher un nom, un tag, une note"
        aria-label="Rechercher un repas"
      />

      <div className="flex flex-wrap gap-2">
        {KINDS.map((value) => (
          <button
            key={value}
            type="button"
            className={chip(kind === value)}
            onClick={() => setKind(kind === value ? null : value)}
          >
            {kindLabel(value)}
          </button>
        ))}
        <span className="w-px bg-line" />
        {EFFORTS.map((value) => (
          <button
            key={value}
            type="button"
            className={chip(effort === value)}
            onClick={() => setEffort(effort === value ? null : value)}
          >
            {effortLabel(value)}
          </button>
        ))}
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allTags.map((value) => (
            <button
              key={value}
              type="button"
              className={chip(tag === value)}
              onClick={() => setTag(tag === value ? null : value)}
            >
              {value}
            </button>
          ))}
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {visible.map((meal) => (
          <li key={meal.id}>
            <Link
              href={`/meals/${meal.id}`}
              className="flex flex-col gap-1 rounded-xl border border-line bg-surface px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{meal.name}</span>
                <span className="shrink-0 text-sm text-muted">
                  {lastCookedLabel(meal.lastLoggedAt)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone="accent">{effortLabel(meal.effort)}</Badge>
                <Badge>{kindLabel(meal.kind)}</Badge>
                {meal.logCount > 0 && <Badge>{meal.logCount}× au total</Badge>}
                {meal.tags.map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {visible.length === 0 && (
        <p className="text-sm text-muted">
          Aucun repas ne correspond. Les repas se créent depuis l&apos;écran de capture, en tapant
          simplement ce que vous avez mangé.
        </p>
      )}
    </div>
  );
}

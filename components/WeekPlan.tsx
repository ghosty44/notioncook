'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { LibraryMeal } from '@/lib/domain/library';
import type { PlanCell } from '@/lib/domain/plan';
import { matchesFilters } from '@/lib/domain/library';
import { buttonClass, ghostButtonClass, inputClass } from './ui';

const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

function shiftWeek(weekStart: string, weeks: number): string {
  const date = new Date(`${weekStart}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + weeks * 7);
  return date.toISOString().slice(0, 10);
}

export function WeekPlan({
  cells,
  meals,
  weekStart,
}: {
  cells: PlanCell[];
  meals: LibraryMeal[];
  weekStart: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<{ date: string; slot: 'midi' | 'soir' } | null>(null);
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState(false);

  const days = useMemo(() => [...new Set(cells.map((cell) => cell.date))], [cells]);

  const matches = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return meals.slice(0, 8);
    return meals.filter((meal) => matchesFilters(meal, { query: trimmed })).slice(0, 8);
  }, [meals, query]);

  async function save(body: Record<string, unknown>) {
    if (!editing) return;
    setPending(true);
    await fetch('/api/plan', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: editing.date, slot: editing.slot, ...body }),
    });
    setPending(false);
    setEditing(null);
    setQuery('');
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Semaine</h1>
        <div className="flex gap-2 text-sm">
          <Link
            href={`/plan?semaine=${shiftWeek(weekStart, -1)}`}
            className="underline underline-offset-4"
          >
            précédente
          </Link>
          <Link
            href={`/plan?semaine=${shiftWeek(weekStart, 1)}`}
            className="underline underline-offset-4"
          >
            suivante
          </Link>
        </div>
      </div>

      <p className="text-sm text-muted">
        Planifier n&apos;est pas manger : ces cases ne nourrissent pas les suggestions, seul le
        journal le fait.
      </p>

      <div className="flex flex-col gap-3">
        {days.map((date, index) => (
          <section key={date} className="rounded-2xl border border-line bg-surface p-3">
            <h2 className="mb-2 text-sm font-semibold">
              {DAY_NAMES[index]}{' '}
              <span className="font-normal text-muted">
                {date.slice(8)}/{date.slice(5, 7)}
              </span>
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {(['midi', 'soir'] as const).map((slot) => {
                const cell = cells.find((c) => c.date === date && c.slot === slot);
                const filled = cell?.mealName ?? cell?.freeText;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setEditing({ date, slot })}
                    className={`min-h-16 rounded-xl border px-3 py-2 text-left ${
                      filled ? 'border-accent/40 bg-accent-soft' : 'border-dashed border-line'
                    }`}
                  >
                    <span className="block text-xs uppercase tracking-wide text-muted">{slot}</span>
                    <span className="text-sm font-medium">{filled ?? '—'}</span>
                    {cell?.babyNote && (
                      <span className="mt-1 block text-xs text-muted">bébé : {cell.babyNote}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface p-5 pb-8 shadow-2xl">
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                {editing.date} · {editing.slot}
              </h2>
              <button
                type="button"
                className="text-sm text-muted underline"
                onClick={() => setEditing(null)}
              >
                Fermer
              </button>
            </div>

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={inputClass}
              placeholder="Chercher un repas, ou saisir « resto »"
              autoFocus
            />

            <div className="flex max-h-52 flex-col gap-1 overflow-y-auto">
              {matches.map((meal) => (
                <button
                  key={meal.id}
                  type="button"
                  disabled={pending}
                  onClick={() => save({ mealId: meal.id })}
                  className="rounded-xl border border-line px-3 py-2 text-left text-sm"
                >
                  {meal.name}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {query.trim() && (
                <button
                  type="button"
                  disabled={pending}
                  className={buttonClass}
                  onClick={() => save({ freeText: query.trim() })}
                >
                  Texte libre « {query.trim()} »
                </button>
              )}
              <button
                type="button"
                disabled={pending}
                className={ghostButtonClass}
                onClick={() => save({ clear: true })}
              >
                Vider la case
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

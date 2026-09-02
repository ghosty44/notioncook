'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { matchesFilters, type LibraryMeal } from '@/lib/domain/library';
import { buttonClass, Card, ghostButtonClass, inputClass } from './ui';

type RecentLog = {
  id: string;
  date: string;
  slot: 'midi' | 'soir';
  mealId: string;
  mealName: string;
};

type Logged = { logId: string; mealName: string; slot: 'midi' | 'soir'; created: boolean };

/** Avant 15 h on enregistre le déjeuner, après on enregistre le dîner. */
function defaultSlot(now: Date = new Date()): 'midi' | 'soir' {
  return now.getHours() < 15 ? 'midi' : 'soir';
}

export function QuickCapture({
  meals,
  recentLogs,
}: {
  meals: LibraryMeal[];
  recentLogs: RecentLog[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [slot, setSlot] = useState<'midi' | 'soir'>(defaultSlot());
  const [pending, setPending] = useState(false);
  const [logged, setLogged] = useState<Logged | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Le filtrage est local : la bibliothèque d'un foyer tient en mémoire et
  // aucun aller-retour réseau ne doit s'intercaler dans la saisie.
  const matches = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return [];
    return meals.filter((meal) => matchesFilters(meal, { query: trimmed })).slice(0, 6);
  }, [meals, query]);

  const exactMatch = matches.some((meal) => meal.name.toLowerCase() === query.trim().toLowerCase());

  const frequent = useMemo(
    () =>
      [...meals]
        .filter((meal) => meal.logCount > 0)
        .sort((a, b) => b.logCount - a.logCount)
        .slice(0, 8),
    [meals],
  );

  async function log(mealNameOrId: string) {
    setPending(true);
    setError(null);

    const response = await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mealNameOrId, slot }),
    });
    const payload = await response.json().catch(() => ({}));
    setPending(false);

    if (!response.ok) {
      setError(payload.error ?? 'Enregistrement impossible');
      return;
    }

    setQuery('');
    setLogged({
      logId: payload.log.id,
      mealName: payload.meal.name,
      slot,
      created: payload.mealCreated,
    });
    router.refresh();
  }

  async function setLikedByBaby(logId: string, liked: boolean) {
    await fetch(`/api/logs/${logId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ likedByBaby: liked }),
    });
    setLogged(null);
    router.refresh();
  }

  async function cancel(logId: string) {
    await fetch(`/api/logs/${logId}`, { method: 'DELETE' });
    setLogged(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Qu&apos;est-ce qu&apos;on a mangé ?</h1>
        <p className="mt-1 text-sm text-muted">
          Un nom suffit. Le reste se complète plus tard, ou jamais.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(['midi', 'soir'] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setSlot(value)}
            className={slot === value ? buttonClass : ghostButtonClass}
          >
            {value === 'midi' ? 'Midi' : 'Soir'}
          </button>
        ))}
      </div>

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className={`${inputClass} text-lg`}
        placeholder="curry lentilles coco"
        autoComplete="off"
        enterKeyHint="done"
        aria-label="Nom du repas"
      />

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      {logged && (
        <Card className="flex flex-col gap-3 border-accent/40 bg-accent-soft">
          <p className="font-medium">
            {logged.mealName} noté {logged.slot === 'midi' ? 'ce midi' : 'ce soir'}.
            {logged.created && ' Nouveau repas créé.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={ghostButtonClass}
              onClick={() => setLikedByBaby(logged.logId, true)}
            >
              La petite a aimé
            </button>
            <button
              type="button"
              className={ghostButtonClass}
              onClick={() => setLikedByBaby(logged.logId, false)}
            >
              Elle n&apos;a pas aimé
            </button>
            <button type="button" className={ghostButtonClass} onClick={() => cancel(logged.logId)}>
              Annuler
            </button>
          </div>
        </Card>
      )}

      {matches.length > 0 && (
        <section className="flex flex-col gap-2">
          {matches.map((meal) => (
            <button
              key={meal.id}
              type="button"
              disabled={pending}
              onClick={() => log(meal.id)}
              className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3 text-left active:scale-[0.99]"
            >
              <span className="font-medium">{meal.name}</span>
              <span className="text-sm text-muted">
                {meal.logCount === 0 ? 'jamais fait' : `${meal.logCount}×`}
              </span>
            </button>
          ))}
        </section>
      )}

      {query.trim() && !exactMatch && (
        <button
          type="button"
          disabled={pending}
          onClick={() => log(query.trim())}
          className={buttonClass}
        >
          Enregistrer « {query.trim()} »
        </button>
      )}

      {!query.trim() && frequent.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted">Souvent fait</h2>
          <div className="flex flex-wrap gap-2">
            {frequent.map((meal) => (
              <button
                key={meal.id}
                type="button"
                disabled={pending}
                onClick={() => log(meal.id)}
                className="min-h-11 rounded-full border border-line bg-surface px-4 text-sm font-medium active:scale-[0.99]"
              >
                {meal.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {recentLogs.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted">Derniers repas</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {recentLogs.map((log) => (
              <li key={log.id} className="flex justify-between border-b border-line py-2">
                <Link href={`/meals/${log.mealId}`} className="font-medium">
                  {log.mealName}
                </Link>
                <span className="text-muted">
                  {log.date} · {log.slot}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {meals.length === 0 && (
        <p className="text-sm text-muted">
          La bibliothèque est vide. Tape ce que vous avez mangé ce soir, même « pâtes au pesto » :
          c&apos;est exactement ce que la base doit retenir.
        </p>
      )}
    </div>
  );
}

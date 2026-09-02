'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { MealDetail } from '@/lib/domain/meals';
import { Badge, buttonClass, Card, Field, ghostButtonClass, inputClass } from './ui';

const KINDS = [
  { value: 'recipe', label: 'Recette' },
  { value: 'combo', label: 'Combo' },
  { value: 'leftover_base', label: 'Base à décliner' },
] as const;

const EFFORTS = [
  { value: 'express', label: 'Express, moins de 10 min' },
  { value: 'standard', label: 'Standard, 10 à 30 min' },
  { value: 'projet', label: 'Projet, plus de 30 min' },
] as const;

export function MealSheet({ meal }: { meal: MealDetail }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const tags = String(form.get('tags') ?? '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const response = await fetch(`/api/meals/${meal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: String(form.get('name') ?? ''),
        kind: String(form.get('kind') ?? ''),
        effort: String(form.get('effort') ?? ''),
        babyNote: String(form.get('babyNote') ?? ''),
        notes: String(form.get('notes') ?? ''),
        steps: String(form.get('steps') ?? ''),
        tags,
      }),
    });

    setPending(false);

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.error ?? 'Enregistrement impossible');
      return;
    }

    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <form onSubmit={save} className="flex flex-col gap-4">
        <Field label="Nom">
          <input name="name" defaultValue={meal.name} required className={inputClass} />
        </Field>

        <Field label="Type">
          <select name="kind" defaultValue={meal.kind} className={inputClass}>
            {KINDS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Effort">
          <select name="effort" defaultValue={meal.effort} className={inputClass}>
            {EFFORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Pour la petite">
          <textarea
            name="babyNote"
            defaultValue={meal.babyNote ?? ''}
            rows={3}
            className={inputClass}
            placeholder="Portion mise de côté avant de saler, écrasée à la fourchette"
          />
        </Field>

        <Field label="Tags, séparés par des virgules">
          <input name="tags" defaultValue={meal.tags.join(', ')} className={inputClass} />
        </Field>

        <Field label="Étapes">
          <textarea name="steps" defaultValue={meal.steps ?? ''} rows={6} className={inputClass} />
        </Field>

        <Field label="Notes">
          <textarea name="notes" defaultValue={meal.notes ?? ''} rows={3} className={inputClass} />
        </Field>

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button type="submit" disabled={pending} className={buttonClass}>
            {pending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <button type="button" className={ghostButtonClass} onClick={() => setEditing(false)}>
            Annuler
          </button>
        </div>
      </form>
    );
  }

  return (
    <article className="flex flex-col gap-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{meal.name}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone="accent">
              {EFFORTS.find((option) => option.value === meal.effort)?.label}
            </Badge>
            <Badge>{KINDS.find((option) => option.value === meal.kind)?.label}</Badge>
            {meal.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        </div>
        <button type="button" className={ghostButtonClass} onClick={() => setEditing(true)}>
          Modifier
        </button>
      </header>

      {meal.babyNote && (
        <Card className="border-accent/40 bg-accent-soft">
          <h2 className="text-sm font-semibold text-accent">Pour la petite</h2>
          <p className="mt-1 whitespace-pre-wrap">{meal.babyNote}</p>
        </Card>
      )}

      {meal.ingredients.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted">Ingrédients</h2>
          <ul className="flex flex-col gap-1">
            {meal.ingredients.map((line) => (
              <li key={line.id} className="flex justify-between border-b border-line py-2">
                <span>{line.ingredientName ?? line.freeText ?? '—'}</span>
                <span className="text-muted">
                  {[line.quantity, line.unit].filter(Boolean).join(' ')}
                  {line.isPantryStaple && ' · placard'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {meal.steps && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted">Étapes</h2>
          <p className="whitespace-pre-wrap">{meal.steps}</p>
        </section>
      )}

      {meal.notes && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted">Notes</h2>
          <p className="whitespace-pre-wrap">{meal.notes}</p>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted">
          Historique · {meal.logs.length} fois
        </h2>
        {meal.logs.length === 0 ? (
          <p className="text-sm text-muted">Jamais fait depuis que la base existe.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {meal.logs.map((log) => (
              <li key={log.id} className="flex justify-between border-b border-line py-2">
                <span>
                  {log.date} · {log.slot}
                </span>
                <span className="text-muted">
                  {log.likedByBaby === true && 'la petite a aimé'}
                  {log.likedByBaby === false && "la petite n'a pas aimé"}
                  {log.comment ? ` ${log.comment}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}

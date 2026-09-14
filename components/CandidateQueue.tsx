'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { buttonClass, Card, ghostButtonClass, inputClass } from './ui';

type Candidate = {
  id: string;
  rawLabel: string;
  guessedIngredientName: string | null;
  brand: string | null;
  format: string | null;
  occurrences: number;
  confidence: 'high' | 'medium' | 'low';
  source: string | null;
};

const CONFIDENCE_LABEL = { high: 'sûr', medium: 'plausible', low: 'à vérifier' } as const;

/**
 * File de validation de l'amorçage : triée par occurrences décroissantes, donc
 * le plus rentable à trancher arrive en premier. Écran très utilisé une fois,
 * puis presque jamais.
 */
export function CandidateQueue({ candidates }: { candidates: Candidate[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rename, setRename] = useState('');
  const [pending, setPending] = useState(false);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function resolve(action: 'accept' | 'reject') {
    if (selected.size === 0) return;
    setPending(true);
    await fetch('/api/import/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidateIds: [...selected],
        action,
        ingredientName: action === 'accept' && rename.trim() ? rename.trim() : undefined,
      }),
    });
    setPending(false);
    setSelected(new Set());
    setRename('');
    router.refresh();
  }

  if (candidates.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Validation</h1>
        <Card>
          <p className="text-sm text-muted">
            Aucun candidat en attente. Cette file se remplit quand un historique de drive est
            importé, en demandant à Claude d&apos;utiliser l&apos;outil d&apos;import.
          </p>
          <Link href="/produits" className={`mt-3 ${ghostButtonClass}`}>
            Retour aux produits
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Validation</h1>
        <span className="text-sm text-muted">{candidates.length} en attente</span>
      </div>

      <p className="text-sm text-muted">
        Triés par nombre d&apos;achats : les premiers sont ceux qui font gagner le plus de temps.
      </p>

      <ul className="flex flex-col gap-2">
        {candidates.map((candidate) => (
          <li key={candidate.id}>
            <button
              type="button"
              onClick={() => toggle(candidate.id)}
              className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left ${
                selected.has(candidate.id)
                  ? 'border-accent bg-accent-soft'
                  : 'border-line bg-surface'
              }`}
            >
              <span
                className={`mt-0.5 h-5 w-5 shrink-0 rounded border ${
                  selected.has(candidate.id) ? 'border-accent bg-accent' : 'border-line'
                }`}
              />
              <span className="min-w-0">
                <span className="block font-medium">{candidate.rawLabel}</span>
                <span className="block text-sm text-muted">
                  {candidate.occurrences}× · {CONFIDENCE_LABEL[candidate.confidence]}
                  {candidate.guessedIngredientName
                    ? ` · deviné : ${candidate.guessedIngredientName}`
                    : ' · aucun ingrédient deviné'}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface p-5 pb-8">
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            <p className="text-sm font-medium">{selected.size} sélectionnés</p>
            <input
              value={rename}
              onChange={(event) => setRename(event.target.value)}
              className={inputClass}
              placeholder="Rattacher à un autre ingrédient, sinon laisser vide"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => resolve('accept')}
                className={buttonClass}
              >
                Accepter
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => resolve('reject')}
                className={ghostButtonClass}
              >
                Rejeter
              </button>
              <button
                type="button"
                className={ghostButtonClass}
                onClick={() => setSelected(new Set())}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

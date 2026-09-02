'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { aisleLabel, type Aisle } from '@/lib/domain/aisles';
import type { ShoppingListView } from '@/lib/domain/shopping';
import { buttonClass, Card, ghostButtonClass, inputClass } from './ui';

type Item = ShoppingListView['items'][number];

export function ShoppingList({
  list,
  stores,
  defaultRange,
}: {
  list: ShoppingListView | null;
  stores: { id: string; name: string }[];
  defaultRange: { fromDate: string; toDate: string };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addition, setAddition] = useState('');
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  async function generate() {
    setPending(true);
    setError(null);
    const response = await fetch('/api/shopping-lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...defaultRange, storeId: stores[0]?.id }),
    });
    setPending(false);
    if (!response.ok) {
      setError((await response.json().catch(() => ({}))).error ?? 'Génération impossible');
      return;
    }
    router.refresh();
  }

  async function toggle(item: Item) {
    const next = !(checked[item.id] ?? item.isChecked);
    setChecked((state) => ({ ...state, [item.id]: next }));
    await fetch(`/api/shopping-list-items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isChecked: next }),
    });
  }

  async function add() {
    const items = addition
      .split(',')
      .map((line) => line.trim())
      .filter(Boolean);
    if (items.length === 0 || !list) return;

    setPending(true);
    await fetch(`/api/shopping-lists/${list.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    setPending(false);
    setAddition('');
    router.refresh();
  }

  if (!list) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Courses</h1>
        <Card>
          <p className="text-sm text-muted">
            Aucune liste en cours. Elle se génère depuis les repas planifiés de la semaine, en
            excluant ce qu&apos;on a toujours et en ajoutant le socle récurrent échu.
          </p>
          {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
          <button
            type="button"
            onClick={generate}
            disabled={pending}
            className={`mt-3 ${buttonClass}`}
          >
            {pending ? 'Génération…' : 'Générer la liste de la semaine'}
          </button>
        </Card>
        <Link href="/produits" className="text-sm underline underline-offset-4">
          Gérer les produits et les enseignes
        </Link>
      </div>
    );
  }

  const isChecked = (item: Item) => checked[item.id] ?? item.isChecked;
  const remaining = list.items.filter((item) => !isChecked(item));
  const done = list.items.filter(isChecked);

  const byAisle = remaining.reduce<Record<string, Item[]>>((acc, item) => {
    (acc[item.aisle] ??= []).push(item);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Courses</h1>
        <span className="text-sm text-muted">
          {done.length} sur {list.items.length}
        </span>
      </div>

      {list.store && <p className="text-sm text-muted">{list.store.name}</p>}

      {list.unmapped.length > 0 && (
        <Card className="border-accent/40 bg-accent-soft">
          <h2 className="text-sm font-semibold text-accent">À mapper ({list.unmapped.length})</h2>
          <p className="mt-1 text-sm">
            Ces lignes n&apos;ont pas encore de produit du drive. Une fois le produit choisi et
            enregistré, elles n&apos;y réapparaîtront plus jamais.
          </p>
          <ul className="mt-2 text-sm">
            {list.unmapped.map((item) => (
              <li key={item.id}>· {item.label}</li>
            ))}
          </ul>
          <Link href="/produits" className={`mt-3 ${ghostButtonClass}`}>
            Mapper les produits
          </Link>
        </Card>
      )}

      {Object.entries(byAisle).map(([aisle, items]) => (
        <section key={aisle}>
          <h2 className="mb-2 text-sm font-semibold text-muted">{aisleLabel(aisle as Aisle)}</h2>
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => toggle(item)}
                  className="flex w-full items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-left"
                >
                  <span className="mt-0.5 h-5 w-5 shrink-0 rounded border border-line" />
                  <span className="min-w-0">
                    <span className="block font-medium">
                      {item.label}
                      {item.unit ? ` · ${item.unit}` : ''}
                    </span>
                    {(item.brand || item.format) && (
                      <span className="block text-sm text-muted">
                        {[item.brand, item.format].filter(Boolean).join(' · ')}
                      </span>
                    )}
                    {item.productUrl && (
                      <span className="block truncate text-xs text-accent">{item.productUrl}</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {done.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted">Dans le panier</h2>
          <ul className="flex flex-col gap-1">
            {done.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => toggle(item)}
                  className="w-full px-1 py-2 text-left text-sm text-muted line-through"
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex gap-2">
        <input
          value={addition}
          onChange={(event) => setAddition(event.target.value)}
          className={inputClass}
          placeholder="Ajouter : couches, café, papier toilette"
        />
        <button type="button" onClick={add} disabled={pending} className={buttonClass}>
          Ajouter
        </button>
      </div>

      <button type="button" onClick={generate} disabled={pending} className={ghostButtonClass}>
        Générer une nouvelle liste
      </button>
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { aisleLabel, type Aisle } from '@/lib/domain/aisles';
import { buttonClass, Card, Field, ghostButtonClass, inputClass } from './ui';

type Store = { id: string; name: string };
type Unmapped = { id: string; name: string; aisle: Aisle };
type Product = {
  id: string;
  label: string;
  brand: string | null;
  format: string | null;
  productUrl: string | null;
  isPreferred: boolean;
  ingredientName: string;
  aisle: Aisle;
};
type Recurring = {
  id: string;
  label: string;
  frequencyWeeks: number;
  isDue: boolean;
  ingredientName: string;
};

export function ProductsManager({
  stores,
  products,
  unmapped,
  recurring,
}: {
  stores: Store[];
  products: Product[];
  unmapped: Unmapped[];
  recurring: Recurring[];
}) {
  const router = useRouter();
  const [mapping, setMapping] = useState<Unmapped | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createStore(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    await fetch('/api/stores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: String(form.get('name') ?? '') }),
    });
    setPending(false);
    router.refresh();
  }

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mapping || !stores[0]) return;

    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    const response = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredientName: mapping.name,
        storeId: stores[0].id,
        label: String(form.get('label') ?? ''),
        brand: String(form.get('brand') ?? '') || undefined,
        format: String(form.get('format') ?? '') || undefined,
        productUrl: String(form.get('productUrl') ?? '') || undefined,
        aisle: String(form.get('aisle') ?? '') as Aisle,
      }),
    });

    setPending(false);
    if (!response.ok) {
      setError((await response.json().catch(() => ({}))).error ?? 'Enregistrement impossible');
      return;
    }

    setMapping(null);
    router.refresh();
  }

  if (stores.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Produits</h1>
        <Card>
          <p className="text-sm text-muted">
            Commence par déclarer ton enseigne de drive. C&apos;est elle qui porte les
            correspondances entre un ingrédient et une référence précise.
          </p>
          <form onSubmit={createStore} className="mt-3 flex gap-2">
            <input name="name" required className={inputClass} placeholder="E.Leclerc Drive" />
            <button type="submit" disabled={pending} className={buttonClass}>
              Ajouter
            </button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Produits</h1>
        <p className="mt-1 text-sm text-muted">
          {stores[0].name} · {products.length} correspondances, {unmapped.length} à faire
        </p>
      </div>

      {mapping && (
        <Card className="border-accent/40">
          <h2 className="font-semibold">{mapping.name}</h2>
          <p className="mt-1 text-sm text-muted">
            Colle le libellé exact tel qu&apos;il apparaît sur le drive : c&apos;est ce libellé qui
            supprimera toute hésitation la prochaine fois.
          </p>
          <form onSubmit={saveProduct} className="mt-3 flex flex-col gap-3">
            <Field label="Libellé du drive">
              <input name="label" required className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Marque">
                <input name="brand" className={inputClass} />
              </Field>
              <Field label="Format">
                <input name="format" className={inputClass} placeholder="1 kg" />
              </Field>
            </div>
            <Field label="URL du produit">
              <input name="productUrl" type="url" className={inputClass} />
            </Field>
            <Field label="Rayon">
              <select name="aisle" defaultValue={mapping.aisle} className={inputClass}>
                {(
                  [
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
                  ] as Aisle[]
                ).map((aisle) => (
                  <option key={aisle} value={aisle}>
                    {aisleLabel(aisle)}
                  </option>
                ))}
              </select>
            </Field>

            {error && <p className="text-sm font-medium text-red-600">{error}</p>}

            <div className="flex gap-2">
              <button type="submit" disabled={pending} className={buttonClass}>
                Enregistrer
              </button>
              <button type="button" className={ghostButtonClass} onClick={() => setMapping(null)}>
                Annuler
              </button>
            </div>
          </form>
        </Card>
      )}

      {unmapped.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted">À mapper</h2>
          <ul className="flex flex-col gap-2">
            {unmapped.map((ingredient) => (
              <li key={ingredient.id}>
                <button
                  type="button"
                  onClick={() => setMapping(ingredient)}
                  className="flex w-full items-center justify-between rounded-xl border border-line bg-surface px-4 py-3 text-left"
                >
                  <span className="font-medium">{ingredient.name}</span>
                  <span className="text-sm text-muted">{aisleLabel(ingredient.aisle)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {products.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted">Correspondances</h2>
          <ul className="flex flex-col gap-2">
            {products.map((product) => (
              <li
                key={product.id}
                className="rounded-xl border border-line bg-surface px-4 py-3 text-sm"
              >
                <span className="block font-medium">{product.ingredientName}</span>
                <span className="block text-muted">
                  {product.label}
                  {[product.brand, product.format].filter(Boolean).length
                    ? ` · ${[product.brand, product.format].filter(Boolean).join(' · ')}`
                    : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {recurring.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted">Socle récurrent</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {recurring.map((item) => (
              <li key={item.id} className="flex justify-between border-b border-line py-2">
                <span>{item.label}</span>
                <span className="text-muted">
                  toutes les {item.frequencyWeeks} sem.{item.isDue ? ' · à racheter' : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

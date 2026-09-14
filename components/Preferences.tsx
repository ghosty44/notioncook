'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { aisleLabel, AISLE_ORDER, type Aisle } from '@/lib/domain/aisles';
import type { StoreContext } from '@/lib/domain/store-rules';
import { buttonClass, Card, Field, ghostButtonClass, inputClass } from './ui';

type Recurring = { id: string; label: string; frequencyWeeks: number; isDue: boolean };

const REASONS = [
  { value: 'allergie', label: 'Allergie (bloquant)' },
  { value: 'gout', label: 'Goût' },
  { value: 'prix', label: 'Prix' },
  { value: 'composition', label: 'Composition' },
  { value: 'autre', label: 'Autre' },
] as const;

export function Preferences({
  hasStore,
  context,
  recurring,
}: {
  hasStore: boolean;
  context: StoreContext | null;
  recurring: Recurring[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function send(url: string, body: unknown, method = 'POST') {
    setPending(true);
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: method === 'DELETE' ? undefined : JSON.stringify(body),
    });
    setPending(false);
    router.refresh();
  }

  if (!hasStore || !context) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Préférences</h1>
        <Card>
          <p className="text-sm text-muted">
            Déclare d&apos;abord une enseigne depuis l&apos;écran Produits : les règles de choix et
            les marques préférées s&apos;y rattachent.
          </p>
          <Link href="/produits" className={`mt-3 ${buttonClass}`}>
            Aller aux produits
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Préférences</h1>
        <p className="mt-1 text-sm text-muted">
          Ce que Claude lit avant de remplir le panier. {context.store.name}.
        </p>
      </div>

      <Card>
        <h2 className="text-sm font-semibold text-muted">Règles de choix produit</h2>
        <p className="mt-1 text-sm text-muted">
          Appliquées dans l&apos;ordre de priorité. La plus petite priorité passe en premier.
        </p>

        <ol className="mt-3 flex flex-col gap-2">
          {context.rules.map((rule) => (
            <li
              key={rule.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-line px-3 py-2 text-sm"
            >
              <span>
                <span className="text-muted">{rule.priority}.</span> {rule.rule}
              </span>
              <button
                type="button"
                className="shrink-0 text-xs text-muted underline"
                onClick={() => send(`/api/store-rules/${rule.id}`, null, 'DELETE')}
              >
                Retirer
              </button>
            </li>
          ))}
        </ol>

        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            send('/api/store-rules', {
              storeId: context.store.id,
              rule: String(form.get('rule') ?? ''),
              priority: Number(form.get('priority') ?? 0),
            });
            event.currentTarget.reset();
          }}
        >
          <input
            name="rule"
            required
            className={inputClass}
            placeholder="Privilégier la marque distributeur à défaut de marque demandée"
          />
          <div className="flex gap-2">
            <input
              name="priority"
              type="number"
              min={0}
              defaultValue={context.rules.length}
              className={`${inputClass} w-24`}
            />
            <button type="submit" disabled={pending} className={buttonClass}>
              Ajouter la règle
            </button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-muted">Marques préférées</h2>
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {context.brandPreferences.map((preference) => (
            <li key={preference.id} className="border-b border-line py-2">
              <span className="font-medium">{preference.brand}</span>{' '}
              <span className="text-muted">
                {preference.ingredientName
                  ? `pour ${preference.ingredientName}`
                  : preference.aisle
                    ? `pour tout le rayon ${aisleLabel(preference.aisle as Aisle)}`
                    : 'partout'}
              </span>
            </li>
          ))}
        </ul>

        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const ingredientName = String(form.get('ingredientName') ?? '').trim();
            send('/api/brand-preferences', {
              brand: String(form.get('brand') ?? ''),
              storeId: context.store.id,
              ingredientName: ingredientName || undefined,
              aisle: ingredientName ? undefined : String(form.get('aisle') ?? ''),
            });
            event.currentTarget.reset();
          }}
        >
          <Field label="Marque">
            <input name="brand" required className={inputClass} placeholder="Marque Repère" />
          </Field>
          <Field label="Pour un ingrédient précis, sinon laisse vide">
            <input name="ingredientName" className={inputClass} placeholder="Beurre demi-sel" />
          </Field>
          <Field label="Sinon, pour tout un rayon">
            <select name="aisle" className={inputClass} defaultValue="cremerie">
              {AISLE_ORDER.map((aisle) => (
                <option key={aisle} value={aisle}>
                  {aisleLabel(aisle)}
                </option>
              ))}
            </select>
          </Field>
          <button type="submit" disabled={pending} className={buttonClass}>
            Enregistrer la préférence
          </button>
        </form>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-muted">À éviter</h2>
        <p className="mt-1 text-sm text-muted">
          Une allergie est bloquante d&apos;office : elle ne sera jamais contournée.
        </p>

        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {context.avoidances.map((avoidance) => (
            <li key={avoidance.id} className="flex justify-between border-b border-line py-2">
              <span>
                {avoidance.value}{' '}
                <span className="text-muted">
                  ({avoidance.scope}, {avoidance.reason}
                  {avoidance.isHard ? ', bloquant' : ''})
                </span>
              </span>
              <button
                type="button"
                className="text-xs text-muted underline"
                onClick={() => send(`/api/avoidances/${avoidance.id}`, null, 'DELETE')}
              >
                Retirer
              </button>
            </li>
          ))}
        </ul>

        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            send('/api/avoidances', {
              scope: String(form.get('scope') ?? 'ingredient'),
              value: String(form.get('value') ?? ''),
              reason: String(form.get('reason') ?? 'autre'),
              isHard: form.get('isHard') === 'on',
            });
            event.currentTarget.reset();
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <Field label="Portée">
              <select name="scope" className={inputClass} defaultValue="ingredient">
                <option value="ingredient">Ingrédient</option>
                <option value="brand">Marque</option>
                <option value="product">Produit</option>
              </select>
            </Field>
            <Field label="Raison">
              <select name="reason" className={inputClass} defaultValue="gout">
                {REASONS.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Quoi">
            <input name="value" required className={inputClass} placeholder="Arachide" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input name="isHard" type="checkbox" className="h-5 w-5" />
            Bloquant, ne jamais acheter
          </label>
          <button type="submit" disabled={pending} className={buttonClass}>
            Ajouter
          </button>
        </form>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-muted">Contraintes du foyer</h2>
        <p className="mt-1 text-sm text-muted">
          Texte libre lu par Claude : textures qui passent ou non pour la petite, budget cible,
          formats à privilégier.
        </p>
        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            send('/api/household', { constraints: String(form.get('constraints') ?? '') }, 'PATCH');
          }}
        >
          <textarea
            name="constraints"
            rows={4}
            defaultValue={context.constraints ?? ''}
            className={inputClass}
          />
          <button type="submit" disabled={pending} className={ghostButtonClass}>
            Enregistrer
          </button>
        </form>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-muted">Socle récurrent</h2>
        {recurring.length === 0 ? (
          <p className="mt-1 text-sm text-muted">
            Rien pour l&apos;instant. Les récurrents s&apos;ajoutent depuis un produit déjà mappé.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {recurring.map((item) => (
              <li key={item.id} className="flex justify-between border-b border-line py-2">
                <span>{item.label}</span>
                <span className="text-muted">
                  toutes les {item.frequencyWeeks} sem.{item.isDue ? ' · à racheter' : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

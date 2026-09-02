'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { buttonClass, Card, Field, ghostButtonClass, inputClass } from './ui';

type Mode = 'create' | 'join';

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('create');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const endpoint = mode === 'create' ? '/api/auth/household' : '/api/auth/join';
    const body =
      mode === 'create'
        ? {
            householdName: String(form.get('householdName') ?? ''),
            name: String(form.get('name') ?? ''),
            email: String(form.get('email') ?? ''),
          }
        : {
            code: String(form.get('code') ?? ''),
            name: String(form.get('name') ?? ''),
            email: String(form.get('email') ?? ''),
          };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      router.push('/');
      router.refresh();
      return;
    }

    const payload = await response.json().catch(() => ({}));
    setError(payload.error ?? 'Connexion impossible');
    setPending(false);
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMode('create')}
          className={mode === 'create' ? buttonClass : ghostButtonClass}
        >
          Créer un foyer
        </button>
        <button
          type="button"
          onClick={() => setMode('join')}
          className={mode === 'join' ? buttonClass : ghostButtonClass}
        >
          Rejoindre
        </button>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        {mode === 'create' ? (
          <Field label="Nom du foyer">
            <input name="householdName" required className={inputClass} placeholder="Maison" />
          </Field>
        ) : (
          <Field label="Code d'invitation">
            <input
              name="code"
              required
              autoCapitalize="characters"
              className={`${inputClass} tracking-[0.3em] uppercase`}
              placeholder="ABC234"
            />
          </Field>
        )}

        <Field label="Ton prénom">
          <input name="name" required className={inputClass} placeholder="Camille" />
        </Field>

        <Field label="Email">
          <input
            name="email"
            type="email"
            required
            className={inputClass}
            placeholder="camille@exemple.fr"
          />
        </Field>

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}

        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? 'Un instant…' : mode === 'create' ? 'Créer le foyer' : 'Rejoindre le foyer'}
        </button>
      </form>

      <p className="text-sm text-muted">
        Pas de mot de passe : le code d&apos;invitation du foyer est le secret partagé. Ne le
        diffuse pas au-delà de la maison.
      </p>
    </Card>
  );
}

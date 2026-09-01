'use client';

import { useState } from 'react';
import { buttonClass, Card, ghostButtonClass } from './ui';

export function HouseholdCard({
  inviteCode,
  hasMcpToken,
}: {
  inviteCode: string | null;
  hasMcpToken: boolean;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [issued, setIssued] = useState(hasMcpToken);

  async function issue() {
    setPending(true);
    const response = await fetch('/api/mcp-token', { method: 'POST' });
    const payload = await response.json().catch(() => ({}));
    setPending(false);
    if (response.ok) {
      setToken(payload.token);
      setIssued(true);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <h2 className="text-sm font-semibold text-muted">Code du foyer</h2>
        <p className="mt-1 text-xl font-bold tracking-[0.3em]">{inviteCode ?? '—'}</p>
        <p className="mt-2 text-sm text-muted">
          À donner à l&apos;autre adulte du foyer pour qu&apos;il rejoigne la même base.
        </p>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-muted">Connexion à Claude</h2>
        <p className="mt-1 text-sm text-muted">
          Un jeton donne accès en lecture et en écriture à toute la base du foyer depuis Claude.
          {issued &&
            !token &&
            ' Un jeton est déjà actif. En générer un nouveau révoque le précédent.'}
        </p>

        {token && (
          <div className="mt-3">
            <p className="mb-1 text-sm font-medium">
              Copie-le maintenant, il ne sera plus jamais affiché.
            </p>
            <code className="block overflow-x-auto rounded-xl border border-line bg-background px-3 py-2 text-sm">
              {token}
            </code>
          </div>
        )}

        <button
          type="button"
          onClick={issue}
          disabled={pending}
          className={`mt-3 ${issued ? ghostButtonClass : buttonClass}`}
        >
          {pending ? 'Génération…' : issued ? 'Générer un nouveau jeton' : 'Générer un jeton'}
        </button>

        <p className="mt-3 text-sm text-muted">
          Dans Claude, ajoute un connecteur MCP pointant sur <code>/api/mcp</code> de cette app,
          avec l&apos;en-tête <code>Authorization: Bearer &lt;jeton&gt;</code>.
        </p>
      </Card>
    </div>
  );
}

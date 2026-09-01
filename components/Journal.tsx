'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from './ui';

type Log = {
  id: string;
  date: string;
  slot: 'midi' | 'soir';
  likedByBaby: boolean | null;
  comment: string | null;
  mealId: string;
  mealName: string;
};

export function Journal({ logs, inviteCode }: { logs: Log[]; inviteCode: string | null }) {
  const router = useRouter();

  async function remove(id: string) {
    await fetch(`/api/logs/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  const byDate = logs.reduce<Record<string, Log[]>>((acc, log) => {
    (acc[log.date] ??= []).push(log);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold tracking-tight">Journal</h1>

      {logs.length === 0 && (
        <p className="text-sm text-muted">
          Rien d&apos;enregistré pour l&apos;instant. C&apos;est ce journal, et pas le planning, qui
          nourrira les suggestions.
        </p>
      )}

      {Object.entries(byDate).map(([date, entries]) => (
        <section key={date}>
          <h2 className="mb-2 text-sm font-semibold text-muted">{date}</h2>
          <ul className="flex flex-col gap-2">
            {entries.map((log) => (
              <li
                key={log.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3"
              >
                <div className="min-w-0">
                  <Link href={`/meals/${log.mealId}`} className="font-medium">
                    {log.mealName}
                  </Link>
                  <p className="text-sm text-muted">
                    {log.slot === 'midi' ? 'Midi' : 'Soir'}
                    {log.likedByBaby === true && ' · la petite a aimé'}
                    {log.likedByBaby === false && " · la petite n'a pas aimé"}
                    {log.comment ? ` · ${log.comment}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(log.id)}
                  className="shrink-0 text-sm text-muted underline underline-offset-4"
                >
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {inviteCode && (
        <Card>
          <h2 className="text-sm font-semibold text-muted">Code du foyer</h2>
          <p className="mt-1 text-xl font-bold tracking-[0.3em]">{inviteCode}</p>
          <p className="mt-2 text-sm text-muted">
            À donner à l&apos;autre adulte du foyer pour qu&apos;il rejoigne la même base.
          </p>
        </Card>
      )}
    </div>
  );
}

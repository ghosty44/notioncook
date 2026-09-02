import { redirect } from 'next/navigation';
import { readSession } from '@/lib/auth/session';
import { LoginForm } from '@/components/LoginForm';

export default async function LoginPage() {
  if (await readSession()) redirect('/');

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-5">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Repas</h1>
        <p className="mt-2 text-muted">
          La mémoire des repas du foyer. Un seul compte pour les deux adultes, partagé par un code.
        </p>
      </header>
      <LoginForm />
    </main>
  );
}

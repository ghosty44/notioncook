import Link from 'next/link';
import { redirect } from 'next/navigation';
import { readSession } from '@/lib/auth/session';
import { LogoutButton } from '@/components/LogoutButton';

const TABS = [
  { href: '/', label: 'Capture' },
  { href: '/meals', label: 'Repas' },
  { href: '/journal', label: 'Journal' },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  if (!session) redirect('/login');

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <header className="flex items-center justify-between px-5 pt-5">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Repas
        </Link>
        <div className="flex items-center gap-3 text-sm text-muted">
          <span>{session.name}</span>
          <LogoutButton />
        </div>
      </header>

      <main className="flex-1 px-5 pb-28 pt-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 py-4 text-center text-sm font-medium"
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

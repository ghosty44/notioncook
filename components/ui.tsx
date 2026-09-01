import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-surface p-4 ${className}`}>{children}</div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  'w-full rounded-xl border border-line bg-surface px-3 py-3 text-foreground ' +
  'outline-none placeholder:text-muted/70 focus:border-accent';

export const buttonClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-4 ' +
  'font-semibold text-white transition active:scale-[0.99] disabled:opacity-50';

export const ghostButtonClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line ' +
  'bg-surface px-4 font-medium text-foreground transition active:scale-[0.99] disabled:opacity-50';

const EFFORT_LABEL = { express: 'Express', standard: 'Standard', projet: 'Projet' } as const;
const KIND_LABEL = { recipe: 'Recette', combo: 'Combo', leftover_base: 'Base à décliner' } as const;

export function effortLabel(effort: keyof typeof EFFORT_LABEL): string {
  return EFFORT_LABEL[effort];
}

export function kindLabel(kind: keyof typeof KIND_LABEL): string {
  return KIND_LABEL[kind];
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent';
}) {
  const styles =
    tone === 'accent'
      ? 'bg-accent-soft text-accent'
      : 'bg-background text-muted border border-line';
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles}`}>{children}</span>
  );
}

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

export type Database = ReturnType<typeof create>;

function create() {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL manquante. Provisionne Vercel Postgres puis renseigne la variable ' +
        "(voir README). L'app ne peut pas démarrer sans base.",
    );
  }
  return drizzle(neon(url), { schema });
}

let cached: Database | undefined;

/**
 * Réservé aux tests : substitue un client Postgres embarqué (PGlite) au client
 * Neon, pour exercer les requêtes réelles sans base distante.
 */
export function setDatabaseForTests(instance: Database | undefined): void {
  cached = instance;
}

/**
 * Client Drizzle résolu à la première requête et non à l'import, pour que le
 * build Next puisse compiler sans base de données configurée.
 */
export function db(): Database {
  cached ??= create();
  return cached;
}

export { schema };

import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { setDatabaseForTests, type Database } from '@/lib/db';
import * as schema from '@/lib/db/schema';

/**
 * Applique les migrations versionnées du repo dans un Postgres embarqué, puis
 * branche la couche métier dessus. Les tests exercent donc le SQL réellement
 * livré, pas une reconstruction du schéma.
 */
export async function createTestDatabase(): Promise<() => Promise<void>> {
  const client = new PGlite();
  const db = drizzle(client, { schema });

  const files = (await readdir('drizzle')).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = await readFile(`drizzle/${file}`, 'utf8');
    for (const statement of sql.split('--> statement-breakpoint')) {
      const trimmed = statement.trim();
      if (trimmed) await client.exec(trimmed);
    }
  }

  setDatabaseForTests(db as unknown as Database);

  return async () => {
    setDatabaseForTests(undefined);
    await client.close();
  };
}

import '../lib/load-env';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';

/**
 * Le corps vit dans une fonction : un `await` au niveau racine casse la
 * transpilation CommonJS de tsx, et le script ne démarrait pas du tout.
 */
async function main() {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

  if (!url) {
    console.error(
      'DATABASE_URL manquante. Renseigne-la dans .env.local à la racine du projet,\n' +
        'ou passe-la en ligne : DATABASE_URL="postgres://…" npm run db:migrate',
    );
    process.exit(1);
  }

  await migrate(drizzle(neon(url)), { migrationsFolder: './drizzle' });
  console.log('Migrations appliquées.');
}

main().catch((error: unknown) => {
  console.error('Migration échouée :', error instanceof Error ? error.message : error);
  process.exit(1);
});

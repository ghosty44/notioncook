import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) {
  console.error('DATABASE_URL manquante. Renseigne .env.local avant de migrer.');
  process.exit(1);
}

await migrate(drizzle(neon(url)), { migrationsFolder: './drizzle' });
console.log('Migrations appliquées.');

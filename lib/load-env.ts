import { config } from 'dotenv';

/**
 * Les scripts hors Next chargent les variables comme Next le fait : `.env.local`
 * d'abord, `.env` ensuite. `import 'dotenv/config'` ne lirait que `.env`, alors
 * que le fichier documenté est `.env.local`.
 */
config({ path: ['.env.local', '.env'], quiet: true });

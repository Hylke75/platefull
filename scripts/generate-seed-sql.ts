// Genereert supabase/seed.sql uit de TypeScript-catalogus, zodat database en domein dezelfde bron gebruiken.
// Gebruik: npm run seed:sql
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildSeedSql } from '../src/domain/catalog/seed-sql';

const out = fileURLToPath(new URL('../supabase/seed.sql', import.meta.url));
writeFileSync(out, buildSeedSql());
console.log(`Geschreven: ${out}`);

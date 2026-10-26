// Testharnas: verse database met Supabase-stub, alle migraties en de catalogusseed.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { buildSeedSql } from '@/domain/catalog/seed-sql';

const root = fileURLToPath(new URL('../../', import.meta.url));
export const ADMIN_URL = process.env.PGTEST_URL ?? 'postgres://postgres@127.0.0.1:54329/postgres';

export async function freshDatabase(name: string): Promise<string> {
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`drop database if exists ${name} with (force)`);
  await admin.query(`create database ${name}`);
  await admin.end();
  const url = ADMIN_URL.replace(/\/[^/]*$/, `/${name}`);
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  await c.query(readFileSync(`${root}tests/db/supabase-stub.sql`, 'utf8'));
  const migrations = readdirSync(`${root}supabase/migrations`).filter((f) => f.endsWith('.sql')).sort();
  for (const m of migrations) {
    try {
      await c.query(readFileSync(`${root}supabase/migrations/${m}`, 'utf8'));
    } catch (e) {
      throw new Error(`Migratie ${m} faalt: ${(e as Error).message}`);
    }
  }
  await c.query(buildSeedSql());
  await c.end();
  return url;
}

/** Voert queries uit als ingelogde gebruiker (rol authenticated + JWT-claim), zoals PostgREST dat doet. */
export class AsUser {
  constructor(private readonly client: pg.Client, readonly userId: string | null) {}

  async query<T extends pg.QueryResultRow = pg.QueryResultRow>(sql: string, params: unknown[] = []): Promise<pg.QueryResult<T>> {
    await this.client.query('begin');
    try {
      if (this.userId) {
        await this.client.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: this.userId, role: 'authenticated' })]);
        await this.client.query('set local role authenticated');
      } else {
        await this.client.query('set local role anon');
      }
      const res = await this.client.query<T>(sql, params);
      await this.client.query('commit');
      return res;
    } catch (e) {
      await this.client.query('rollback');
      throw e;
    }
  }

  async rpc<T = unknown>(fn: string, args: unknown[]): Promise<T> {
    const placeholders = args.map((_, i) => `$${i + 1}`).join(', ');
    const res = await this.query<{ r: T }>(`select public.${fn}(${placeholders}) as r`, args);
    return res.rows[0]!.r;
  }
}

export async function connect(url: string): Promise<pg.Client> {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  return c;
}

export async function createUser(admin: pg.Client, id: string, email: string): Promise<void> {
  await admin.query('insert into auth.users (id, email) values ($1, $2)', [id, email]);
}

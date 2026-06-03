import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.resolve(__dirname, '..', 'data', 'app-state.json');
const DEFAULT_STATE = { sessions: [], mistakes: [], reports: [] };

let pool;
let initPromise;

function normalizeState(value) {
  return {
    sessions: Array.isArray(value?.sessions) ? value.sessions : [],
    mistakes: Array.isArray(value?.mistakes) ? value.mistakes : [],
    reports: Array.isArray(value?.reports) ? value.reports : [],
  };
}

function createPool() {
  if (!process.env.DATABASE_URL) return null;
  const needsSsl = !process.env.DATABASE_URL.includes('localhost') && process.env.PGSSLMODE !== 'disable';
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    ssl: needsSsl ? { rejectUnauthorized: false } : false,
  });
}

async function initPostgres() {
  if (!pool) pool = createPool();
  if (!pool) return null;

  if (!initPromise) {
    initPromise = pool.query(`
      create table if not exists app_state (
        id text primary key,
        value jsonb not null,
        updated_at timestamptz not null default now()
      )
    `);
  }

  await initPromise;
  return pool;
}

export function getStorageMode() {
  return process.env.DATABASE_URL ? 'postgres' : 'file';
}

export async function readState() {
  if (process.env.DATABASE_URL) {
    const db = await initPostgres();
    const result = await db.query('select value from app_state where id = $1', ['default']);
    return normalizeState(result.rows[0]?.value);
  }

  try {
    const raw = await fs.readFile(dataPath, 'utf8');
    return normalizeState(JSON.parse(raw));
  } catch (error) {
    if (error.code === 'ENOENT') return { ...DEFAULT_STATE };
    throw error;
  }
}

export async function writeState(state) {
  const normalized = normalizeState(state);

  if (process.env.DATABASE_URL) {
    const db = await initPostgres();
    await db.query(
      `
        insert into app_state (id, value, updated_at)
        values ($1, $2::jsonb, now())
        on conflict (id)
        do update set value = excluded.value, updated_at = now()
      `,
      ['default', JSON.stringify(normalized)],
    );
    return normalized;
  }

  await fs.mkdir(path.dirname(dataPath), { recursive: true });
  await fs.writeFile(dataPath, JSON.stringify(normalized, null, 2), 'utf8');
  return normalized;
}

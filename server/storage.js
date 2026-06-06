import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.resolve(__dirname, '..', 'data', 'app-db.json');
const DEFAULT_STATE = { sessions: [], mistakes: [], reports: [], vocabTopics: [] };
const DEFAULT_DB = { users: [], states: {} };

let pool;
let initPromise;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeState(value) {
  return {
    sessions: Array.isArray(value?.sessions) ? value.sessions : [],
    mistakes: Array.isArray(value?.mistakes) ? value.mistakes : [],
    reports: Array.isArray(value?.reports) ? value.reports : [],
    vocabTopics: Array.isArray(value?.vocabTopics) ? value.vocabTopics : [],
  };
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.created_at || user.createdAt,
  };
}

function createPool() {
  if (!process.env.DATABASE_URL) return null;
  const needsSsl = !process.env.DATABASE_URL.includes('localhost') && process.env.PGSSLMODE !== 'disable';
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    ssl: needsSsl ? { rejectUnauthorized: false } : false,
  });
}

async function initPostgres() {
  if (!pool) pool = createPool();
  if (!pool) return null;

  if (!initPromise) {
    initPromise = pool.query(`
      create table if not exists users (
        id text primary key,
        name text not null,
        email text not null,
        lower_email text not null unique,
        password_hash text not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists user_states (
        user_id text primary key references users(id) on delete cascade,
        value jsonb not null,
        updated_at timestamptz not null default now()
      );
    `);
  }

  await initPromise;
  return pool;
}

async function readFileDb() {
  try {
    const raw = await fs.readFile(dataPath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      states: parsed.states && typeof parsed.states === 'object' ? parsed.states : {},
    };
  } catch (error) {
    if (error.code === 'ENOENT') return { ...DEFAULT_DB, states: {} };
    throw error;
  }
}

async function writeFileDb(db) {
  await fs.mkdir(path.dirname(dataPath), { recursive: true });
  await fs.writeFile(dataPath, JSON.stringify(db, null, 2), 'utf8');
}

export function getStorageMode() {
  return process.env.DATABASE_URL ? 'postgres' : 'file';
}

export function getPublicUser(user) {
  return publicUser(user);
}

export async function findUserByEmail(email) {
  const lowerEmail = normalizeEmail(email);
  if (!lowerEmail) return null;

  if (process.env.DATABASE_URL) {
    const db = await initPostgres();
    const result = await db.query('select * from users where lower_email = $1', [lowerEmail]);
    return result.rows[0] || null;
  }

  const fileDb = await readFileDb();
  return fileDb.users.find((user) => user.lowerEmail === lowerEmail) || null;
}

export async function findUserById(id) {
  if (!id) return null;

  if (process.env.DATABASE_URL) {
    const db = await initPostgres();
    const result = await db.query('select * from users where id = $1', [id]);
    return result.rows[0] || null;
  }

  const fileDb = await readFileDb();
  return fileDb.users.find((user) => user.id === id) || null;
}

export async function createUser({ id, name, email, passwordHash }) {
  const lowerEmail = normalizeEmail(email);
  const cleanName = String(name || '').trim() || lowerEmail.split('@')[0];

  if (process.env.DATABASE_URL) {
    const db = await initPostgres();
    const result = await db.query(
      `
        insert into users (id, name, email, lower_email, password_hash)
        values ($1, $2, $3, $4, $5)
        returning *
      `,
      [id, cleanName, email.trim(), lowerEmail, passwordHash],
    );
    return result.rows[0];
  }

  const fileDb = await readFileDb();
  if (fileDb.users.some((user) => user.lowerEmail === lowerEmail)) {
    const error = new Error('Email already exists.');
    error.code = 'duplicate_email';
    throw error;
  }

  const now = new Date().toISOString();
  const user = {
    id,
    name: cleanName,
    email: email.trim(),
    lowerEmail,
    password_hash: passwordHash,
    createdAt: now,
    updatedAt: now,
  };
  fileDb.users.push(user);
  fileDb.states[id] = { ...DEFAULT_STATE };
  await writeFileDb(fileDb);
  return user;
}

export async function readState(userId) {
  if (!userId) return { ...DEFAULT_STATE };

  if (process.env.DATABASE_URL) {
    const db = await initPostgres();
    const result = await db.query('select value from user_states where user_id = $1', [userId]);
    return normalizeState(result.rows[0]?.value);
  }

  const fileDb = await readFileDb();
  return normalizeState(fileDb.states[userId]);
}

export async function writeState(userId, state) {
  const normalized = normalizeState(state);
  if (!userId) return normalized;

  if (process.env.DATABASE_URL) {
    const db = await initPostgres();
    await db.query(
      `
        insert into user_states (user_id, value, updated_at)
        values ($1, $2::jsonb, now())
        on conflict (user_id)
        do update set value = excluded.value, updated_at = now()
      `,
      [userId, JSON.stringify(normalized)],
    );
    return normalized;
  }

  const fileDb = await readFileDb();
  fileDb.states[userId] = normalized;
  await writeFileDb(fileDb);
  return normalized;
}

// ---------------------------------------------------------------------
// scripts/initDb.js
// Creates the database (if missing) and runs db/schema.sql, then optionally
// db/seed.sql.  Run:  npm run db:init   (add --seed to load demo data)
// ---------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const env = require('../src/config/env');

const withSeed = process.argv.includes('--seed');

async function run() {
  // 1. Connect to the default 'postgres' DB so we can CREATE the app DB.
  const admin = new Client({
    host: env.pg.host, port: env.pg.port, user: env.pg.user,
    password: env.pg.password, database: 'postgres',
  });
  await admin.connect();
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [env.pg.database]);
  if (exists.rowCount === 0) {
    await admin.query(`CREATE DATABASE "${env.pg.database}"`);
    console.log(`[db:init] created database "${env.pg.database}"`);
  } else {
    console.log(`[db:init] database "${env.pg.database}" already exists`);
  }
  await admin.end();

  // 2. Connect to the app DB and run the schema.
  const client = new Client({
    host: env.pg.host, port: env.pg.port, user: env.pg.user,
    password: env.pg.password, database: env.pg.database,
  });
  await client.connect();

  const schema = fs.readFileSync(path.resolve(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  await client.query(schema);
  console.log('[db:init] schema applied');

  if (withSeed) {
    const seed = fs.readFileSync(path.resolve(__dirname, '..', 'db', 'seed.sql'), 'utf8');
    await client.query(seed);
    console.log('[db:init] seed data loaded');
  }

  await client.end();
  console.log('[db:init] done');
}

run().catch((err) => {
  console.error('[db:init] failed:', err.message);
  process.exit(1);
});

// ---------------------------------------------------------------------
// config/db.js
// A single shared PostgreSQL connection pool.
// A pool reuses a handful of open connections instead of opening one
// per request, which is what you want under any real load.
// ---------------------------------------------------------------------
const { Pool } = require('pg');
const env = require('./env');

const pool = env.databaseUrl
  ? new Pool({ connectionString: env.databaseUrl, max: 10 })
  : new Pool({ ...env.pg, max: 10 });

pool.on('error', (err) => {
  // A idle client died — log it, don't crash the whole server.
  console.error('[db] unexpected idle client error', err.message);
});

/**
 * Run a parameterised query.
 * ALWAYS pass user input through `params` ($1, $2 …) — never string-concat
 * SQL. That is what makes SQL injection impossible here.
 */
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  if (!env.isProd) {
    const ms = Date.now() - start;
    if (ms > 200) console.warn(`[db] slow query ${ms}ms :: ${text.slice(0, 80)}`);
  }
  return res;
}

/** Run several statements inside one transaction (all-or-nothing). */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };

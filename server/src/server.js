// ---------------------------------------------------------------------
// src/server.js
// The process entry point: verify the DB is reachable, then listen.
// ---------------------------------------------------------------------
const app = require('./app');
const env = require('./config/env');
const { pool } = require('./config/db');

async function start() {
  try {
    // Fail fast with a clear message if the database is unreachable.
    await pool.query('SELECT 1');
    console.log('[db] connected');

    const server = app.listen(env.port, () => {
      console.log(`[api] AnemiaScan backend listening on http://localhost:${env.port}`);
      console.log(`[api] health check:  http://localhost:${env.port}/health`);
    });

    // Graceful shutdown so in-flight requests finish and the pool closes.
    const shutdown = async (signal) => {
      console.log(`\n[api] ${signal} received, shutting down…`);
      server.close(async () => {
        await pool.end();
        process.exit(0);
      });
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('[api] failed to start:', err.message);
    console.error('    Is PostgreSQL running and is your .env correct?');
    process.exit(1);
  }
}

start();

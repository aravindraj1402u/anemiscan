// ---------------------------------------------------------------------
// utils/audit.js
// One helper the whole backend calls whenever something sensitive happens.
// Writes a row to audit_logs so management actions are always traceable.
// ---------------------------------------------------------------------
const { query } = require('../config/db');

/**
 * @param {object} entry
 * @param {string|null} entry.actorId
 * @param {string|null} entry.actorRole
 * @param {string} entry.action         e.g. 'DELETE_HOSPITAL'
 * @param {string} entry.tableAffected  e.g. 'hospitals'
 * @param {string|number|null} entry.recordId
 * @param {string|null} entry.reason
 * @param {object|null} entry.metadata
 */
async function writeAudit(entry) {
  try {
    await query(
      `INSERT INTO audit_logs
         (actor_id, actor_role, action, table_affected, record_id, reason, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        entry.actorId || null,
        entry.actorRole || null,
        entry.action,
        entry.tableAffected,
        entry.recordId != null ? String(entry.recordId) : null,
        entry.reason || null,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
      ]
    );
  } catch (err) {
    // An audit failure must never crash the request that triggered it,
    // but it MUST be loud in the logs.
    console.error('[audit] failed to write log:', err.message, entry);
  }
}

module.exports = { writeAudit };

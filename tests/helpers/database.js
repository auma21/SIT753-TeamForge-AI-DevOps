/**
 * TeamForge AI - Test Database Utilities
 *
 * Integration tests use a dedicated PostgreSQL database.
 * These helpers provide deterministic cleanup between tests.
 */

const pool =
    require('../../src/config/database');

/**
 * Remove mutable test data while preserving the database schema.
 *
 * CASCADE clears dependent Project and Task records.
 * RESTART IDENTITY is harmless with UUID primary keys but keeps
 * this utility reusable if sequence-backed tables are introduced.
 */
async function clearDatabase() {
    await pool.query(`
        TRUNCATE TABLE
            tasks,
            projects,
            users
        RESTART IDENTITY
        CASCADE
    `);
}

/**
 * Close the shared PostgreSQL connection pool after a test suite.
 */
async function closeDatabase() {
    await pool.end();
}

module.exports = {
    clearDatabase,
    closeDatabase,
};

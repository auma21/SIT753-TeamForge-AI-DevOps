/**
 * TeamForge AI PostgreSQL connection pool.
 *
 * Configuration is loaded before the pool is created so PostgreSQL
 * always receives fully initialised environment variables.
 */

require('./environment');

const { Pool } = require('pg');

/*
 * PostgreSQL connection configuration.
 *
 * Environment variables are used instead of hard-coded credentials
 * so different values can be injected for development, testing,
 * staging and production environments.
 */
const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,

    /*
     * PostgreSQL's SCRAM authentication requires the client
     * password to be supplied as a string.
     */
    password: process.env.DB_PASSWORD,

    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    max: 10,
});

/**
 * Report unexpected errors from idle PostgreSQL clients.
 */
pool.on('error', (error) => {
    console.error(
        'Unexpected PostgreSQL pool error:',
        error
    );
});

module.exports = pool;
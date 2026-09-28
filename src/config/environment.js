/**
 * TeamForge AI environment configuration.
 *
 * Environment variables are loaded centrally so that application
 * configuration behaves consistently during local development,
 * automated testing and application startup.
 */

const path = require('path');
const dotenv = require('dotenv');

/*
 * Explicitly resolve .env relative to the project root.
 *
 * __dirname points to:
 *     src/config
 *
 * ../../.env therefore resolves to:
 *     <project-root>/.env
 */
dotenv.config({
    path: path.resolve(__dirname, '../../.env'),
});

/**
 * Variables required for TeamForge AI to start successfully.
 */
const requiredVariables = [
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET',
];

/**
 * Validate application configuration during startup.
 *
 * Failing early produces a clear configuration error rather than
 * allowing PostgreSQL/JWT operations to fail later with ambiguous
 * runtime exceptions.
 */
function validateEnvironment() {
    const missingVariables =
        requiredVariables.filter(
            (variable) => {
                const value = process.env[variable];

                return (
                    typeof value !== 'string' ||
                    value.trim() === ''
                );
            }
        );

    if (missingVariables.length > 0) {
        throw new Error(
            `Missing required environment variables: ${
                missingVariables.join(', ')
            }`
        );
    }
}

module.exports = {
    validateEnvironment,
};
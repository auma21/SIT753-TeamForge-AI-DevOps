/**
 * TeamForge AI - Environment Configuration
 *
 * Loads environment-specific configuration for local development
 * and automated testing.
 *
 * Secrets are never committed to source control. Jenkins and
 * production environments will later inject their configuration
 * through environment variables and credential stores.
 */

const path = require('path');
const dotenv = require('dotenv');

/**
 * Select the local environment file.
 *
 * NODE_ENV=test:
 *     .env.test
 *
 * All other local environments:
 *     .env
 */
const environmentFile =
    process.env.NODE_ENV === 'test'
        ? '.env.test'
        : '.env';

/**
 * Load configuration only when essential database configuration
 * has not already been injected into the process environment.
 *
 * This allows Jenkins/Docker/production to provide environment
 * variables without having local .env files override them.
 */
if (!process.env.DB_HOST) {
    dotenv.config({
        path: path.resolve(
            __dirname,
            '../../',
            environmentFile
        ),

        /*
         * Suppress dotenv informational messages so Jest and
         * Jenkins logs remain focused on test/pipeline results.
         */
        quiet: true,
    });
}

/**
 * Configuration required for TeamForge AI to operate.
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
 * Fail fast when mandatory configuration is unavailable.
 */
function validateEnvironment() {
    const missingVariables =
        requiredVariables.filter((variable) => {
            const value =
                process.env[variable];

            return (
                typeof value !== 'string' ||
                value.trim() === ''
            );
        });

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
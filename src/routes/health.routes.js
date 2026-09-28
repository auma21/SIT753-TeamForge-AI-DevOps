/**
 * Health and readiness endpoints used by Docker,
 * Jenkins smoke tests and monitoring systems.
 */

const express = require('express');
const pool = require('../config/database');

const router = express.Router();

router.get('/', async (req, res, next) => {
    try {
        /*
         * Verify the database dependency instead of returning
         * a hard-coded success response.
         */
        await pool.query('SELECT 1');

        res.status(200).json({
            status: 'UP',
            service: 'TeamForge AI',
            database: 'UP',
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;

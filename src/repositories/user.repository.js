/**
 * User repository.
 *
 * This module isolates PostgreSQL queries from authentication
 * business logic. Services therefore do not need to know how
 * user data is physically stored.
 */

const pool = require('../config/database');

/**
 * Find a user by email address.
 *
 * @param {string} email user email
 * @returns {Promise<Object|undefined>} matching user
 */
async function findByEmail(email) {
    const result = await pool.query(
        `
        SELECT
            id,
            name,
            email,
            password_hash,
            role,
            created_at
        FROM users
        WHERE email = $1
        `,
        [email]
    );

    return result.rows[0];
}

/**
 * Find a user by primary key.
 *
 * Password hashes are deliberately excluded because callers
 * generally do not require authentication credentials.
 */
async function findById(id) {
    const result = await pool.query(
        `
        SELECT
            id,
            name,
            email,
            role,
            created_at
        FROM users
        WHERE id = $1
        `,
        [id]
    );

    return result.rows[0];
}

/**
 * Persist a newly registered user.
 */
async function create({ name, email, passwordHash }) {
    const result = await pool.query(
        `
        INSERT INTO users (
            name,
            email,
            password_hash
        )
        VALUES ($1, $2, $3)
        RETURNING
            id,
            name,
            email,
            role,
            created_at
        `,
        [name, email, passwordHash]
    );

    return result.rows[0];
}

module.exports = {
    findByEmail,
    findById,
    create,
};

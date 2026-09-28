/**
 * TeamForge AI - Project Repository
 *
 * Encapsulates PostgreSQL persistence operations for projects.
 *
 * All queries use parameterised SQL to prevent untrusted input
 * from being concatenated directly into SQL statements.
 */

const pool = require("../config/database");

/**
 * Create a new project.
 *
 * PostgreSQL automatically generates the project UUID using
 * gen_random_uuid().
 */
async function create({ name, description, status, ownerId }) {
  const result = await pool.query(
    `
        INSERT INTO projects (
            name,
            description,
            status,
            owner_id
        )
        VALUES ($1, $2, $3, $4)
        RETURNING
            id,
            name,
            description,
            status,
            owner_id,
            created_at,
            updated_at
        `,
    [name, description || null, status || "active", ownerId],
  );

  return result.rows[0];
}

/**
 * Retrieve every project belonging to an authenticated user.
 */
async function findAllByOwner(ownerId) {
  const result = await pool.query(
    `
        SELECT
            id,
            name,
            description,
            status,
            owner_id,
            created_at,
            updated_at
        FROM projects
        WHERE owner_id = $1
        ORDER BY created_at DESC
        `,
    [ownerId],
  );

  return result.rows;
}

/**
 * Retrieve a single project belonging to the supplied owner.
 *
 * Checking both project UUID and owner UUID provides an
 * authorization boundary at the persistence layer.
 */
async function findByIdAndOwner(id, ownerId) {
  const result = await pool.query(
    `
        SELECT
            id,
            name,
            description,
            status,
            owner_id,
            created_at,
            updated_at
        FROM projects
        WHERE id = $1
          AND owner_id = $2
        `,
    [id, ownerId],
  );

  return result.rows[0];
}

/**
 * Update an existing project belonging to the supplied owner.
 */
async function update({ id, ownerId, name, description, status }) {
  const result = await pool.query(
    `
        UPDATE projects
        SET
            name = $1,
            description = $2,
            status = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
          AND owner_id = $5
        RETURNING
            id,
            name,
            description,
            status,
            owner_id,
            created_at,
            updated_at
        `,
    [name, description, status, id, ownerId],
  );

  return result.rows[0];
}

/**
 * Delete a project belonging to the supplied owner.
 *
 * Tasks associated with the project are automatically removed
 * by the ON DELETE CASCADE database constraint.
 */
async function remove(id, ownerId) {
  const result = await pool.query(
    `
        DELETE FROM projects
        WHERE id = $1
          AND owner_id = $2
        RETURNING id
        `,
    [id, ownerId],
  );

  return result.rows[0];
}

module.exports = {
  create,
  findAllByOwner,
  findByIdAndOwner,
  update,
  remove,
};

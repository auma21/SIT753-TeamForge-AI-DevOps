/**
 * TeamForge AI - Task Repository
 *
 * Encapsulates PostgreSQL persistence operations for Agile
 * backlog tasks.
 *
 * Parameterised queries are used throughout to prevent untrusted
 * input from being concatenated directly into SQL statements.
 */

const pool = require("../config/database");

/**
 * Create a new task.
 *
 * PostgreSQL automatically generates the Task UUID.
 */
async function create({
  projectId,
  title,
  description,
  priority,
  status,
  assignedTo,
  createdBy,
}) {
  const result = await pool.query(
    `
        INSERT INTO tasks (
            project_id,
            title,
            description,
            priority,
            status,
            assigned_to,
            created_by
        )
        VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7
        )
        RETURNING
            id,
            project_id,
            title,
            description,
            priority,
            status,
            assigned_to,
            created_by,
            created_at,
            updated_at
        `,
    [
      projectId,
      title,
      description || null,
      priority || "medium",
      status || "backlog",
      assignedTo || null,
      createdBy,
    ],
  );

  return result.rows[0];
}

/**
 * Retrieve all tasks associated with a project.
 */
async function findAllByProject(projectId) {
  const result = await pool.query(
    `
        SELECT
            id,
            project_id,
            title,
            description,
            priority,
            status,
            assigned_to,
            created_by,
            created_at,
            updated_at
        FROM tasks
        WHERE project_id = $1
        ORDER BY created_at DESC
        `,
    [projectId],
  );

  return result.rows;
}

/**
 * Retrieve one task.
 */
async function findById(id) {
  const result = await pool.query(
    `
        SELECT
            id,
            project_id,
            title,
            description,
            priority,
            status,
            assigned_to,
            created_by,
            created_at,
            updated_at
        FROM tasks
        WHERE id = $1
        `,
    [id],
  );

  return result.rows[0];
}

/**
 * Update an existing task.
 */
async function update({
  id,
  title,
  description,
  priority,
  status,
  assignedTo,
}) {
  const result = await pool.query(
    `
        UPDATE tasks
        SET
            title = $1,
            description = $2,
            priority = $3,
            status = $4,
            assigned_to = $5,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING
            id,
            project_id,
            title,
            description,
            priority,
            status,
            assigned_to,
            created_by,
            created_at,
            updated_at
        `,
    [title, description, priority, status, assignedTo, id],
  );

  return result.rows[0];
}

/**
 * Delete a task.
 */
async function remove(id) {
  const result = await pool.query(
    `
        DELETE FROM tasks
        WHERE id = $1
        RETURNING id
        `,
    [id],
  );

  return result.rows[0];
}

module.exports = {
  create,
  findAllByProject,
  findById,
  update,
  remove,
};
